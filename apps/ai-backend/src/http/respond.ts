import { ChatError } from '../core/error/chat'
import { ModelError } from '../core/error/model'

/** A request rejected by the HTTP layer itself (bad shape, auth, routing). */
export class HttpError extends Error {
    override readonly name = 'HttpError'

    constructor(readonly status: number, readonly code: string, message: string = code) {
        super(message)
    }
}

export function json(body: unknown, status = 200): Response {
    return Response.json(body, { status })
}

/** Maps any thrown value to a JSON error response: `{ error: code }`. */
export function errorResponse(error: unknown): Response {
    if (error instanceof HttpError) {
        return json({ error: error.code, message: error.message }, error.status)
    }
    if (error instanceof ChatError) {
        return json({ error: error.code }, error.code === 'no-source' ? 404 : 400)
    }
    if (error instanceof ModelError) {
        console.error(error)
        const status = { 'quota-exhausted': 503, 'rate-limited': 429, 'unknown': 502 }[error.code]
        return json({ error: error.code }, status)
    }
    console.error(error)
    return json({ error: 'internal' }, 500)
}
