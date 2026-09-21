import { Chunk, DocumentExtent } from '../entity/chunk'

/** Storage for content chunks and their vectors. A chunk is identified by (slug, index). */
export interface ChunkRepository {
    /** Inserts or replaces each chunk with the same (slug, index). */
    upsert(chunks: (Chunk & { embedding: number[] })[]): Promise<void>
    /** Nearest chunks, best first; `slug` limits the search to one note. */
    searchByVector(embedding: number[], k: number, filter?: { slug?: string }): Promise<Chunk[]>
    /**
     * Removes the stored chunks of each document from `keep` onwards: what a
     * shortened document no longer has, or everything a deleted one had.
     */
    truncate(documents: DocumentExtent[]): Promise<{ deleted: number }>
}
