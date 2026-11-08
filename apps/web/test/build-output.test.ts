// Checks over the built site in apps/web/dist. Run after `pnpm build`.
// The reference files in ./reference were taken from the last Next.js build
// (`next build`, output in out/) at the commit this migration started from.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { readPortfolio } from '@rst0070/content/node'
import { describe, expect, it } from 'vitest'
import {
    BASE_URL,
    DIST,
    decodeEntities,
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

const REPO_CONTENT = path.resolve(DIST, '../../../content')

/** Every `<link rel="alternate" hreflang>` in the head, as hreflang -> href. */
function hreflangs(html: string): Record<string, string> {
    const head = html.slice(0, html.indexOf('</head>'))
    const out: Record<string, string> = {}
    for (const m of head.matchAll(/<link\b[^>]*>/g)) {
        if (!/rel="alternate"/.test(m[0])) continue
        const lang = /hreflang="([^"]*)"/.exec(m[0])?.[1]
        const href = /href="([^"]*)"/.exec(m[0])?.[1]
        if (lang && href) out[lang] = href
    }
    return out
}

/** The text a reader sees, tags stripped and entities decoded. */
function visibleText(html: string): string {
    return decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ')
}

/** The `#`-headings of a markdown file, as plain text. */
function markdownHeadings(md: string): string[] {
    return md
        .split('\n')
        .filter((line) => /^#{1,4} /.test(line))
        .map((line) =>
            line
                .replace(/^#+ /, '')
                .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
                .replace(/[*`]/g, '')
                .replace(/\s+/g, ' ')
                .trim(),
        )
        .filter(Boolean)
}

const HREFLANGS = {
    en: `${BASE_URL}/portfolio`,
    ko: `${BASE_URL}/ko/portfolio`,
    'x-default': `${BASE_URL}/portfolio`,
}

describe('Korean portfolio (dist/)', () => {
    it.fails('AC-7: dist/ko/portfolio.html has lang="ko" and the rendered portfolio.ko.md; both portfolio pages carry the hreflang links; the sitemap lists /ko/portfolio', () => {
        const koFile = path.join(DIST, 'ko', 'portfolio.html')
        expect(isFile(koFile), 'dist/ko/portfolio.html was built').toBe(true)
        const ko = readFileSync(koFile, 'utf8')
        expect(ko).toMatch(/<html lang="ko"/)

        const koSource = path.join(REPO_CONTENT, 'portfolio.ko.md')
        expect(isFile(koSource), 'content/portfolio.ko.md exists').toBe(true)
        const headings = markdownHeadings(readFileSync(koSource, 'utf8'))
        expect(headings.length).toBeGreaterThan(5)
        const text = visibleText(ko)
        expect(headings.filter((h) => !text.includes(h)), 'portfolio.ko.md headings missing from the page').toEqual([])

        const en = readFileSync(path.join(DIST, 'portfolio.html'), 'utf8')
        expect(hreflangs(en), '/portfolio hreflang').toEqual(HREFLANGS)
        expect(hreflangs(ko), '/ko/portfolio hreflang').toEqual(HREFLANGS)
        expect(parseDocument(en).canonical).toBe(`${BASE_URL}/portfolio`)
        expect(parseDocument(ko).canonical).toBe(`${BASE_URL}/ko/portfolio`)

        const sitemap = sitemapEntries(readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8'))
        expect(sitemap.has(`${BASE_URL}/ko/portfolio`), 'sitemap lists /ko/portfolio').toBe(true)
        expect(servePages(DIST, '/ko/portfolio').status).toBe(200)
    })

    it.fails('AC-8: with content/portfolio.ko.md missing, loading the Korean portfolio fails naming the file', () => {
        const root = mkdtempSync(path.join(tmpdir(), 'content-'))
        try {
            writeFileSync(path.join(root, 'portfolio.md'), '# English only\n')
            expect(() => readPortfolio(root, 'ko')).toThrow(/portfolio\.ko\.md/)
        } finally {
            rmSync(root, { recursive: true, force: true })
        }
    })

    it.fails('AC-9: dist/portfolio.html without JS is the English portfolio, with no redirect markup but the inline detection script', () => {
        const html = readFileSync(path.join(DIST, 'portfolio.html'), 'utf8')
        expect(html).toMatch(/<html lang="en"/)
        const english = markdownHeadings(readFileSync(path.join(REPO_CONTENT, 'portfolio.md'), 'utf8'))
        const text = visibleText(html.slice(html.indexOf('<body')))
        expect(english.filter((h) => !text.includes(h)), 'portfolio.md headings missing from the page').toEqual([])

        expect(html).not.toMatch(/<meta\b[^>]*http-equiv="refresh"/i)
        expect(html).not.toMatch(/<noscript\b/i)
        const redirecting = Array.from(html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)).filter(([, , body]) =>
            /location\s*\.\s*(replace|assign|href)|location\s*=/.test(body),
        )
        expect(redirecting.length, 'exactly one script redirects').toBe(1)
        const [tag, attrs, body] = redirecting[0]
        expect(attrs, 'detection script is inline').not.toMatch(/\bsrc=/)
        expect(body).toContain('/ko/portfolio')
        expect(body).toContain('location.replace')
        // Before first paint: in <head>, ahead of any stylesheet and of <body>.
        const at = html.indexOf(tag)
        expect(at).toBeLessThan(html.indexOf('</head>'))
        const stylesheet = html.search(/<link\b[^>]*rel="stylesheet"/)
        if (stylesheet !== -1) expect(at).toBeLessThan(stylesheet)
    })

    it.fails('AC-10: a production build has dist/portfolio.ko.pdf, and /ko/portfolio links to it', () => {
        const pdf = path.join(DIST, 'portfolio.ko.pdf')
        expect(isFile(pdf), 'dist/portfolio.ko.pdf was built').toBe(true)
        expect(readFileSync(pdf).subarray(0, 5).toString()).toBe('%PDF-')
        const ko = readFileSync(path.join(DIST, 'ko', 'portfolio.html'), 'utf8')
        const link = /<a\b[^>]*class="pdf-download"[^>]*>/.exec(ko)?.[0]
        expect(link, 'download link on /ko/portfolio').toBeDefined()
        expect(link).toContain('href="/portfolio.ko.pdf"')
        expect(link).toContain('download="Wonbin-Kim-Portfolio-ko.pdf"')
        const en = readFileSync(path.join(DIST, 'portfolio.html'), 'utf8')
        expect(/<a\b[^>]*class="pdf-download"[^>]*>/.exec(en)?.[0]).toContain('href="/portfolio.pdf"')
    })
})
