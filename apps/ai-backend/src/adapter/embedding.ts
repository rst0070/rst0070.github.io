import { EmbeddingPort } from '../core/port/embedding'
import { ModelError } from '../core/error/model'
import { runModel } from './workersAiError'

export interface EmbeddingModel {
    id: string
    dimensions: number
}

/** Texts per call accepted by @cf/baai/bge-m3. */
const MAX_TEXTS_PER_CALL = 100

/**
 * Token budget per bge-m3 call. The model's 60,000-token context covers the
 * whole call, counted as texts × the longest text (50 texts with a longest of
 * 1,890 tokens fails with "3030: Max context reached 94500 tokens"). Kept
 * below 60,000 because the count per text is only an upper-bound estimate.
 */
const MAX_TOKENS_PER_CALL = 50_000

export class WorkersAiEmbeddingAdapter implements EmbeddingPort {
    constructor(
        private readonly ai: Ai,
        private readonly model: EmbeddingModel,
    ) {}

    async embed(texts: string[]): Promise<number[][]> {
        const vectors: number[][] = []
        for (const batch of batches(texts)) {
            // Model ids are plain strings from the catalog, so this uses the
            // binding's untyped overload and the output is checked below.
            const output = await runModel(() => this.ai.run(this.model.id, { text: batch }))
            vectors.push(...this.readVectors(output, batch.length))
        }
        return vectors
    }

    /** bge-m3 returns `{ shape: [n, dimensions], data: number[][] }`. */
    private readVectors(output: Record<string, unknown>, count: number): number[][] {
        const data = output.data
        const valid = Array.isArray(data)
            && data.length === count
            && data.every((vector) => Array.isArray(vector)
                && vector.length === this.model.dimensions
                && vector.every((value) => typeof value === 'number'))
        if (!valid) {
            throw new ModelError('unknown', `Unexpected embedding response from ${this.model.id}`)
        }
        return data as number[][]
    }
}

/**
 * Consecutive texts grouped so that each call stays within MAX_TEXTS_PER_CALL
 * and MAX_TOKENS_PER_CALL. A single text over the budget still goes alone.
 */
export function batches(texts: string[]): string[][] {
    const result: string[][] = []
    let batch: string[] = []
    let longest = 0
    for (const text of texts) {
        const tokens = maxTokens(text)
        const nextLongest = Math.max(longest, tokens)
        if (batch.length > 0 && (
            batch.length === MAX_TEXTS_PER_CALL
            || (batch.length + 1) * nextLongest > MAX_TOKENS_PER_CALL
        )) {
            result.push(batch)
            batch = []
            longest = 0
        }
        batch.push(text)
        longest = Math.max(longest, tokens)
    }
    if (batch.length > 0) result.push(batch)
    return result
}

/**
 * Upper bound on bge-m3 tokens for a text: its XLM-RoBERTa SentencePiece
 * tokens each cover at least one character, plus the start and end tokens.
 */
function maxTokens(text: string): number {
    return [...text].length + 2
}
