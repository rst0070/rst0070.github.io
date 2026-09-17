// Chunks every published note and the portfolio, and sends the chunks to the
// Worker's POST /admin/reindex, which embeds and upserts them.
//
//   pnpm reindex                  against `wrangler dev` (http://localhost:8787)
//   AI_BACKEND_URL=https://... pnpm reindex
//   pnpm reindex --dry-run        chunk only and print statistics
//
// REINDEX_SECRET is read from the environment; `pnpm reindex` also loads it
// from .dev.vars.
//
// Upsert only: vectors of deleted or shortened notes stay in the index.

import path from 'node:path'
import { findAllNotes, readPortfolio } from '@rst0070/content/node'
import { Chunk } from '../src/core/entity/chunk'
import { chunkNote, chunkPortfolio, estimateTokens, utf8ByteLength } from '../src/core/service/chunking'

const DEFAULT_BACKEND_URL = 'http://localhost:8787'
const CONTENT_ROOT = path.resolve(import.meta.dirname, '../../../content')
/** Chunks per request, well under the Worker's limit and CPU budget. */
const BATCH_SIZE = 50

async function main(): Promise<void> {
    const dryRun = process.argv.includes('--dry-run')

    const notes = findAllNotes(CONTENT_ROOT)
    const chunks: Chunk[] = [
        ...notes.flatMap((note) => chunkNote(note)),
        ...chunkPortfolio(readPortfolio(CONTENT_ROOT)),
    ]
    printStatistics(notes.length, chunks)
    if (dryRun) return

    const url = new URL('/admin/reindex', process.env.AI_BACKEND_URL || DEFAULT_BACKEND_URL)
    const secret = process.env.REINDEX_SECRET
    if (secret === undefined || secret === '') throw new Error('Set REINDEX_SECRET (or put it in .dev.vars)')

    let upserted = 0
    for (let start = 0; start < chunks.length; start += BATCH_SIZE) {
        const batch = chunks.slice(start, start + BATCH_SIZE)
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${secret}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ chunks: batch }),
        })
        if (!response.ok) {
            throw new Error(`POST ${url} failed at chunk ${start}: ${response.status} ${await response.text()}`)
        }
        upserted += ((await response.json()) as { upserted: number }).upserted
        console.log(`upserted ${upserted}/${chunks.length}`)
    }
    console.log('Done. New vectors can take a few seconds to become searchable.')
}

function printStatistics(noteCount: number, chunks: Chunk[]): void {
    const tokens = chunks.map((chunk) => estimateTokens(chunk.text))
    const bytes = chunks.map((chunk) => utf8ByteLength(chunk.text))
    console.log([
        `${noteCount} notes + portfolio → ${chunks.length} chunks`,
        `estimated tokens: total ${sum(tokens)}, max ${Math.max(...tokens)}`,
        `text bytes: max ${Math.max(...bytes)}`,
    ].join('\n'))
}

function sum(values: number[]): number {
    return values.reduce((total, value) => total + value, 0)
}

main().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
})
