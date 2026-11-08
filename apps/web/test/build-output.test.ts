// Checks over the built site in apps/web/dist. Run after `pnpm build`.
// The reference files in ./reference were taken from the last Next.js build
// (`next build`, output in out/) at the commit this migration started from.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
    BASE_URL,
    DIST,
    PUBLIC_DIR,
    isDir,
    isFile,
    metaValue,
    parseDocument,
    readReference,
    servePages,
    sitemapEntries,
    urlToDistFile,
    walk,
} from './html'

const FIXTURE_SLUG = '22-06-14-2042-segment-tree'
const STATIC_ROUTES = new Set([BASE_URL, `${BASE_URL}/notes`, `${BASE_URL}/portfolio`])

const referenceUrls = readReference('next-urls.txt').split('\n').filter(Boolean)
const referenceNoteUrls = referenceUrls.filter((u) => u.startsWith('/notes/'))

function distNoteFiles(): string[] {
    return walk(path.join(DIST, 'notes')).filter((f) => f.endsWith('.html'))
}

describe('build output (dist/)', () => {
    it('AC-1: every URL of the Next build has a file in dist at the Build output path', () => {
        expect(isDir(DIST), 'dist/ was built').toBe(true)
        const missing = referenceUrls.filter((url) => !isFile(path.join(DIST, urlToDistFile(url))))
        expect(missing).toEqual([])
    })

    it('AC-1: every public/ file is copied into dist byte-identical', () => {
        expect(isDir(DIST), 'dist/ was built').toBe(true)
        const publicFiles = walk(PUBLIC_DIR)
        expect(publicFiles.length).toBeGreaterThan(0)
        const differing = publicFiles.filter((rel) => {
            const built = path.join(DIST, rel)
            return !isFile(built) || !readFileSync(built).equals(readFileSync(path.join(PUBLIC_DIR, rel)))
        })
        expect(differing).toEqual([])
    })

    it('AC-1: sitemap.xml and robots.txt keep the same entries as the Next build', () => {
        expect(isFile(path.join(DIST, 'sitemap.xml')), 'dist/sitemap.xml was built').toBe(true)
        const before = sitemapEntries(readReference('next-sitemap.xml'))
        const after = sitemapEntries(readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8'))
        for (const [loc, lastmod] of before) {
            expect(after.has(loc), `sitemap has ${loc}`).toBe(true)
            if (!STATIC_ROUTES.has(loc)) expect(after.get(loc), `lastmod of ${loc}`).toBe(lastmod)
        }
        expect(readFileSync(path.join(DIST, 'robots.txt'), 'utf8')).toBe(readReference('next-robots.txt'))
    })

    it('AC-2: /notes/<slug> is served with 200 and no trailing-slash redirect; an unknown path gets the 404 page', () => {
        expect(isDir(DIST), 'dist/ was built').toBe(true)
        const fixture = servePages(DIST, `/notes/${FIXTURE_SLUG}`)
        expect(fixture.status).toBe(200)
        expect(fixture.location).toBeUndefined()
        expect(fixture.body).toContain('세그먼트 트리 개념과 백준 2042번 구간 합 구하기')

        const redirected = referenceNoteUrls.filter((url) => servePages(DIST, url).status !== 200)
        expect(redirected).toEqual([])

        const unknown = servePages(DIST, '/nope')
        expect(unknown.status).toBe(404)
        expect(unknown.body).toContain('404 - Page Not Found')
    })

    it('AC-3: the fixture note has the same head tags, JSON-LD and body as the Next build', () => {
        const file = path.join(DIST, 'notes', `${FIXTURE_SLUG}.html`)
        expect(isFile(file), `dist/notes/${FIXTURE_SLUG}.html was built`).toBe(true)
        const reference = JSON.parse(readReference(`next-head-${FIXTURE_SLUG}.json`))
        const html = readFileSync(file, 'utf8')
        const head = parseDocument(html)

        expect(head.title).toBe(reference.title)
        expect(head.canonical).toBe(reference.canonical)
        const sortPairs = (pairs: [string, string][]) => [...pairs].sort((a, b) => a.join('\0').localeCompare(b.join('\0')))
        expect(sortPairs(head.metas)).toEqual(sortPairs(reference.metas))
        const byType = (blocks: any[]) => [...blocks].sort((a, b) => a['@type'].localeCompare(b['@type']))
        expect(byType(head.jsonLd)).toEqual(byType(reference.jsonLd))
        expect(html).toContain(reference.body)
    })

    it('AC-3: every note page carries its content, head tags and both JSON-LD blocks without JS', () => {
        expect(isDir(path.join(DIST, 'notes')), 'dist/notes was built').toBe(true)
        const files = distNoteFiles()
        expect(files.length).toBeGreaterThanOrEqual(referenceNoteUrls.length)
        for (const rel of files) {
            const slug = rel.replace(/\.html$/, '')
            const html = readFileSync(path.join(DIST, 'notes', rel), 'utf8')
            const head = parseDocument(html)
            const url = `${BASE_URL}/notes/${slug}`
            expect(head.title, slug).toMatch(/ \| rst0070$/)
            expect(head.canonical, slug).toBe(url)
            expect(metaValue(head, 'description'), slug).toBeTruthy()
            expect(metaValue(head, 'og:type'), slug).toBe('article')
            expect(metaValue(head, 'og:url'), slug).toBe(url)
            expect(metaValue(head, 'og:title'), slug).toBe(head.title!.replace(/ \| rst0070$/, ''))
            expect(metaValue(head, 'twitter:card'), slug).toBe('summary')
            expect(head.jsonLd.map((b) => b['@type']).sort(), slug).toEqual(['BlogPosting', 'BreadcrumbList'])
            expect(html, slug).toMatch(/<div class="prose post-body">[\s\S]+?<\/div>/)
        }
    })
})
