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
    const { status, code } = describeError(error)
    if (error instanceof HttpError) {
        return json({ error: code, message: error.message }, status)
    }
    return json({ error: code }, status)
}

/** The status and error code for any thrown value. Logs failures that are not the client's. */
export function describeError(error: unknown): { status: number, code: string } {
    if (error instanceof HttpError) return { status: error.status, code: error.code }
    if (error instanceof ChatError) {
        return { status: error.code === 'no-source' ? 404 : 400, code: error.code }
    }
    if (error instanceof ModelError) {
        console.error(error)
        const status = { 'quota-exhausted': 503, 'rate-limited': 429, 'unknown': 502 }[error.code]
        return { status, code: error.code }
    }
    console.error(error)
    return { status: 500, code: 'internal' }
}
