// The Korean portfolio's client side, in a real browser over dist/ (served
// like Pages): language detection on /portfolio and the nav language
// dropdown. Needs `pnpm build` first and Chrome (puppeteer).
import type { Browser, BrowserContext, Page } from 'puppeteer'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eventually, launchBrowser, startPagesServer } from './browser'
import { DIST } from './html'

const NOTE_SLUG = '22-06-14-2042-segment-tree'
const SELECT = 'header select[aria-label="Language"]'

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

/**
 * A fresh tab in its own incognito context whose browser languages are
 * `languages`, with `lang` stored in localStorage when given (seeded once per
 * tab, so later loads see what the page itself stored).
 */
async function visitor(languages: string[], stored?: 'en' | 'ko'): Promise<Page> {
    const context = await browser.createBrowserContext()
    contexts.push(context)
    const page = await context.newPage()
    await page.evaluateOnNewDocument(
        (langs, seed) => {
            Object.defineProperty(Navigator.prototype, 'languages', { get: () => langs, configurable: true })
            Object.defineProperty(Navigator.prototype, 'language', { get: () => langs[0], configurable: true })
            if (!sessionStorage.getItem('test-seeded')) {
                if (seed) localStorage.setItem('lang', seed)
                sessionStorage.setItem('test-seeded', '1')
            }
        },
        languages,
        stored,
    )
    return page
}

/** Opens `url` and waits for the page to settle, following a client-side redirect. */
async function open(page: Page, url: string) {
    try {
        await page.goto(`${site.url}${url}`, { waitUntil: 'load' })
    } catch {
        // A location.replace during load can abort the first navigation.
    }
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 15_000 }).catch(() => {})
}

const pathname = (page: Page) => new URL(page.url()).pathname

describe('language detection on /portfolio', () => {
    it.fails('AC-1: no stored lang and browser languages ["ko-KR"] -> /portfolio becomes /ko/portfolio', async () => {
        const page = await visitor(['ko-KR'])
        await open(page, '/portfolio')
        expect(await eventually(page, `location.pathname === '/ko/portfolio'`)).toBe(true)
        expect(pathname(page)).toBe('/ko/portfolio')
        // Detection reads the choice and never writes it.
        expect(await page.evaluate(() => localStorage.getItem('lang'))).toBeNull()
    }, 60_000)

    it.fails('AC-2: no stored lang and browser languages ["en-US"] -> stays at /portfolio', async () => {
        const page = await visitor(['en-US'])
        await open(page, '/portfolio')
        expect(pathname(page)).toBe('/portfolio')
        expect(await page.evaluate(() => document.documentElement.lang)).toBe('en')
        expect(await page.$eval(SELECT, (el) => (el as HTMLSelectElement).value).catch(() => null), 'dropdown shows EN').toBe('en')
    }, 60_000)

    it.fails('AC-3: a stored lang overrides the browser language, in both directions', async () => {
        const en = await visitor(['ko-KR'], 'en')
        await open(en, '/portfolio')
        expect(pathname(en)).toBe('/portfolio')

        const ko = await visitor(['en-US'], 'ko')
        await open(ko, '/portfolio')
        expect(await eventually(ko, `location.pathname === '/ko/portfolio'`)).toBe(true)
        expect(pathname(ko)).toBe('/ko/portfolio')
    }, 60_000)
})

describe('language dropdown', () => {
    it.fails('AC-4: /, /notes, a note, /portfolio and /ko/portfolio show the dropdown, set to EN except on /ko/portfolio', async () => {
        const expected: [string, string, string][] = [
            ['/', 'en', 'EN'],
            ['/notes', 'en', 'EN'],
            [`/notes/${NOTE_SLUG}`, 'en', 'EN'],
            ['/portfolio', 'en', 'EN'],
            ['/ko/portfolio', 'ko', '한국어'],
        ]
        for (const [url, value, label] of expected) {
            const page = await visitor(['en-US'])
            await open(page, url)
            expect(pathname(page), url).toBe(url)
            const shown = await page.evaluate((sel) => {
                const select = document.querySelector<HTMLSelectElement>(sel)
                return select
                    ? {
                          value: select.value,
                          label: select.selectedOptions[0]?.textContent?.trim(),
                          options: Array.from(select.options, (o) => o.textContent?.trim()),
                      }
                    : null
            }, SELECT)
            expect(shown, `${url}: dropdown in the nav`).toEqual({ value, label, options: ['EN', '한국어'] })
            await page.close()
        }
    }, 120_000)

    it.fails('AC-5: on /portfolio picking 한국어 stores "ko" and goes to /ko/portfolio; picking EN there stores "en" and returns', async () => {
        const page = await visitor(['en-US'])
        await open(page, '/portfolio')
        expect(pathname(page)).toBe('/portfolio')
        expect(await page.$(SELECT), 'dropdown in the nav').not.toBeNull()

        await page.select(SELECT, 'ko')
        expect(await eventually(page, `location.pathname === '/ko/portfolio'`)).toBe(true)
        await page.waitForNetworkIdle({ idleTime: 500, timeout: 15_000 }).catch(() => {})
        expect(await page.evaluate(() => localStorage.getItem('lang'))).toBe('ko')

        await page.waitForSelector(SELECT)
        await page.select(SELECT, 'en')
        expect(await eventually(page, `location.pathname === '/portfolio'`)).toBe(true)
        await page.waitForNetworkIdle({ idleTime: 500, timeout: 15_000 }).catch(() => {})
        expect(await page.evaluate(() => localStorage.getItem('lang'))).toBe('en')
        expect(pathname(page)).toBe('/portfolio')
    }, 60_000)

    it.fails('AC-6: on /notes picking 한국어 stores "ko" and the URL stays /notes', async () => {
        const page = await visitor(['en-US'])
        await open(page, '/notes')
        expect(await page.$(SELECT), 'dropdown in the nav').not.toBeNull()
        await page.select(SELECT, 'ko')
        expect(await eventually(page, `localStorage.getItem('lang') === 'ko'`)).toBe(true)
        await new Promise((r) => setTimeout(r, 1_000))
        expect(pathname(page)).toBe('/notes')
    }, 60_000)
})
