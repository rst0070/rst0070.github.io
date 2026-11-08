// Test-side readers for built HTML. Deliberately independent of the app code
// (src/head.ts, entry-server): they parse what a crawler would see.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

export const WEB_ROOT = path.resolve(__dirname, '..')
export const DIST = path.join(WEB_ROOT, 'dist')
export const PUBLIC_DIR = path.join(WEB_ROOT, 'public')
export const REFERENCE = path.join(__dirname, 'reference')
export const BASE_URL = 'https://rst0070.github.io'

export function isFile(p: string): boolean {
    return existsSync(p) && statSync(p).isFile()
}

export function isDir(p: string): boolean {
    return existsSync(p) && statSync(p).isDirectory()
}

/** Every file under `dir`, as forward-slash paths relative to it. */
export function walk(dir: string, prefix = ''): string[] {
    if (!isDir(dir)) return []
    return readdirSync(dir).flatMap((name) => {
        const full = path.join(dir, name)
        const rel = prefix ? `${prefix}/${name}` : name
        return isDir(full) ? walk(full, rel) : [rel]
    })
}

/** The Build output table of the spec: public URL -> file under dist/. */
export function urlToDistFile(url: string): string {
    if (url === '/') return 'index.html'
    if (url === '404') return '404.html'
    if (url === '/notes' || url === '/portfolio') return `${url.slice(1)}.html`
    if (/^\/notes\/[^/]+$/.test(url)) return `${url.slice(1)}.html`
    return url.slice(1)
}

export type PagesResponse = { status: number; location?: string; file?: string; body: string }

/**
 * How GitHub Pages answers a GET for a static tree: the exact file, then
 * `<path>.html`, then a directory with index.html (301 to the trailing-slash
 * URL when the request has none), else 404.html with status 404.
 */
export function servePages(root: string, urlPath: string): PagesResponse {
    const rel = decodeURIComponent(urlPath).replace(/^\/+/, '')
    const target = path.join(root, rel)
    const read = (file: string, status: number): PagesResponse => ({
        status,
        file: path.relative(root, file),
        body: readFileSync(file, 'utf8'),
    })
    if (rel === '' && isFile(path.join(root, 'index.html'))) return read(path.join(root, 'index.html'), 200)
    if (rel !== '' && !rel.endsWith('/') && isFile(target)) return read(target, 200)
    if (rel !== '' && !rel.endsWith('/') && isFile(`${target}.html`)) return read(`${target}.html`, 200)
    if (isDir(target) && isFile(path.join(target, 'index.html'))) {
        if (!urlPath.endsWith('/')) return { status: 301, location: `${urlPath}/`, body: '' }
        return read(path.join(target, 'index.html'), 200)
    }
    const notFound = path.join(root, '404.html')
    return isFile(notFound) ? read(notFound, 404) : { status: 404, body: '' }
}

export function decodeEntities(s: string): string {
    return s
        .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
        .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
}

function attributes(tag: string): Record<string, string> {
    const out: Record<string, string> = {}
    for (const m of tag.matchAll(/([\w:-]+)="([^"]*)"/g)) out[m[1].toLowerCase()] = decodeEntities(m[2])
    return out
}

export type ParsedHead = {
    title: string | undefined
    canonical: string | undefined
    /** [name-or-property, content], viewport excluded. */
    metas: [string, string][]
    jsonLd: any[]
}

/** Reads the document as served, without running any script. */
export function parseDocument(html: string): ParsedHead {
    const headEnd = html.indexOf('</head>')
    const head = headEnd === -1 ? html : html.slice(0, headEnd)
    const title = /<title>([\s\S]*?)<\/title>/.exec(head)?.[1]
    const canonicalTag = /<link\b[^>]*rel="canonical"[^>]*>/.exec(head)?.[0]
    const metas: [string, string][] = []
    for (const m of head.matchAll(/<meta\b[^>]*>/g)) {
        const a = attributes(m[0])
        const key = a.property ?? a.name
        if (key && key !== 'viewport' && a.content !== undefined) metas.push([key, a.content])
    }
    const jsonLd = Array.from(
        html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
        (m) => JSON.parse(m[1]),
    )
    return {
        title: title === undefined ? undefined : decodeEntities(title),
        canonical: canonicalTag ? attributes(canonicalTag).href : undefined,
        metas,
        jsonLd,
    }
}

export function metaValue(head: ParsedHead, key: string): string | undefined {
    return head.metas.find(([k]) => k === key)?.[1]
}

export function readReference(name: string): string {
    return readFileSync(path.join(REFERENCE, name), 'utf8')
}

/** <loc> -> <lastmod> for every <url> in a sitemap. */
export function sitemapEntries(xml: string): Map<string, string | undefined> {
    const entries = new Map<string, string | undefined>()
    for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
        const loc = /<loc>([\s\S]*?)<\/loc>/.exec(m[1])?.[1]?.trim()
        const lastmod = /<lastmod>([\s\S]*?)<\/lastmod>/.exec(m[1])?.[1]?.trim()
        if (loc) entries.set(loc, lastmod)
    }
    return entries
}
