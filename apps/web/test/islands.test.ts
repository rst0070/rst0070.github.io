// The client side of the built site: islands in a real browser over dist/
// (served like Pages), the client bundle's contents, and `pnpm dev`.
// Needs `pnpm build` first, Chrome (puppeteer), and the MathJax/Mermaid CDNs.
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { Browser, BrowserContext, Page } from 'puppeteer'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { bodyWithoutScripts, eventually, launchBrowser, startDevServer, startPagesServer } from './browser'
import { DIST, WEB_ROOT, decodeEntities, isFile, metaValue, parseDocument, walk } from './html'

// Headings, code blocks and a Mermaid diagram. No note has math as well, so
// math is checked on MATH_SLUG.
const NOTE_SLUG = '22-06-14-2042-segment-tree'
const MATH_SLUG = '23-08-02-variational-auto-encoder'
// Neighbours of NOTE_SLUG by date (2022-06-13 and 2022-06-20).
const OLDER_SLUG = '22-06-13-jackson-json-node-read-n-write'
const NEWER_SLUG = '22-06-20-build-push-pull-run-spring-boot-image-by-docker'
const PAGES = ['/', '/notes', `/notes/${NOTE_SLUG}`, '/portfolio']
const ISLAND_NAMES = ['theme-toggle', 'toc', 'reading-progress', 'copy-buttons', 'note-scripts', 'mermaid-fullscreen']
const CDN_TIMEOUT = 60_000

let browser: Browser
let site: { url: string; close(): Promise<void> }
const contexts: BrowserContext[] = []

beforeAll(async () => {
    site = await startPagesServer(DIST)
    browser = await launchBrowser()
}, 60_000)

afterAll(async () => {
    await browser?.close()
    await site?.close()
})

/** A fresh page in its own incognito context, so localStorage starts empty. */
async function freshPage(theme?: 'light' | 'dark'): Promise<Page> {
    const context = await browser.createBrowserContext()
    contexts.push(context)
    const page = await context.newPage()
    await page.evaluateOnNewDocument((seed) => {
        // Seed once per tab, so a reload sees what the page itself stored.
        if (seed && !sessionStorage.getItem('test-seeded')) {
            localStorage.setItem('theme', seed)
            sessionStorage.setItem('test-seeded', '1')
        }
        const w = window as unknown as { __themes: (string | undefined)[]; __themeAtBody?: string | null }
        w.__themes = []
        // <html> does not exist yet when this runs, so watch the whole document.
        new MutationObserver(() => w.__themes.push(document.documentElement.dataset.theme)).observe(document, {
            subtree: true,
            attributes: true,
            attributeFilter: ['data-theme'],
        })
        const watchBody = new MutationObserver(() => {
            if (!document.body) return
            w.__themeAtBody = document.documentElement.dataset.theme ?? null
            watchBody.disconnect()
        })
        watchBody.observe(document, { subtree: true, childList: true })
    }, theme)
    return page
}

async function open(page: Page, url: string, base = site.url) {
    const res = await page.goto(`${base}${url}`, { waitUntil: 'load' })
    expect(res?.status(), url).toBe(200)
}

const TOGGLE = 'header button[aria-label^="Switch to"]'

