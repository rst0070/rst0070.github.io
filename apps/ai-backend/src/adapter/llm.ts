import { CompletionParams, CompletionResult } from '../core/entity/llm'
import { LlmPort } from '../core/port/llm'
import { ModelError } from '../core/error/model'
import { runModel } from './workersAiError'

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

    async complete(params: CompletionParams): Promise<CompletionResult> {
        const output = await runModel(() => this.ai.run(this.model.id, {
            ...this.model.inputs,
            messages: params.messages,
            max_tokens: params.maxTokens,
            temperature: params.temperature,
        }))
        const text = readText(output)
        if (text === undefined || text.trim() === '') {
            // Also what a reasoning model returns when reasoning used up max_tokens.
            throw new ModelError('unknown', `Empty or unexpected completion from ${this.model.id}`)
        }
        return { text: text.trim() }
    }
}

/**
 * Text generation models answer in one of three shapes: Chat Completions
 * (`choices[0].message.content`, gpt-oss and newer models), Responses
 * (`output_text`), or the older `{ response }`.
 */
function readText(output: Record<string, unknown>): string | undefined {
    const choices = output.choices
    if (Array.isArray(choices)) {
        const content = (choices[0] as { message?: { content?: unknown } } | undefined)?.message?.content
        return typeof content === 'string' ? content : undefined
    }
    if (typeof output.output_text === 'string') return output.output_text
    if (typeof output.response === 'string') return output.response
    return undefined
}
