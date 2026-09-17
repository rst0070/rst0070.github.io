import { HttpError } from './respond'

/** Parses a JSON body of at most `maxBytes`, or throws HttpError 400 / 413. */
export async function readJson(request: Request, maxBytes: number): Promise<unknown> {
    const declared = Number(request.headers.get('Content-Length') ?? '0')
    if (declared > maxBytes) throw new HttpError(413, 'body-too-large')

    const body = await request.arrayBuffer()
    if (body.byteLength > maxBytes) throw new HttpError(413, 'body-too-large')
    try {
        return JSON.parse(new TextDecoder().decode(body))
    } catch {
        throw new HttpError(400, 'invalid-json')
    }
}

export function badRequest(message: string): HttpError {
    return new HttpError(400, 'invalid-request', message)
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}