describe('islands in the built site', () => {
    it('AC-4: a stored dark theme is on <html> before first paint, and the toggle flips the theme and localStorage', async () => {
        for (const url of PAGES) {
            const page = await freshPage('dark')
            await open(page, url)
            const seen = await page.evaluate(() => {
                const w = window as unknown as { __themes: string[]; __themeAtBody?: string | null }
                return { themes: w.__themes, atBody: w.__themeAtBody }
            })
            expect(seen.atBody, `${url}: theme when <body> was created`).toBe('dark')
            expect(seen.themes, `${url}: theme never passed through light`).not.toContain('light')

            expect(await eventually(page, `document.querySelector('${TOGGLE}')?.getAttribute('aria-label') === 'Switch to light theme'`), `${url}: toggle shows the dark state`).toBe(true)
            await page.click(TOGGLE)
            expect(await eventually(page, `document.documentElement.dataset.theme === 'light'`), `${url}: toggle sets light`).toBe(true)
            expect(await page.evaluate(() => localStorage.getItem('theme')), url).toBe('light')

            await page.reload({ waitUntil: 'load' })
            expect(await page.evaluate(() => document.documentElement.dataset.theme), `${url}: light sticks across a reload`).toBe('light')
            await page.click(TOGGLE)
            expect(await eventually(page, `document.documentElement.dataset.theme === 'dark'`), `${url}: toggle sets dark`).toBe(true)
            expect(await page.evaluate(() => localStorage.getItem('theme')), url).toBe('dark')
            await page.close()
        }
    }, 120_000)

    it('AC-5: TOC links scroll to their headings and the TOC marks the heading in view; prev/next link the neighbours by date', async () => {
        const page = await freshPage('light')
        await page.setViewport({ width: 1280, height: 800 })
        await open(page, `/notes/${NOTE_SLUG}`)
        expect(await page.$eval('a.prev-next-older', (a) => a.getAttribute('href'))).toBe(`/notes/${OLDER_SLUG}`)
        expect(await page.$eval('a.prev-next-newer', (a) => a.getAttribute('href'))).toBe(`/notes/${NEWER_SLUG}`)
        const hrefs = await page.$$eval('nav.toc a', (as) => as.map((a) => a.getAttribute('href')!))
        expect(hrefs.length).toBeGreaterThan(2)
        const href = hrefs[2]
        await page.click(`nav.toc a[href="${href}"]`)
        // The scroll may be smooth: wait for the heading to arrive near the top.
        const id = JSON.stringify(decodeURIComponent(href.slice(1)))
        expect(await eventually(page, `Math.abs(document.getElementById(${id}).getBoundingClientRect().top) < 200`, 5_000)).toBe(true)
        expect(await eventually(page, `document.querySelector('.toc-active a')?.getAttribute('href') === ${JSON.stringify(href)}`)).toBe(true)
    }, 60_000)

    it('AC-5: the reading progress bar moves as the page scrolls', async () => {
        const page = await freshPage('light')
        await open(page, `/notes/${NOTE_SLUG}`)
        await page.evaluate(() => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) / 2))
        expect(
            await eventually(
                page,
                `(() => { const m = /scaleX\\(([\\d.]+)\\)/.exec(document.querySelector('.reading-progress')?.style.transform ?? ''); return !!m && Number(m[1]) > 0.2 && Number(m[1]) < 0.8 })()`,
            ),
        ).toBe(true)
    }, 60_000)

    it('AC-5: a copy button copies its code block', async () => {
        const page = await freshPage('light')
        await page.browserContext().overridePermissions(site.url, ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write'])
        await open(page, `/notes/${NOTE_SLUG}`)
        const code = await page.$eval('figure.code-block pre', (pre) => pre.textContent)
        await page.click('figure.code-block button.code-copy')
        expect(await eventually(page, `document.querySelector('figure.code-block button.code-copy')?.textContent === 'Copied'`, 3_000)).toBe(true)
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(code)
    }, 60_000)

    it('AC-5: math is typeset, Mermaid renders in the theme of the page, and its fullscreen button opens and Escape closes it', async () => {
        const math = await freshPage('light')
        await open(math, `/notes/${MATH_SLUG}`)
        expect(await eventually(math, `document.querySelectorAll('.MathJax_CHTML, .MathJax, mjx-container').length > 0`, CDN_TIMEOUT)).toBe(true)

        const styles: Record<string, string> = {}
        for (const theme of ['light', 'dark'] as const) {
            const page = await freshPage(theme)
            await open(page, `/notes/${NOTE_SLUG}`)
            expect(await eventually(page, `!!document.querySelector('pre.mermaid[data-processed] svg')`, CDN_TIMEOUT), theme).toBe(true)
            styles[theme] = await page.$eval('pre.mermaid svg', (svg) => svg.querySelector('style')?.textContent ?? '')
        }
        expect(styles.light).not.toBe('')
        expect(styles.dark).not.toBe(styles.light)

        const page = await freshPage('light')
        await open(page, `/notes/${NOTE_SLUG}`)
        await page.click('figure.mermaid-block button.mermaid-fullscreen')
        expect(await eventually(page, `!!document.querySelector('figure.mermaid-block.mermaid-expanded')`, 3_000)).toBe(true)
        await page.keyboard.press('Escape')
        expect(await eventually(page, `!document.querySelector('figure.mermaid-block.mermaid-expanded')`, 3_000)).toBe(true)
    }, 180_000)

})

