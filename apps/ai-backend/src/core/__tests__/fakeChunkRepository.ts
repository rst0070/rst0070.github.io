import { Chunk, DocumentExtent } from '../entity/chunk'
import { ChunkRepository } from '../repository/chunk'

/** Returns preset search results (filtered by slug) and records upserts, searches and truncations. */
export class FakeChunkRepository implements ChunkRepository {
    readonly upserted: (Chunk & { embedding: number[] })[] = []
    readonly searches: { embedding: number[], k: number, filter?: { slug?: string } }[] = []
    readonly truncated: DocumentExtent[][] = []

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

    /** Reports one deletion per chunk of `results` that the extents no longer keep. */
    async truncate(documents: DocumentExtent[]): Promise<{ deleted: number }> {
        this.truncated.push(documents)
        const deleted = documents.flatMap(({ slug, keep }) =>
            this.results.filter((chunk) => chunk.slug === slug && chunk.index >= keep))
        return { deleted: deleted.length }
    }
}

export function makeChunk(slug: string, index: number, text = `${slug} chunk ${index}`): Chunk {
    return { slug, index, title: `Title of ${slug}`, heading: '', url: `/notes/${slug}`, text }
}
