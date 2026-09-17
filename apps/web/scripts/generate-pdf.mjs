#!/usr/bin/env node
/**
 * Renders the exported /portfolio route to out/portfolio.pdf with headless
 * Chrome. Runs after `next build`, so the PDF lands inside the directory the
 * Pages workflow uploads and the download button on the page resolves to a
 * real static asset.
 *
 * The exported HTML uses root-absolute asset paths, which file:// can't
 * resolve, so out/ is served over a throwaway localhost server first.
 */
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer'

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const OUT_DIR = path.join(ROOT, 'out')
const PDF_PATH = path.join(OUT_DIR, 'portfolio.pdf')
const ROUTE = '/portfolio'

const NAV_TIMEOUT_MS = 120_000
const RENDER_TIMEOUT_MS = 60_000

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

async function isFile(candidate) {
  try {
    return (await stat(candidate)).isFile()
  } catch {
    return false
  }
}

/**
 * Next's static export writes `/portfolio` as `portfolio.html`, and the root
 * as `index.html`. Try both shapes before giving up.
 */
async function resolveFile(urlPath) {
  const resolved = path.resolve(OUT_DIR, `.${urlPath}`)
  // Refuse anything that escapes out/ via `..` segments.
  if (resolved !== OUT_DIR && !resolved.startsWith(OUT_DIR + path.sep)) return null

  for (const candidate of [resolved, `${resolved}.html`, path.join(resolved, 'index.html')]) {
    if (await isFile(candidate)) return candidate
  }
  return null
}

function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const { pathname } = new URL(req.url, 'http://localhost')
      const file = await resolveFile(decodeURIComponent(pathname))
      if (!file) {
        res.writeHead(404, { 'content-type': 'text/plain' })
        res.end('Not found')
        return
      }
      res.writeHead(200, {
        'content-type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
      })
      createReadStream(file).pipe(res)
    } catch (error) {
      res.writeHead(500, { 'content-type': 'text/plain' })
      res.end(String(error))
    }
  })

  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolve(server))
  })
}

/** Collapsed <details> content is unreachable in a PDF, so expand all of it. */
const expandAllDetails = () => {
  for (const el of document.querySelectorAll('details')) el.open = true
}

async function waitForMermaid(page) {
  const total = await page.evaluate(() => document.querySelectorAll('pre.mermaid').length)
  if (total === 0) return

  try {
    await page.waitForFunction(
      () => document.querySelectorAll('pre.mermaid:not([data-processed])').length === 0,
      { timeout: RENDER_TIMEOUT_MS },
    )
  } catch {
    // Failing loudly beats shipping a portfolio PDF with blank diagrams.
    throw new Error(
      `Mermaid did not finish rendering ${total} diagram(s) within ` +
        `${RENDER_TIMEOUT_MS / 1000}s — the CDN script may be unreachable.`,
    )
  }
}

function waitForImages(page) {
  return page.evaluate(
    () =>
      Promise.all(
        Array.from(document.images)
          .filter((img) => !img.complete)
          .map((img) => new Promise((resolve) => {
            img.addEventListener('load', resolve, { once: true })
            img.addEventListener('error', resolve, { once: true })
          })),
      ),
  )
}

const FOOTER_TEMPLATE = `
  <div style="width:100%;padding:0 12mm;font-family:Helvetica,Arial,sans-serif;font-size:8px;color:#888;display:flex;justify-content:space-between;">
    <span>Wonbin Kim — Portfolio</span>
    <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
  </div>`

async function main() {
  if (!(await isFile(path.join(OUT_DIR, 'portfolio.html')))) {
    throw new Error(`out/portfolio.html not found — run \`next build\` before ${path.basename(process.argv[1])}.`)
  }

  const server = await startServer()
  const { port } = server.address()
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    const page = await browser.newPage()

    // layout.tsx's inline theme script reads localStorage before falling back
    // to the OS preference. Seed both so the PDF is deterministically light
    // whatever the build machine prefers.
    await page.evaluateOnNewDocument(() => {
      try {
        localStorage.setItem('theme', 'light')
      } catch {}
    })
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }])

    await page.goto(`http://127.0.0.1:${port}${ROUTE}`, {
      waitUntil: 'domcontentloaded',
      timeout: NAV_TIMEOUT_MS,
    })

    // Expand before the CDN scripts run so mermaid lays diagrams out inside
    // visible containers, then again in case React re-rendered in between.
    await page.evaluate(expandAllDetails)
    await page.waitForNetworkIdle({ idleTime: 1_000, timeout: NAV_TIMEOUT_MS })
    await page.evaluate(expandAllDetails)

    await waitForMermaid(page)
    await waitForImages(page)

    await page.pdf({
      path: PDF_PATH,
      format: 'A4',
      printBackground: true,
      margin: { top: '14mm', bottom: '16mm', left: '12mm', right: '12mm' },
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: FOOTER_TEMPLATE,
    })

    const { size } = await stat(PDF_PATH)
    console.log(`Wrote out/portfolio.pdf (${(size / 1024 / 1024).toFixed(1)} MB)`)
  } finally {
    await browser.close()
    server.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
