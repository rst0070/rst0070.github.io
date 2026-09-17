import { Chunk } from '../entity/chunk'
import { ChunkRepository } from '../repository/chunk'

/** Returns preset search results (filtered by slug) and records upserts and searches. */
export class FakeChunkRepository implements ChunkRepository {
    readonly upserted: (Chunk & { embedding: number[] })[] = []
    readonly searches: { embedding: number[], k: number, filter?: { slug?: string } }[] = []

    constructor(private readonly results: Chunk[] = []) {}

    async upsert(chunks: (Chunk & { embedding: number[] })[]): Promise<void> {
        this.upserted.push(...chunks)
    }

    async searchByVector(embedding: number[], k: number, filter?: { slug?: string }): Promise<Chunk[]> {
        this.searches.push({ embedding, k, filter })
        return this.results
            .filter((chunk) => filter?.slug === undefined || chunk.slug === filter.slug)
            .slice(0, k)
    }
}

export function makeChunk(slug: string, index: number, text = `${slug} chunk ${index}`): Chunk {
    return { slug, index, title: `Title of ${slug}`, heading: '', url: `/notes/${slug}`, text }
}
