// The chat island over two builds of its own: one with VITE_AI_API_URL
// unset, one pointing at a mock of the ai-backend Worker. Needs Chrome
// (puppeteer). Does not touch dist/.
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { Browser, Page } from 'puppeteer'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eventually, launchBrowser, startPagesServer } from './browser'
import { buildSite, startMockChat } from './build'
import { walk } from './html'

const NOTE_SLUG = '22-06-14-2042-segment-tree'
const OLDER_SLUG = '22-06-13-jackson-json-node-read-n-write'
const PAGES = ['/', '/notes', `/notes/${NOTE_SLUG}`, '/portfolio']
const ANSWER = 'MOCK-ANSWER-31c9'
const QUESTION = 'What does this site cover?'

type Site = { dir: string; built: boolean; log: string; url: string; close(): Promise<void> }

let tmp: string
let browser: Browser
let mock: Awaited<ReturnType<typeof startMockChat>>
let withoutApi: Site
let withApi: Site

async function buildAndServe(name: string, env: Record<string, string | undefined>): Promise<Site> {
    const dir = path.join(tmp, name)
    const { ok, log } = buildSite(dir, env)
    const server = await startPagesServer(dir)
    return { dir, built: ok, log, ...server }
}

beforeAll(async () => {
    tmp = mkdtempSync(path.join(tmpdir(), 'web-chat-'))
    mock = await startMockChat(ANSWER)
    withoutApi = await buildAndServe('without-api', { VITE_AI_API_URL: undefined })
    withApi = await buildAndServe('with-api', { VITE_AI_API_URL: mock.url })
    browser = await launchBrowser()
}, 300_000)

afterAll(async () => {
    await browser?.close()
    await withoutApi?.close()
    await withApi?.close()
    await mock?.close()
    if (tmp) rmSync(tmp, { recursive: true, force: true })
})

async function freshPage(): Promise<Page> {
    const context = await browser.createBrowserContext()
    const page = await context.newPage()
    // Desktop width: at puppeteer's default 800x600 the open chat panel
    // (fixed, bottom right) covers the links the tests follow.
    await page.setViewport({ width: 1280, height: 800 })
    return page
}

async function open(page: Page, site: Site, url: string) {
    const res = await page.goto(`${site.url}${url}`, { waitUntil: 'load' })
    expect(res?.status(), url).toBe(200)
}

async function follow(page: Page, selector: string) {
    await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.click(selector)])
}

const LAUNCHER = '.chat-launcher'
const panelText = (page: Page) => page.evaluate(() => (document.querySelector('#chat-panel') as HTMLElement | null)?.innerText ?? '')

/** Opens the panel if it is closed, then waits for it. */
async function showPanel(page: Page) {
    expect(await eventually(page, `!!document.querySelector('${LAUNCHER}')`, 10_000), 'chat launcher').toBe(true)
    if ((await page.$eval(LAUNCHER, (b) => b.getAttribute('aria-expanded'))) !== 'true') await page.click(LAUNCHER)
    expect(await eventually(page, `!!document.querySelector('#chat-panel .chat-input')`, 10_000), 'chat panel').toBe(true)
}

async function ask(page: Page) {
    await showPanel(page)
    await page.type('#chat-panel .chat-input', QUESTION)
    await page.keyboard.press('Enter')
    expect(await eventually(page, `document.querySelector('#chat-panel')?.innerText.includes(${JSON.stringify(ANSWER)})`, 10_000), 'answer shown').toBe(true)
}

describe('chat island', () => {
    it('AC-6: a site-wide chat is still shown after following links in the same tab', async () => {
        expect(withApi.built, withApi.log).toBe(true)
        const page = await freshPage()
        await open(page, withApi, '/')
        await ask(page)

        await follow(page, 'header a[href="/notes"]')
        await showPanel(page)
        expect(await panelText(page)).toContain(QUESTION)
        expect(await panelText(page)).toContain(ANSWER)

        await follow(page, `main a[href="/notes/${NOTE_SLUG}"]`)
        await showPanel(page)
        expect(await panelText(page), 'site-wide chat carries on onto a note page').toContain(ANSWER)
    }, 120_000)

    it('AC-6: a page-scoped chat starts empty on the next page', async () => {
        expect(withApi.built, withApi.log).toBe(true)
        const page = await freshPage()
        await open(page, withApi, `/notes/${NOTE_SLUG}`)
        await showPanel(page)
        expect(await panelText(page)).toContain('Ask about this page')
        await ask(page)

        await follow(page, `a.prev-next-older[href="/notes/${OLDER_SLUG}"]`)
        await showPanel(page)
        const text = await panelText(page)
        expect(text).not.toContain(ANSWER)
        expect(text).not.toContain(QUESTION)
        expect(await page.$$('#chat-panel .chat-turn')).toHaveLength(0)
    }, 120_000)

    it('AC-7: with VITE_AI_API_URL unset, no page has a chat widget', async () => {
        expect(withoutApi.built, withoutApi.log).toBe(true)
        const page = await freshPage()
        for (const url of PAGES) {
            await open(page, withoutApi, url)
            expect(await page.$$('.chat-widget, .chat-launcher, #chat-panel'), url).toHaveLength(0)
        }
    }, 120_000)

    it('AC-7: with VITE_AI_API_URL set, the chat panel chunk is requested only after the first open', async () => {
        expect(withApi.built, withApi.log).toBe(true)
        const assets = path.join(withApi.dir, 'assets')
        const panelChunks = walk(assets)
            .filter((f) => f.endsWith('.js'))
            .filter((f) => readFileSync(path.join(assets, f), 'utf8').includes('Chat about this site'))
        expect(panelChunks.length, 'a chunk holds the chat panel').toBeGreaterThan(0)

        const page = await freshPage()
        const requested: string[] = []
        page.on('request', (req) => requested.push(new URL(req.url()).pathname))
        await open(page, withApi, `/notes/${NOTE_SLUG}`)
        expect(await eventually(page, `!!document.querySelector('${LAUNCHER}')`, 10_000), 'chat launcher').toBe(true)
        const beforeOpen = [...requested]
        for (const chunk of panelChunks) expect(beforeOpen, `${chunk} before open`).not.toContain(`/assets/${chunk}`)

        await page.click(LAUNCHER)
        expect(await eventually(page, `!!document.querySelector('#chat-panel .chat-input')`, 10_000)).toBe(true)
        expect(panelChunks.some((chunk) => requested.includes(`/assets/${chunk}`)), 'panel chunk fetched on open').toBe(true)
    }, 120_000)
})
