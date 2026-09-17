import { Chunk } from '../core/entity/chunk'
import { ChunkRepository } from '../core/repository/chunk'

/** What this repository uses of a Vectorize binding (V2 `Vectorize` or the older `VectorizeIndex` type). */
export interface VectorizeBinding {
    query(vector: number[], options: VectorizeQueryOptions): Promise<VectorizeMatches>
    upsert(vectors: VectorizeVector[]): Promise<unknown>
}

/** Vectors per upsert through a Workers binding. */
export const UPSERT_BATCH_SIZE = 1000

/** topK limit when metadata is returned. */
const MAX_TOP_K_WITH_METADATA = 50

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
