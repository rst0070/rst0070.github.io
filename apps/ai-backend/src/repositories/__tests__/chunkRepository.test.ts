import { describe, expect, it } from 'vitest'
import { Chunk } from '../../core/entity/chunk'
import { UPSERT_BATCH_SIZE, VectorizeBinding, VectorizeChunkRepository, vectorId } from '../chunkRepository'

class FakeVectorize implements VectorizeBinding {
    readonly upserts: VectorizeVector[][] = []
    readonly queries: { vector: number[], options: VectorizeQueryOptions }[] = []

    constructor(private readonly matches: VectorizeMatch[] = []) {}

    async query(vector: number[], options: VectorizeQueryOptions): Promise<VectorizeMatches> {
        this.queries.push({ vector, options })
        return { matches: this.matches, count: this.matches.length }
    }

    async upsert(vectors: VectorizeVector[]): Promise<unknown> {
        this.upserts.push(vectors)
        return { mutationId: 'm' }
    }
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

    it('upserts in batches within the binding limit', async () => {
        const vectorize = new FakeVectorize()
        const chunks = Array.from({ length: UPSERT_BATCH_SIZE + 1 }, (_, index) => ({ ...chunk, index, embedding: [index] }))

        await new VectorizeChunkRepository(vectorize).upsert(chunks)

        expect(vectorize.upserts.map((batch) => batch.length)).toEqual([UPSERT_BATCH_SIZE, 1])
    })
})
