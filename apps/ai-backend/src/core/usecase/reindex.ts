import { Chunk } from '../entity/chunk'
import { EmbeddingPort } from '../port/embedding'
import { ChunkRepository } from '../repository/chunk'

export class ReindexUsecase {
    constructor(
        private readonly chunkRepository: ChunkRepository,
        private readonly embedding: EmbeddingPort,
    ) {}

    /** Embeds each chunk's text and upserts it. Vectors of removed chunks are left in place. */
    async reindex(chunks: Chunk[]): Promise<{ upserted: number }> {
        if (chunks.length === 0) return { upserted: 0 }

        const vectors = await this.embedding.embed(chunks.map((chunk) => chunk.text))
        await this.chunkRepository.upsert(chunks.map((chunk, i) => ({ ...chunk, embedding: vectors[i] })))
        return { upserted: chunks.length }
    }
}
