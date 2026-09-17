// Keeps the Vectorize index in step with the content: chunks documents and
// sends them to the Worker's POST /admin/reindex, and tells POST
// /admin/reindex/prune how many chunks each document keeps so leftovers of
// shortened, deleted, renamed or unpublished documents are removed.
//
//   pnpm reindex                        every published document
//   pnpm reindex --paths <path>...      only these content paths
//   pnpm reindex --paths-from <file>    same, one path per line ("-" reads stdin)
//   pnpm reindex --remove <slug>...     also remove these slugs
//   pnpm reindex --dry-run              print the plan, send nothing
//
// Paths are repo-relative (`content/notes/26/06-02-x.md`) or absolute, which is
// what `git diff --name-only` gives. A path whose file is gone or whose name
// starts with "_" (a draft) removes that document instead of indexing it.
//
//   AI_BACKEND_URL=https://... pnpm reindex     against the deployed Worker
//
// REINDEX_SECRET is read from the environment; `pnpm reindex` also loads it
// from .dev.vars.

import fs from 'node:fs'
import path from 'node:path'
import { notePathToSlug } from '@rst0070/content'
import { findAllNotes, readPortfolio } from '@rst0070/content/node'
import { Chunk } from '../src/core/entity/chunk'
import { chunkNote, chunkPortfolio, estimateTokens, PORTFOLIO_SLUG, utf8ByteLength } from '../src/core/service/chunking'

const DEFAULT_BACKEND_URL = 'http://localhost:8787'
const CONTENT_ROOT = path.resolve(import.meta.dirname, '../../../content')
const REPO_ROOT = path.resolve(CONTENT_ROOT, '..')
/** Chunks per upsert request, well under the Worker's limits and CPU budget. */
const UPSERT_BATCH_SIZE = 50
/** Documents per prune request, matching the Worker's limit. */
const PRUNE_BATCH_SIZE = 20

const FLAGS = ['--dry-run', '--paths', '--paths-from', '--remove']

interface Options {
    dryRun: boolean
    /** Content paths to sync, or undefined for every published document. */
    paths?: string[]
    /** Slugs to remove whatever the content says. */
    remove: string[]
}

/** What each selected document should look like in the index after this run. */
interface Plan {
    /** Documents to index, with every chunk they have now. */
    sync: { slug: string, chunks: Chunk[] }[]
    /** Slugs with no content any more: deleted, renamed away or turned into a draft. */
    remove: string[]
}

async function main(): Promise<void> {
    const options = parseArgs(process.argv.slice(2))
    const plan = options.paths === undefined ? planEverything(options) : planFor(options.paths, options.remove)
    printPlan(plan)
    if (options.dryRun) return
    if (plan.sync.length === 0 && plan.remove.length === 0) {
        console.log('Nothing to do.')
        return
    }

    const backend = new Backend()
    // Prune before upserting: it removes the chunk indexes a document no
    // longer has, so it must not see this run's own upserts.
    const documents = [
        ...plan.sync.map((document) => ({ slug: document.slug, keep: document.chunks.length })),
        ...plan.remove.map((slug) => ({ slug, keep: 0 })),
    ]
    let deleted = 0
    for (const batch of batches(documents, PRUNE_BATCH_SIZE)) {
        deleted += (await backend.post<{ deleted: number }>('/admin/reindex/prune', { documents: batch })).deleted
    }
    console.log(`pruned ${deleted} stale chunks`)

    const chunks = plan.sync.flatMap((document) => document.chunks)
    let upserted = 0
    for (const batch of batches(chunks, UPSERT_BATCH_SIZE)) {
        upserted += (await backend.post<{ upserted: number }>('/admin/reindex', { chunks: batch })).upserted
        console.log(`upserted ${upserted}/${chunks.length}`)
    }
    console.log('Done. Changes can take a few seconds to show up in search.')
}

function parseArgs(argv: string[]): Options {
    const unknown = argv.find((arg) => arg.startsWith('--') && !FLAGS.includes(arg))
    if (unknown !== undefined) throw new Error(`Unknown option ${unknown}. See the comment in script/reindex.ts.`)

    const paths = valuesOf(argv, '--paths')
    const listFiles = valuesOf(argv, '--paths-from')
    const fromLists = listFiles?.flatMap(readPathList)
    return {
        dryRun: argv.includes('--dry-run'),
        ...(paths === undefined && fromLists === undefined ? {} : { paths: [...paths ?? [], ...fromLists ?? []] }),
        remove: valuesOf(argv, '--remove') ?? [],
    }
}

/** The values after `flag` up to the next option, or undefined if the flag is absent. */
function valuesOf(argv: string[], flag: string): string[] | undefined {
    const at = argv.indexOf(flag)
    if (at < 0) return undefined

    const rest = argv.slice(at + 1)
    const next = rest.findIndex((arg) => arg.startsWith('--'))
    return next < 0 ? rest : rest.slice(0, next)
}

