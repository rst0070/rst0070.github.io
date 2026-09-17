export interface CorsDeps {
    /** Exact origins (`https://host[:port]`) whose pages may read responses. */
    readonly allowedOrigins: readonly string[]
}

const PREFLIGHT_MAX_AGE_SECONDS = 24 * 60 * 60

/**
 * The response, readable by a page from an allowed origin. Other origins get
 * no CORS headers, so browsers withhold the response. This is not access
 * control: non-browser clients ignore CORS.
 */
export function withCors(response: Response, request: Request, deps: CorsDeps): Response {
    const headers = new Headers(response.headers)
    headers.append('Vary', 'Origin')
    const origin = request.headers.get('Origin')
    if (origin !== null && deps.allowedOrigins.includes(origin)) {
        headers.set('Access-Control-Allow-Origin', origin)
    }
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

/** Answers a preflight for a JSON POST. `withCors` adds the origin. */
export function preflightResponse(): Response {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': String(PREFLIGHT_MAX_AGE_SECONDS),
        },
    })
}
