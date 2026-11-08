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
const DIST = path.join(ROOT, 'dist')
const BASE_URL = 'https://rst0070.github.io'

type Rendered = { html: string; head: string }
type EntryServer = {
    routes(): { path: string; outFile: string }[]
    render(route: unknown): Promise<Rendered>
    sitemapEntries(): { url: string; lastModified: string }[]
}

/** Fills the template's two slots; the comments are removed with them. */
export function fillTemplate(template: string, { html, head }: Rendered): string {
    for (const slot of ['<!--app-head-->', '<!--app-html-->']) {
        if (!template.includes(slot)) throw new Error(`index.html is missing the ${slot} slot`)
    }
    return template.replace('<!--app-head-->', () => head).replace('<!--app-html-->', () => html)
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
        throw new Error('dist/index.html not found: run `vite build` before the prerender.')
    })

    const vite = await createServer({
        root: ROOT,
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
            await write(route.outFile, fillTemplate(template, await entry.render(route)))
        }
        await write('sitemap.xml', sitemapXml(entry.sitemapEntries()))
        await write('robots.txt', robotsTxt)
        console.log(`Prerendered ${routes.length} pages, sitemap.xml and robots.txt into dist/`)
    } finally {
        await vite.close()
    }
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