describe('client bundle (dist/assets)', () => {
    function clientJs(): { file: string; text: string }[] {
        return walk(path.join(DIST, 'assets'))
            .filter((f) => f.endsWith('.js'))
            .map((f) => ({ file: f, text: readFileSync(path.join(DIST, 'assets', f), 'utf8') }))
    }

    it('AC-8: the client assets hold the islands but no markdown pipeline and no note text', () => {
        const assets = clientJs()
        const all = assets.map((a) => a.text).join('\n')
        // The search covers the real islands bundle, not an empty build.
        // The name as a string or an object key; a minifier drops the quotes
        // from keys that are valid identifiers (`toc:` but `"theme-toggle":`).
        for (const name of ISLAND_NAMES) {
            const asStringOrKey = new RegExp(`(["'\`])${name}\\1|[{,]${name}:`)
            expect(all, `bundle registers the ${name} island`).toMatch(asStringOrKey)
        }

        for (const needle of ['shiki', 'showdown', 'codeToHtml', 'literalMidWordUnderscores', 'ghCompatibleHeaderId', 'github-dark']) {
            expect(assets.filter((a) => a.text.includes(needle)).map((a) => a.file), needle).toEqual([])
        }

        const notes = walk(path.join(DIST, 'notes')).filter((f) => f.endsWith('.html'))
        expect(notes.length).toBeGreaterThan(0)
        const leaks: string[] = []
        for (const rel of notes) {
            const head = parseDocument(readFileSync(path.join(DIST, 'notes', rel), 'utf8'))
            const title = head.title!.replace(/ \| rst0070$/, '')
            const excerpt = decodeEntities(metaValue(head, 'description') ?? '').slice(0, 40)
            for (const text of [title, excerpt]) {
                if (text.length >= 12 && all.includes(text)) leaks.push(`${rel}: ${text}`)
            }
        }
        expect(leaks).toEqual([])
    })
})

describe('pnpm dev', () => {
    it('AC-10: serves /, /notes, a note and /portfolio with the build\'s HTML and working islands, and reloads on a page edit', async () => {
        const dev = await startDevServer(4317)
        const homeSource = path.join(WEB_ROOT, 'src/pages/Home.tsx')
        const original = readFileSync(homeSource, 'utf8')
        try {
            expect(dev.ready, 'pnpm dev answers /').toBe(true)
            for (const url of PAGES) {
                const res = await fetch(`${dev.url}${url}`)
                expect(res.status, url).toBe(200)
                const built = path.join(DIST, url === '/' ? 'index.html' : `${url.slice(1)}.html`)
                expect(isFile(built), built).toBe(true)
                expect(bodyWithoutScripts(await res.text()), url).toBe(bodyWithoutScripts(readFileSync(built, 'utf8')))
            }

            const page = await freshPage('light')
            await open(page, '/', dev.url)
            expect(await eventually(page, `document.querySelector('${TOGGLE}')?.getAttribute('aria-label') === 'Switch to dark theme'`, 15_000)).toBe(true)
            await page.click(TOGGLE)
            expect(await eventually(page, `document.documentElement.dataset.theme === 'dark'`)).toBe(true)

            const note = await freshPage('light')
            await open(note, `/notes/${NOTE_SLUG}`, dev.url)
            await note.click('figure.mermaid-block button.mermaid-fullscreen')
            expect(await eventually(note, `!!document.querySelector('figure.mermaid-block.mermaid-expanded')`, 15_000)).toBe(true)

            const probe = 'HMR-PROBE-7f3a'
            expect(original).toContain('trying to share my learnings')
            writeFileSync(homeSource, original.replace('trying to share my learnings', `trying to share my learnings ${probe}`))
            expect(await eventually(page, `document.body.textContent.includes(${JSON.stringify(probe)})`, 20_000)).toBe(true)
        } finally {
            writeFileSync(homeSource, original)
            dev.stop()
        }
    }, 180_000)
})