function readPathList(file: string): string[] {
    const content = file === '-' ? fs.readFileSync(0, 'utf-8') : fs.readFileSync(file, 'utf-8')
    return content.split('\n').map((line) => line.trim()).filter((line) => line !== '')
}

function planEverything(options: Options): Plan {
    const notes = findAllNotes(CONTENT_ROOT)
    // A checkout without content would otherwise look like an empty site.
    if (notes.length === 0) throw new Error(`No published notes under ${CONTENT_ROOT}`)

    return {
        sync: [
            ...notes.map((note) => ({ slug: note.slug, chunks: chunkNote(note) })),
            { slug: PORTFOLIO_SLUG, chunks: chunkPortfolio(readPortfolio(CONTENT_ROOT)) },
        ],
        remove: options.remove,
    }
}

function planFor(contentPaths: string[], removeSlugs: string[]): Plan {
    const wanted = new Set<string>()
    const remove = new Set(removeSlugs)
    for (const contentPath of contentPaths) {
        const document = documentOf(contentPath)
        if (document === undefined) {
            console.log(`ignored (not indexed content): ${contentPath}`)
            continue
        }
        if (document.published) wanted.add(document.slug)
        else remove.add(document.slug)
    }

    const sync: Plan['sync'] = []
    if (wanted.has(PORTFOLIO_SLUG)) {
        wanted.delete(PORTFOLIO_SLUG)
        sync.push({ slug: PORTFOLIO_SLUG, chunks: chunkPortfolio(readPortfolio(CONTENT_ROOT)) })
    }
    if (wanted.size > 0) {
        const notes = new Map(findAllNotes(CONTENT_ROOT).map((note) => [note.slug, note]))
        for (const slug of wanted) {
            const note = notes.get(slug)
            // The file exists, so a missing slug means the loaders and the path
            // rule disagree; indexing it would store chunks under a slug the
            // site does not serve.
            if (note === undefined) throw new Error(`No published note is loaded for slug "${slug}"`)
            sync.push({ slug, chunks: chunkNote(note) })
        }
    }
    // A slug that is being indexed is not also removed, whatever --remove said.
    return { sync, remove: [...remove].filter((slug) => !sync.some((document) => document.slug === slug)) }
}

/**
 * The document a content path belongs to, or undefined for a path that is not
 * indexed. `published` is false when the file is gone (deleted or renamed away)
 * or is a draft, which is how a document comes to keep no chunks.
 */
function documentOf(contentPath: string): { slug: string, published: boolean } | undefined {
    const file = path.resolve(REPO_ROOT, contentPath)
    const relative = path.relative(CONTENT_ROOT, file).split(path.sep).join('/')
    if (!relative.endsWith('.md') || relative.startsWith('../')) return undefined

    const draft = path.basename(relative).startsWith('_')
    const published = !draft && fs.existsSync(file)
    if (relative === 'portfolio.md') return { slug: PORTFOLIO_SLUG, published }
    if (!relative.startsWith('notes/')) return undefined
    // A draft's slug was never indexed under that name; its published path, if
    // it had one, arrives as its own (now missing) entry in the path list.
    return draft ? undefined : { slug: notePathToSlug(relative), published }
}

class Backend {
    private readonly url = process.env.AI_BACKEND_URL || DEFAULT_BACKEND_URL
    private readonly secret = process.env.REINDEX_SECRET

    async post<T>(pathname: string, body: unknown): Promise<T> {
        if (this.secret === undefined || this.secret === '') {
            throw new Error('Set REINDEX_SECRET (or put it in .dev.vars)')
        }

        const url = new URL(pathname, this.url)
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.secret}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
        if (!response.ok) throw new Error(`POST ${url} failed: ${response.status} ${await response.text()}`)
        return await response.json() as T
    }
}

function batches<T>(values: T[], size: number): T[][] {
    const result: T[][] = []
    for (let start = 0; start < values.length; start += size) {
        result.push(values.slice(start, start + size))
    }
    return result
}

function printPlan(plan: Plan): void {
    const chunks = plan.sync.flatMap((document) => document.chunks)
    const lines = [`${plan.sync.length} documents to index → ${chunks.length} chunks`]
    if (chunks.length > 0) {
        const tokens = chunks.map((chunk) => estimateTokens(chunk.text))
        const bytes = chunks.map((chunk) => utf8ByteLength(chunk.text))
        lines.push(
            `estimated tokens: total ${sum(tokens)}, max ${Math.max(...tokens)}`,
            `text bytes: max ${Math.max(...bytes)}`,
        )
    }
    if (plan.remove.length > 0) lines.push(`${plan.remove.length} to remove: ${plan.remove.join(', ')}`)
    console.log(lines.join('\n'))
}

function sum(values: number[]): number {
    return values.reduce((total, value) => total + value, 0)
}

main().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
})
