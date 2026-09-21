import { Chunk, DocumentExtent } from '../core/entity/chunk'
import { ChunkRepository } from '../core/repository/chunk'

/** What this repository uses of a Vectorize binding (V2 `Vectorize` or the older `VectorizeIndex` type). */
export interface VectorizeBinding {
    query(vector: number[], options: VectorizeQueryOptions): Promise<VectorizeMatches>
    upsert(vectors: VectorizeVector[]): Promise<unknown>
    getByIds(ids: string[]): Promise<VectorizeVector[]>
    deleteByIds(ids: string[]): Promise<unknown>
}

/** Vectors per upsert or delete through a Workers binding. */
export const UPSERT_BATCH_SIZE = 1000

/** topK limit when metadata is returned. */
const MAX_TOP_K_WITH_METADATA = 50

/**
 * IDs per `getByIds` call. More than this is rejected by Vectorize with
 * VECTOR_GET_ERROR (code = 40007), "too many ids in payload".
 */
export const MAX_GET_BY_IDS = 20

/**
 * Consecutive chunk indexes looked up per probe while searching for leftovers.
 * At most MAX_GET_BY_IDS, and a divisor of MAX_DOCUMENT_CHUNKS so the last
 * probe ends exactly on it.
 */
export const PROBE_BLOCK_SIZE = 16

/**
 * Highest chunk index a document can have. Probing stops here, so a document
 * that somehow grew past it would keep its tail. The largest document today is
 * the portfolio at 54 chunks.
 */
export const MAX_DOCUMENT_CHUNKS = 512

export class VectorizeChunkRepository implements ChunkRepository {
    constructor(private readonly vectorize: VectorizeBinding) {}

    async upsert(chunks: (Chunk & { embedding: number[] })[]): Promise<void> {
        for (let start = 0; start < chunks.length; start += UPSERT_BATCH_SIZE) {
            const batch = chunks.slice(start, start + UPSERT_BATCH_SIZE)
            const vectors = await Promise.all(batch.map(async (chunk) => ({
                id: await vectorId(chunk.slug, chunk.index),
                values: chunk.embedding,
                metadata: toMetadata(chunk),
            })))
            await this.vectorize.upsert(vectors)
        }
    }

    async searchByVector(embedding: number[], k: number, filter?: { slug?: string }): Promise<Chunk[]> {
        const result = await this.vectorize.query(embedding, {
            topK: Math.min(k, MAX_TOP_K_WITH_METADATA),
            returnMetadata: 'all',
            // The `slug` metadata index must exist before vectors are inserted.
            ...(filter?.slug === undefined ? {} : { filter: { slug: filter.slug } }),
        })
        return result.matches.flatMap((match) => {
            const chunk = fromMetadata(match.metadata)
            return chunk === undefined ? [] : [chunk]
        })
    }

    async truncate(documents: DocumentExtent[]): Promise<{ deleted: number }> {
        const stale: string[] = []
        for (const { slug, keep } of documents) {
            stale.push(...await this.staleIds(slug, keep))
        }
        for (let start = 0; start < stale.length; start += UPSERT_BATCH_SIZE) {
            await this.vectorize.deleteByIds(stale.slice(start, start + UPSERT_BATCH_SIZE))
        }
        return { deleted: stale.length }
    }

    /**
     * IDs of the chunks stored for `slug` from index `keep` onwards. Vectorize
     * cannot list an index, but a chunk's ID follows from (slug, index), so
     * this looks up a block of consecutive indexes at a time and stops at the
     * first block that holds nothing.
     */
    private async staleIds(slug: string, keep: number): Promise<string[]> {
        const found: string[] = []
        for (let start = keep; start < MAX_DOCUMENT_CHUNKS; start += PROBE_BLOCK_SIZE) {
            const end = Math.min(start + PROBE_BLOCK_SIZE, MAX_DOCUMENT_CHUNKS)
            const indexes = Array.from({ length: end - start }, (_, i) => start + i)
            const ids = await Promise.all(indexes.map((index) => vectorId(slug, index)))
            const vectors = await this.vectorize.getByIds(ids)
            if (vectors.length === 0) break
            found.push(...vectors.map((vector) => vector.id))
        }
        return found
    }
}

/**
 * Hex SHA-256 of "slug:index": 64 characters, Vectorize's ID limit, and the
 * same for the same chunk, so re-indexing replaces vectors instead of adding.
 */
export async function vectorId(slug: string, index: number): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${slug}:${index}`))
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function toMetadata(chunk: Chunk): Record<string, VectorizeVectorMetadata> {
    return {
        slug: chunk.slug,
        index: chunk.index,
        title: chunk.title,
        heading: chunk.heading,
        url: chunk.url,
        ...(chunk.date === undefined ? {} : { date: chunk.date }),
        text: chunk.text,
    }
}

function fromMetadata(metadata: Record<string, VectorizeVectorMetadata> | undefined): Chunk | undefined {
    if (metadata === undefined) return undefined
    const { slug, index, title, heading, url, date, text } = metadata
    if (typeof slug !== 'string' || typeof index !== 'number' || typeof title !== 'string'
        || typeof heading !== 'string' || typeof url !== 'string' || typeof text !== 'string') {
        return undefined
    }
    return {
        slug,
        index,
        title,
        heading,
        url,
        ...(typeof date === 'string' ? { date } : {}),
        text,
    }
}
