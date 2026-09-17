import { ChatReplyStream } from '../core/entity/chat'
import { describeError } from './respond'

/**
 * A chat reply as server-sent events, in this order:
 *
 *     event: citations   data: { "citations": Citation[] }
 *     event: delta       data: { "text": string }            repeated
 *     event: done        data: {}
 *
 * If generation fails after the response has started, `event: error` with
 * `{ "error": code }` takes the place of `done`. Failures before that are
 * ordinary JSON error responses. Text is pulled from the model only as fast as
 * the client reads, and a client that disconnects stops generation.
 */
export function eventStreamResponse(reply: ChatReplyStream): Response {
    const deltas = reply.deltas[Symbol.asyncIterator]()
    const body = new ReadableStream<Uint8Array>({
        start(controller) {
            controller.enqueue(encodeEvent('citations', { citations: reply.citations }))
        },
        async pull(controller) {
            try {
                const next = await deltas.next()
                if (next.done) {
                    controller.enqueue(encodeEvent('done', {}))
                    controller.close()
                } else {
                    controller.enqueue(encodeEvent('delta', { text: next.value }))
                }
            } catch (error) {
                controller.enqueue(encodeEvent('error', { error: describeError(error).code }))
                controller.close()
            }
        },
        async cancel() {
            await deltas.return?.()
        },
    })
    return new Response(body, {
        headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store' },
    })
}

export function acceptsEventStream(request: Request): boolean {
    return (request.headers.get('Accept') ?? '').includes('text/event-stream')
}

const encoder = new TextEncoder()

function encodeEvent(name: string, data: unknown): Uint8Array {
    return encoder.encode(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`)
}
