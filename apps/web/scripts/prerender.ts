/**
 * Writes every route to dist/ as static HTML, plus sitemap.xml and robots.txt.
 * Runs after `vite build`, which leaves the client assets and the document
 * template (dist/index.html, with the built asset tags in place) behind.
 *
 * Pages are rendered by src/entry-server.tsx, loaded through Vite so it gets
 * the same TypeScript, JSX and `@/` alias handling as the client build.
 * Nothing it imports ends up in the browser bundle.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
/** `--outDir <dir>`, as passed to `vite build`, relative to apps/web; default dist/. */
function outDirArg(): string {
    const i = process.argv.indexOf('--outDir')
    return i === -1 ? 'dist' : process.argv[i + 1]
}
const DIST = path.resolve(ROOT, outDirArg())
const BASE_URL = 'https://rst0070.github.io'

type EntryServer = {
    routes(): { path: string; outFile: string }[]
    renderDocument(template: string, route: unknown): Promise<string>
    sitemapEntries(): { url: string; lastModified: string }[]
}

function sitemapXml(entries: { url: string; lastModified: string }[]): string {
    const urls = entries.map(
        ({ url, lastModified }) => `<url>\n<loc>${url}</loc>\n<lastmod>${lastModified}</lastmod>\n</url>`,
    )
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
}

const robotsTxt = `User-Agent: *\nAllow: /\n\nSitemap: ${BASE_URL}/sitemap.xml\n`

async function write(rel: string, content: string) {
    const file = path.join(DIST, rel)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, content)
}

async function main() {
    const template = await readFile(path.join(DIST, 'index.html'), 'utf8').catch(() => {
        throw new Error(`${path.join(DIST, 'index.html')} not found: run \`vite build\` before the prerender.`)
    })

    const vite = await createServer({
        root: ROOT,
        // The env files and import.meta.env of a production build, as the client got.
        mode: 'production',
        logLevel: 'error',
        appType: 'custom',
        server: { middlewareMode: true, hmr: false, watch: null },
    })
    try {
        const entry = (await vite.ssrLoadModule('/src/entry-server.tsx')) as EntryServer
        const routes = entry.routes()
        const seen = new Set<string>()
        for (const route of routes) {
            if (seen.has(route.outFile)) throw new Error(`Two routes write ${route.outFile}`)
            seen.add(route.outFile)
            await write(route.outFile, await entry.renderDocument(template, route))
        }
        await write('sitemap.xml', sitemapXml(entry.sitemapEntries()))
        await write('robots.txt', robotsTxt)
        console.log(`Prerendered ${routes.length} pages, sitemap.xml and robots.txt into ${path.relative(ROOT, DIST) || '.'}/`)
    } finally {
        await vite.close()
    }
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
