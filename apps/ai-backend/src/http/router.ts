import { CorsDeps, preflightResponse, withCors } from './cors'
import { errorResponse, HttpError } from './respond'
import { ChatRouteDeps, handleChat } from './route/chat'
import { handleReindex, ReindexRouteDeps } from './route/reindex'

export type RouteDeps = ChatRouteDeps & ReindexRouteDeps & CorsDeps

interface Route {
    handler: (request: Request, deps: RouteDeps) => Promise<Response>
    /** Called from browsers on other origins (the site), so it answers CORS. */
    cors: boolean
}

const ROUTES = new Map<string, Route>([
    ['/chat', { handler: handleChat, cors: true }],
    ['/admin/reindex', { handler: handleReindex, cors: false }],
])

export async function route(request: Request, deps: RouteDeps): Promise<Response> {
    const found = ROUTES.get(new URL(request.url).pathname)
    if (found === undefined) return errorResponse(new HttpError(404, 'not-found'))

    const response = await handle(request, deps, found)
    // Errors too, so the page can read the error code.
    return found.cors ? withCors(response, request, deps) : response
}

async function handle(request: Request, deps: RouteDeps, found: Route): Promise<Response> {
    try {
        if (found.cors && request.method === 'OPTIONS') return preflightResponse()
        if (request.method !== 'POST') throw new HttpError(405, 'method-not-allowed')
        return await found.handler(request, deps)
    } catch (error) {
        return errorResponse(error)
    }
}
