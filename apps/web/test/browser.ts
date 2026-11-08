// Browser-side test helpers: a Pages-like static server over dist/, a
// headless Chrome (puppeteer, already used for the portfolio PDF), and a
// handle on `pnpm dev`.
import { type ChildProcess, spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import path from 'node:path'
import puppeteer, { type Browser, type Page } from 'puppeteer'
import { WEB_ROOT, servePages } from './html'

const MIME: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.pdf': 'application/pdf',
}

/** Serves `root` the way GitHub Pages would (see servePages). */
export async function startPagesServer(root: string): Promise<{ url: string; close(): Promise<void> }> {
    const server: Server = createServer((req, res) => {
        const { pathname } = new URL(req.url ?? '/', 'http://localhost')
        const answer = servePages(root, pathname)
        if (answer.status === 301) {
            res.writeHead(301, { location: answer.location })
            res.end()
            return
        }
        if (!answer.file) {
            res.writeHead(404)
            res.end()
            return
        }
        const type = MIME[path.extname(answer.file).toLowerCase()] ?? 'application/octet-stream'
        res.writeHead(answer.status, { 'content-type': type })
        res.end(readFileSync(path.join(root, answer.file)))
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const { port } = server.address() as AddressInfo
    return {
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((resolve) => server.close(() => resolve())),
    }
}

export function launchBrowser(): Promise<Browser> {
    return puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
}

/** Resolves to whether `predicate` became true in the page within `timeout`. */
export async function eventually(page: Page, predicate: string, timeout = 10_000): Promise<boolean> {
    try {
        await page.waitForFunction(predicate, { timeout, polling: 100 })
        return true
    } catch {
        return false
    }
}

/** The <body> as served, minus <script> elements and comments. */
export function bodyWithoutScripts(html: string): string {
    const start = html.indexOf('<body')
    const end = html.indexOf('</body>')
    return html
        .slice(start, end === -1 ? undefined : end)
        .replace(/<script\b[\s\S]*?<\/script>/g, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .trim()
}

export type DevServer = { url: string; ready: boolean; stop(): void }

/** Runs `pnpm dev` in apps/web on `port` and waits until it answers `/`. */
export async function startDevServer(port: number, timeout = 60_000): Promise<DevServer> {
    const child: ChildProcess = spawn('pnpm', ['dev'], {
        cwd: WEB_ROOT,
        env: { ...process.env, PORT: String(port) },
        detached: true,
        stdio: 'ignore',
    })
    const url = `http://localhost:${port}`
    const stop = () => {
        try {
            if (child.pid) process.kill(-child.pid, 'SIGTERM')
        } catch {
            // already gone
        }
    }
    const deadline = Date.now() + timeout
    let ready = false
    while (Date.now() < deadline && child.exitCode === null) {
        try {
            const res = await fetch(`${url}/`)
            if (res.status === 200) {
                ready = true
                break
            }
        } catch {
            // not listening yet
        }
        await new Promise((r) => setTimeout(r, 500))
    }
    return { url, ready, stop }
}
