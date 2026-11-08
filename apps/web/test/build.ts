// Builds the site into a directory of its own, with a chosen environment,
// the way `pnpm build` does minus the PDF: `vite build --outDir <dir>`, then
// the prerender with the same `--outDir`.
import { spawnSync } from 'node:child_process'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { WEB_ROOT } from './html'

export function buildSite(outDir: string, env: Record<string, string | undefined>): { ok: boolean; log: string } {
    const merged = { ...process.env, ...env }
    for (const [key, value] of Object.entries(env)) if (value === undefined) delete merged[key]
    const steps: [string, string[]][] = [
        ['npx', ['vite', 'build', '--outDir', outDir, '--emptyOutDir']],
        ['node', ['--experimental-strip-types', 'scripts/prerender.ts', '--outDir', outDir]],
    ]
    let log = ''
    for (const [command, args] of steps) {
        const result = spawnSync(command, args, { cwd: WEB_ROOT, env: merged, encoding: 'utf8' })
        log += `$ ${command} ${args.join(' ')}\n${result.stdout}${result.stderr}`
        if (result.status !== 0) return { ok: false, log }
    }
    return { ok: true, log }
}

/**
 * A stand-in for the ai-backend Worker's POST /chat: answers every question
 * with `answer` as server-sent events, with CORS for a page on another port.
 */
export async function startMockChat(answer: string): Promise<{ url: string; requests: unknown[]; close(): Promise<void> }> {
    const requests: unknown[] = []
    const cors = {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type, accept',
    }
    const server: Server = createServer((req, res) => {
        if (req.method === 'OPTIONS') {
            res.writeHead(204, cors)
            res.end()
            return
        }
        let body = ''
        req.on('data', (chunk) => (body += chunk))
        req.on('end', () => {
            requests.push(JSON.parse(body || '{}'))
            res.writeHead(200, { ...cors, 'content-type': 'text/event-stream' })
            res.end(
                'event: citations\ndata: {"citations":[]}\n\n' +
                    `event: delta\ndata: ${JSON.stringify({ text: answer })}\n\n` +
                    'event: done\ndata: {}\n\n',
            )
        })
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const { port } = server.address() as AddressInfo
    return {
        url: `http://127.0.0.1:${port}`,
        requests,
        close: () => new Promise((resolve) => server.close(() => resolve())),
    }
}
