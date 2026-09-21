import { Chunk, DocumentExtent } from '../entity/chunk'
import { EmbeddingPort } from '../port/embedding'
import { ChunkRepository } from '../repository/chunk'

export class ReindexUsecase {
    constructor(
        private readonly chunkRepository: ChunkRepository,
        private readonly embedding: EmbeddingPort,
    ) {}

    /** Embeds each chunk's text and upserts it. Chunks the document no longer has are `prune`'s job. */
    async reindex(chunks: Chunk[]): Promise<{ upserted: number }> {
        if (chunks.length === 0) return { upserted: 0 }

        const vectors = await this.embedding.embed(chunks.map((chunk) => chunk.text))
        await this.chunkRepository.upsert(chunks.map((chunk, i) => ({ ...chunk, embedding: vectors[i] })))
        return { upserted: chunks.length }
    }

    /**
     * Removes the chunks each document no longer has. Called before its chunks
     * are upserted, so it never races an upsert of the same run.
     */
    async prune(documents: DocumentExtent[]): Promise<{ deleted: number }> {
        if (documents.length === 0) return { deleted: 0 }

        return this.chunkRepository.truncate(documents)
    }
}
