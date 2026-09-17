import { Chunk } from '../entity/chunk'

/** Storage for content chunks and their vectors. A chunk is identified by (slug, index). */
export interface ChunkRepository {
    /** Inserts or replaces each chunk with the same (slug, index). */
    upsert(chunks: (Chunk & { embedding: number[] })[]): Promise<void>
    /** Nearest chunks, best first; `slug` limits the search to one note. */
    searchByVector(embedding: number[], k: number, filter?: { slug?: string }): Promise<Chunk[]>
}
