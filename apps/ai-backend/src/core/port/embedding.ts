export interface EmbeddingPort {
    /** One vector per text, in input order. */
    embed(texts: string[]): Promise<number[][]>
}
