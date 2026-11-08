// AC-9: CI builds and tests pull requests without deploying, deploys the
// built apps/web/dist from a push to main, and `next` is gone from every
// dependency tree. Reads the workflow as text: a job is the block under
// `jobs:` that starts at two spaces of indent.
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { WEB_ROOT } from './html'

const REPO_ROOT = path.resolve(WEB_ROOT, '../..')
const WORKFLOW = readFileSync(path.join(REPO_ROOT, '.github/workflows/deploy-web.yaml'), 'utf8')

/** The text of one job under `jobs:`, from its `  <name>:` line to the next job. */
function job(name: string): string {
    const lines = WORKFLOW.split('\n')
    const start = lines.findIndex((line) => line === `  ${name}:`)
    expect(start, `job ${name}`).toBeGreaterThan(-1)
    const rest = lines.slice(start + 1)
    const end = rest.findIndex((line) => /^ {2}[\w-]+:\s*$/.test(line) || /^\S/.test(line))
    return rest.slice(0, end === -1 ? undefined : end).join('\n')
}

/** Source files under apps/web, skipping installs, build output and test fixtures. */
function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        if (['node_modules', 'dist', 'reference', 'public'].includes(name)) return []
        const full = path.join(dir, name)
        if (statSync(full).isDirectory()) return sources(full)
        return /\.(m|c)?[jt]sx?$/.test(name) ? [full] : []
    })
}

describe('CI and dependencies', () => {
    it('AC-9: a pull request builds and tests the site without deploying; a push to main deploys apps/web/dist', () => {
        // Triggers: pull requests (any base) and pushes to main.
        expect(WORKFLOW).toMatch(/^on:\n(?:.*\n)*? {2}pull_request:/m)
        expect(WORKFLOW).toMatch(/^ {2}push:\n {4}branches: \["main"\]/m)

        // The build job runs the site build and its tests, with the Vite env.
        const build = job('build')
        expect(build).not.toMatch(/^ {4}if:.*pull_request/m)
        expect(build).toContain('run: pnpm --filter @rst0070/web build')
        expect(build).toContain('run: pnpm --filter @rst0070/web test')
        expect(build).toMatch(/^ {10}VITE_AI_API_URL: /m)
        expect(build).toMatch(/uses: actions\/upload-pages-artifact@v3\n {8}with:\n {10}path: \.\/apps\/web\/dist/)

        // The deploy job deploys the build only on a push or a manual run.
        const deploy = job('deploy')
        expect(deploy).toMatch(/^ {4}if: github\.event_name == 'push' \|\| github\.event_name == 'workflow_dispatch'$/m)
        expect(deploy).toMatch(/^ {4}needs: build$/m)
        expect(deploy).toContain('uses: actions/deploy-pages@v4')

        // Nothing of the Next build is left: env name, .next cache, name.
        expect(WORKFLOW).not.toMatch(/NEXT_PUBLIC_/)
        expect(WORKFLOW).not.toMatch(/\.next\b/)
        expect(WORKFLOW).not.toMatch(/next\.?js/i)
        expect(WORKFLOW).not.toMatch(/\bout\//)
    })

    it('AC-9: `pnpm why next` in apps/web finds nothing, and no package or file depends on next', () => {
        const why = spawnSync('pnpm', ['why', 'next'], { cwd: WEB_ROOT, encoding: 'utf8' })
        expect(why.status).toBe(0)
        expect(why.stdout).not.toMatch(/next@/)

        const lock = readFileSync(path.join(REPO_ROOT, 'pnpm-lock.yaml'), 'utf8')
        expect(lock).not.toMatch(/^ {2}'?next@/m)
        expect(lock).not.toMatch(/^ {6}next:/m)

        const pkg = JSON.parse(readFileSync(path.join(WEB_ROOT, 'package.json'), 'utf8'))
        expect({ ...pkg.dependencies, ...pkg.devDependencies }).not.toHaveProperty('next')
        expect(JSON.stringify(pkg.scripts)).not.toMatch(/\bnext\b/)

        expect(existsSync(path.join(WEB_ROOT, 'next.config.ts'))).toBe(false)
        const importsNext = sources(WEB_ROOT).filter((file) =>
            /from\s+['"]next(\/[^'"]*)?['"]|require\(['"]next(\/[^'"]*)?['"]\)/.test(readFileSync(file, 'utf8')),
        )
        expect(importsNext).toEqual([])
        // The Next plugin and its generated types, not TypeScript's own "esnext".
        expect(readFileSync(path.join(WEB_ROOT, 'tsconfig.json'), 'utf8')).not.toMatch(/"name": "next"|next-env\.d\.ts|\.next\//)
    })
})
