import { describe, expect, it } from 'vitest'
import { ModelError } from '../../core/error/model'
import { WorkersAiLlmAdapter } from '../llm'
import { sseData } from '../sse'

const model = { id: '@cf/openai/gpt-oss-20b', inputs: { reasoning_effort: 'low' } }
const params = { messages: [{ role: 'user' as const, content: 'hi' }], maxTokens: 100, temperature: 0.3 }

/** A byte stream delivering `text` in pieces of `size` bytes, which can split lines and UTF-8 characters. */
function byteStream(text: string, size = 7): ReadableStream<Uint8Array> {
    const bytes = new TextEncoder().encode(text)
    let offset = 0
    return new ReadableStream({
        pull(controller) {
            if (offset >= bytes.length) return controller.close()
            controller.enqueue(bytes.slice(offset, offset + size))
            offset += size
        },
    })
}

const chunk = (delta: Record<string, unknown>, finishReason: string | null = null) =>
    `data: ${JSON.stringify({ object: 'chat.completion.chunk', choices: [{ index: 0, delta, finish_reason: finishReason }] })}\n\n`

// The event sequence gpt-oss-20b streams on Workers AI (trimmed).
const GPT_OSS_STREAM = [
    chunk({ role: 'assistant', content: '' }),
    chunk({ reasoning_content: 'Need a greeting.' }),
    chunk({ content: '안녕' }),
    chunk({ content: '하세요, hello!' }),
    chunk({}, 'stop'),
    `data: ${JSON.stringify({ choices: [], usage: { neurons: 0 } })}\n\n`,
    `data: ${JSON.stringify({ response: '', usage: { neurons: 2.3 } })}\n\n`,
    'data: [DONE]\n\n',
].join('')

class FakeAi {
    readonly calls: Record<string, unknown>[] = []

    constructor(private readonly output: () => unknown) {}

    async run(_model: string, inputs: Record<string, unknown>): Promise<unknown> {
        this.calls.push(inputs)
        return this.output()
    }
}

async function collect(iterable: AsyncIterable<string>): Promise<string[]> {
    const items: string[] = []
    for await (const item of iterable) items.push(item)
    return items
}

describe('sseData', () => {
    it('yields each event\'s data across arbitrary byte boundaries and CRLF lines', async () => {
        const text = 'data: 첫 번째\r\n\r\n: comment\nevent: x\ndata: a\ndata: b\n\ndata: last'

        for (const size of [1, 2, 5, 100]) {
            expect(await collect(sseData(byteStream(text, size)))).toEqual(['첫 번째', 'a\nb', 'last'])
        }
    })

    it('cancels the stream when the consumer stops early', async () => {
        let cancelled = false
        const body = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(new TextEncoder().encode('data: 1\n\ndata: 2\n\n'))
            },
            cancel() {
                cancelled = true
            },
        })

        for await (const data of sseData(body)) {
            expect(data).toBe('1')
            break
        }
        expect(cancelled).toBe(true)
    })
})

describe('WorkersAiLlmAdapter.stream', () => {
    it('requests a stream with the model inputs and yields only answer text', async () => {
        const ai = new FakeAi(() => byteStream(GPT_OSS_STREAM))
        const adapter = new WorkersAiLlmAdapter(ai as unknown as Ai, model)

        const deltas = await collect(await adapter.stream(params))

        expect(deltas).toEqual(['안녕', '하세요, hello!'])
        expect(ai.calls[0]).toEqual({ reasoning_effort: 'low', messages: params.messages, max_tokens: 100, temperature: 0.3, stream: true })
    })

    it('reads the older { response } stream shape', async () => {
        const adapter = new WorkersAiLlmAdapter(new FakeAi(() => byteStream('data: {"response":"Hi"}\n\ndata: {"response":" there"}\n\ndata: [DONE]\n\n')) as unknown as Ai, model)

        expect(await collect(await adapter.stream(params))).toEqual(['Hi', ' there'])
    })

    it('rejects before streaming when the call is refused', async () => {
        const adapter = new WorkersAiLlmAdapter(new FakeAi(() => {
            throw new Error('3036: you have used up your daily free allocation of 10,000 neurons')
        }) as unknown as Ai, model)

        await expect(adapter.stream(params)).rejects.toMatchObject({ code: 'quota-exhausted' })
    })

    it('fails when reasoning used up max_tokens and no answer text came', async () => {
        const stream = [chunk({ reasoning_content: 'Thinking' }), chunk({}, 'length'), 'data: [DONE]\n\n'].join('')
        const adapter = new WorkersAiLlmAdapter(new FakeAi(() => byteStream(stream)) as unknown as Ai, model)
        const deltas = await adapter.stream(params)

        await expect(collect(deltas)).rejects.toThrow(/finish reason: length/)
    })

    it('fails on an unexpected event or a non-stream output', async () => {
        const adapter = new WorkersAiLlmAdapter(new FakeAi(() => byteStream(`${chunk({ content: 'a' })}data: {"errors":[{"message":"boom"}]}\n\n`)) as unknown as Ai, model)
        const deltas = (await adapter.stream(params))[Symbol.asyncIterator]()

        expect(await deltas.next()).toEqual({ done: false, value: 'a' })
        await expect(deltas.next()).rejects.toBeInstanceOf(ModelError)

        const notStreaming = new WorkersAiLlmAdapter(new FakeAi(() => ({ response: 'whole' })) as unknown as Ai, model)
        await expect(notStreaming.stream(params)).rejects.toMatchObject({ code: 'unknown' })
    })
})
