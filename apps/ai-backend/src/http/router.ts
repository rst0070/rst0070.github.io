import { errorResponse, HttpError } from './respond'
import { ChatRouteDeps, handleChat } from './route/chat'
import { handleReindex, ReindexRouteDeps } from './route/reindex'

type Handler<Deps> = (request: Request, deps: Deps) => Promise<Response>

const ROUTES = new Map<string, Handler<ChatRouteDeps & ReindexRouteDeps>>([
    ['/chat', handleChat],
    ['/admin/reindex', handleReindex],
])

export async function route(request: Request, deps: ChatRouteDeps & ReindexRouteDeps): Promise<Response> {
    try {
        const handler = ROUTES.get(new URL(request.url).pathname)
        if (handler === undefined) throw new HttpError(404, 'not-found')
        if (request.method !== 'POST') throw new HttpError(405, 'method-not-allowed')
        return await handler(request, deps)
    } catch (error) {
        return errorResponse(error)
    }
}
