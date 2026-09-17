import { EmbeddingPort } from '../port/embedding'

/** Embeds each text as [its length, call number], and records every call. */
export class FakeEmbedding implements EmbeddingPort {
    readonly calls: string[][] = []

    async embed(texts: string[]): Promise<number[][]> {
        this.calls.push(texts)
        return texts.map((text) => [text.length, this.calls.length])
    }
}
