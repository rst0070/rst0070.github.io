import { describe, expect, it } from 'vitest'
import { ReindexUsecase } from '../usecase/reindex'
import { FakeChunkRepository, makeChunk } from './fakeChunkRepository'
import { FakeEmbedding } from './fakeEmbedding'

describe('ReindexUsecase', () => {
    it('embeds every chunk once and upserts each with its own vector', async () => {
        const repository = new FakeChunkRepository()
        const embedding = new FakeEmbedding()
        const chunks = [makeChunk('24-a', 0, 'a'), makeChunk('24-a', 1, 'bb'), makeChunk('24-b', 0, 'ccc')]

        const result = await new ReindexUsecase(repository, embedding).reindex(chunks)

        expect(result).toEqual({ upserted: 3 })
        expect(embedding.calls).toEqual([['a', 'bb', 'ccc']])
        expect(repository.upserted).toEqual([
            { ...chunks[0], embedding: [1, 1] },
            { ...chunks[1], embedding: [2, 1] },
            { ...chunks[2], embedding: [3, 1] },
        ])
    })

    it('does nothing for no chunks', async () => {
        const repository = new FakeChunkRepository()
        const embedding = new FakeEmbedding()

        expect(await new ReindexUsecase(repository, embedding).reindex([])).toEqual({ upserted: 0 })
        expect(embedding.calls).toHaveLength(0)
    })
})
