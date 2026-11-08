/**
 * `pnpm dev`: every route rendered on request by the same entry-server and
 * index.html template the prerender uses, so dev HTML has the build's
 * structure. Vite serves the client entry and islands with React Fast
 * Refresh. Pages are server-rendered only, so an edit to anything outside the
 * client's module graph (a page, routes.ts, infra/, content/) reloads the
 * browser instead.
 *
 * PORT sets the port (default 3000).
 */
import { readFile } from 'node:fs/promises'
import { createServer as createHttpServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const CONTENT_ROOT = path.resolve(ROOT, '..', '..', 'content')
const PORT = Number(process.env.PORT ?? 3000)

type Route = { path: string; outFile: string }
type EntryServer = {
    routes(): Route[]
    notFound: Route
    renderDocument(template: string, route: Route): Promise<string>
}

/** "/notes/x", "/notes/x.html" and "/index.html" name the same pages they do on Pages. */
function routePath(pathname: string): string {
    const p = decodeURIComponent(pathname).replace(/\.html$/, '')
    return p === '/index' ? '/' : p
}

const http = createHttpServer()
const vite = await createServer({
    root: ROOT,
    appType: 'custom',
    server: { middlewareMode: true, hmr: { server: http } },
    plugins: [
        {
            name: 'reload-on-server-render-change',
            // Runs per environment after Vite has invalidated the module, so
            // the reload is answered with the edited render.
            hotUpdate({ file, modules, server }) {
                if (this.environment.name !== 'ssr' || modules.length === 0) return
                const client = server.environments.client
                // Tailwind also lists every source file as an "asset" dependency
                // of the CSS; only a js module means the client really imports it.
                const imported = [...(client.moduleGraph.getModulesByFile(file) ?? [])].some((m) => m.type === 'js')
                if (imported) return // Fast Refresh handles it
                client.hot.send({ type: 'full-reload', path: '*' })
            },
        },
    ],
})

// Markdown is read per request, not imported, so it is not in any module graph.
vite.watcher.add(CONTENT_ROOT)
vite.watcher.on('change', (file) => {
    if (file.startsWith(CONTENT_ROOT)) vite.environments.client.hot.send({ type: 'full-reload', path: '*' })
})

http.on('request', (req, res) => {
    vite.middlewares(req, res, async () => {
        try {
            const { pathname } = new URL(req.url ?? '/', 'http://localhost')
            const entry = (await vite.ssrLoadModule('/src/entry-server.tsx')) as EntryServer
            const wanted = routePath(pathname)
            const route = entry.routes().find((r) => r.path === wanted) ?? entry.notFound
            const template = await vite.transformIndexHtml(req.url ?? '/', await readFile(path.join(ROOT, 'index.html'), 'utf8'))
            const html = await entry.renderDocument(template, route)
            res.writeHead(route.outFile === entry.notFound.outFile ? 404 : 200, { 'content-type': 'text/html; charset=utf-8' })
            res.end(html)
        } catch (error) {
            vite.ssrFixStacktrace(error as Error)
            console.error(error)
            res.writeHead(500, { 'content-type': 'text/plain' })
            res.end(String((error as Error).stack ?? error))
        }
    })
})

http.listen(PORT, () => console.log(`dev server at http://localhost:${PORT}`))
