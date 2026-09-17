import { describe, expect, it } from 'vitest'
import { Chunk } from '../../core/entity/chunk'
import {
    MAX_DOCUMENT_CHUNKS,
    PROBE_BLOCK_SIZE,
    UPSERT_BATCH_SIZE,
    VectorizeBinding,
    VectorizeChunkRepository,
    vectorId,
} from '../chunkRepository'

class FakeVectorize implements VectorizeBinding {
    readonly upserts: VectorizeVector[][] = []
    readonly queries: { vector: number[], options: VectorizeQueryOptions }[] = []
    readonly lookups: string[][] = []
    readonly deletes: string[][] = []
    private readonly stored: Set<string>

    constructor(private readonly matches: VectorizeMatch[] = [], stored: Iterable<string> = []) {
        this.stored = new Set(stored)
    }

    async query(vector: number[], options: VectorizeQueryOptions): Promise<VectorizeMatches> {
        this.queries.push({ vector, options })
        return { matches: this.matches, count: this.matches.length }
    }

    async upsert(vectors: VectorizeVector[]): Promise<unknown> {
        this.upserts.push(vectors)
        return { mutationId: 'm' }
    }

    async getByIds(ids: string[]): Promise<VectorizeVector[]> {
        this.lookups.push(ids)
        return ids.filter((id) => this.stored.has(id)).map((id) => ({ id, values: [] }))
    }

    async deleteByIds(ids: string[]): Promise<unknown> {
        this.deletes.push(ids)
        for (const id of ids) this.stored.delete(id)
        return { mutationId: 'm' }
    }
}

/** IDs of `slug`'s chunks with indexes in [from, to). */
function idsOf(slug: string, from: number, to: number): Promise<string[]> {
    return Promise.all(Array.from({ length: to - from }, (_, i) => vectorId(slug, from + i)))
}

const chunk: Chunk = {
    slug: '26-04-28-utilize-slm',
    index: 3,
    title: 'What a 0.8B Model Can\'t Do',
    heading: 'Attempt 2 > Call 2',
    url: '/notes/26-04-28-utilize-slm',
    date: '2026-04-28',
    text: '한국어와 English',
}

describe('vectorId', () => {
    it('is deterministic, distinct per chunk and at most 64 bytes', async () => {
        const id = await vectorId(chunk.slug, chunk.index)

        expect(id).toBe(await vectorId(chunk.slug, chunk.index))
        expect(id).not.toBe(await vectorId(chunk.slug, chunk.index + 1))
        expect(id).toMatch(/^[0-9a-f]{64}$/)
    })
})

describe('VectorizeChunkRepository', () => {
    it('upserts with the chunk ID and metadata, and maps query matches back to chunks', async () => {
        const upsertTarget = new FakeVectorize()
        await new VectorizeChunkRepository(upsertTarget).upsert([{ ...chunk, embedding: [0.1, 0.2] }])
        const [vector] = upsertTarget.upserts[0]

        expect(vector.id).toBe(await vectorId(chunk.slug, chunk.index))
        expect(vector.values).toEqual([0.1, 0.2])

        const portfolio = { slug: 'portfolio', index: 0, title: 'Portfolio', heading: '', url: '/portfolio', text: 'p' }
        const queryTarget = new FakeVectorize([
            { id: vector.id, score: 0.9, metadata: vector.metadata },
            { id: 'p', score: 0.8, metadata: portfolio },
        ])
        const found = await new VectorizeChunkRepository(queryTarget).searchByVector([0.1, 0.2], 5)

        expect(found).toEqual([chunk, portfolio])
        expect(queryTarget.queries[0].options).toEqual({ topK: 5, returnMetadata: 'all' })
    })

    it('passes the slug filter', async () => {
        const vectorize = new FakeVectorize()

        await new VectorizeChunkRepository(vectorize).searchByVector([1], 5, { slug: chunk.slug })

        expect(vectorize.queries[0].options).toEqual({ topK: 5, returnMetadata: 'all', filter: { slug: chunk.slug } })
    })

    it('skips matches without usable metadata', async () => {
        const vectorize = new FakeVectorize([{ id: 'x', score: 1 }, { id: 'y', score: 1, metadata: { slug: 's' } }])

        expect(await new VectorizeChunkRepository(vectorize).searchByVector([1], 5)).toEqual([])
    })

    it('truncate removes the chunks a shortened document no longer has', async () => {
        const stored = await idsOf('24-a', 0, 5)
        const vectorize = new FakeVectorize([], stored)

        const result = await new VectorizeChunkRepository(vectorize).truncate([{ slug: '24-a', keep: 2 }])

        expect(result).toEqual({ deleted: 3 })
        expect(vectorize.deletes).toEqual([stored.slice(2)])
    })

    it('truncate with keep 0 removes a whole document', async () => {
        const stored = await idsOf('24-a', 0, 3)
        const vectorize = new FakeVectorize([], [...stored, ...await idsOf('24-b', 0, 2)])

        const result = await new VectorizeChunkRepository(vectorize).truncate([{ slug: '24-a', keep: 0 }])

        expect(result).toEqual({ deleted: 3 })
        expect(vectorize.deletes).toEqual([stored])
    })

    it('truncate deletes nothing when the document has no leftovers', async () => {
        const vectorize = new FakeVectorize([], await idsOf('24-a', 0, 3))

        expect(await new VectorizeChunkRepository(vectorize).truncate([{ slug: '24-a', keep: 3 }])).toEqual({ deleted: 0 })
        // One probe found nothing, so no further block was looked up.
        expect(vectorize.lookups).toHaveLength(1)
        expect(vectorize.deletes).toEqual([])
    })

    it('truncate keeps probing past a full block and stops at the first empty one', async () => {
        const last = PROBE_BLOCK_SIZE + 8
        const stored = await idsOf('24-a', 0, last)
        const vectorize = new FakeVectorize([], stored)

        const result = await new VectorizeChunkRepository(vectorize).truncate([{ slug: '24-a', keep: 0 }])

        expect(result).toEqual({ deleted: last })
        expect(vectorize.lookups).toHaveLength(3)
        expect(vectorize.deletes).toEqual([stored])
    })

    it('truncate stops at the highest chunk index and deletes within the binding limit', async () => {
        const stored = [
            ...await idsOf('24-a', 0, MAX_DOCUMENT_CHUNKS),
            ...await idsOf('24-b', 0, MAX_DOCUMENT_CHUNKS),
        ]
        const vectorize = new FakeVectorize([], stored)

        const result = await new VectorizeChunkRepository(vectorize)
            .truncate([{ slug: '24-a', keep: 0 }, { slug: '24-b', keep: 0 }])

        expect(result).toEqual({ deleted: stored.length })
        expect(vectorize.lookups).toHaveLength(2 * MAX_DOCUMENT_CHUNKS / PROBE_BLOCK_SIZE)
        expect(vectorize.deletes.map((batch) => batch.length))
            .toEqual([UPSERT_BATCH_SIZE, stored.length - UPSERT_BATCH_SIZE])
    })

    it('upserts in batches within the binding limit', async () => {
        const vectorize = new FakeVectorize()
        const chunks = Array.from({ length: UPSERT_BATCH_SIZE + 1 }, (_, index) => ({ ...chunk, index, embedding: [index] }))

        await new VectorizeChunkRepository(vectorize).upsert(chunks)

        expect(vectorize.upserts.map((batch) => batch.length)).toEqual([UPSERT_BATCH_SIZE, 1])
    })
})
