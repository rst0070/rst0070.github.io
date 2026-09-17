import { CompletionParams } from '../core/entity/llm'
import { LlmPort } from '../core/port/llm'
import { ModelError } from '../core/error/model'
import { sseData } from './sse'
import { runModel, toModelError } from './workersAiError'

export interface ChatModel {
    id: string
    /** Model-specific inputs sent with every call, like `reasoning_effort`. */
    inputs?: Record<string, unknown>
}

export class WorkersAiLlmAdapter implements LlmPort {
    constructor(
        private readonly ai: Ai,
        private readonly model: ChatModel,
    ) {}

    async stream(params: CompletionParams): Promise<AsyncIterable<string>> {
        // Model ids are plain strings from the catalog, so this uses the
        // binding's untyped overload; with `stream: true` it resolves to a
        // ReadableStream of server-sent events.
        const output: unknown = await runModel(() => this.ai.run(this.model.id, {
            ...this.model.inputs,
            messages: params.messages,
            max_tokens: params.maxTokens,
            temperature: params.temperature,
            stream: true,
        }))
        if (!(output instanceof ReadableStream)) {
            throw new ModelError('unknown', `Expected a stream from ${this.model.id}`)
        }
        return this.deltas(output)
    }

    private async *deltas(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
        let produced = false
        let finishReason: string | undefined
        try {
            for await (const data of sseData(body)) {
                if (data === '[DONE]') break
                const event = parseEvent(data)
                if (event === undefined) {
                    throw new ModelError('unknown', `Unexpected stream event from ${this.model.id}: ${data.slice(0, 200)}`)
                }
                finishReason = event.finishReason ?? finishReason
                if (event.text !== '') {
                    produced = true
                    yield event.text
                }
            }
        } catch (error) {
            throw toModelError(error)
        }
        if (!produced) {
            // Also what a reasoning model streams when reasoning used up max_tokens
            // (finish reason `length` with no content).
            throw new ModelError('unknown', `Empty completion from ${this.model.id} (finish reason: ${finishReason ?? 'none'})`)
        }
    }
}

interface StreamEvent {
    /** Answer text in this event; reasoning is not part of the answer. */
    text: string
    finishReason?: string
}

/**
 * Streamed events come in two shapes: Chat Completions chunks
 * (`choices[0].delta.content`, with reasoning in `delta.reasoning_content`;
 * gpt-oss and newer models) and the older `{ response }`. gpt-oss also ends
 * with an empty `{ response: '' }` carrying usage. An `errors` event or any
 * other shape is undefined.
 */
function parseEvent(data: string): StreamEvent | undefined {
    let event: unknown
    try {
        event = JSON.parse(data)
    } catch {
        return undefined
    }
    if (typeof event !== 'object' || event === null) return undefined
    const { choices, response } = event as { choices?: unknown, response?: unknown }

    if (Array.isArray(choices)) {
        const choice = choices[0] as { delta?: { content?: unknown }, finish_reason?: unknown } | undefined
        const content = choice?.delta?.content
        return {
            text: typeof content === 'string' ? content : '',
            ...(typeof choice?.finish_reason === 'string' ? { finishReason: choice.finish_reason } : {}),
        }
    }
    if (typeof response === 'string') return { text: response }
    return undefined
}
