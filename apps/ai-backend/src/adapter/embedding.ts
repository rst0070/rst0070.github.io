import { EmbeddingPort } from '../core/port/embedding'
import { ModelError } from '../core/error/model'
import { runModel } from './workersAiError'

export interface EmbeddingModel {
    id: string
    dimensions: number
}

/** Texts per call accepted by @cf/baai/bge-m3. */
const MAX_TEXTS_PER_CALL = 100

export class WorkersAiEmbeddingAdapter implements EmbeddingPort {
    constructor(
        private readonly ai: Ai,
        private readonly model: EmbeddingModel,
    ) {}

    async embed(texts: string[]): Promise<number[][]> {
        const vectors: number[][] = []
        for (let start = 0; start < texts.length; start += MAX_TEXTS_PER_CALL) {
            const batch = texts.slice(start, start + MAX_TEXTS_PER_CALL)
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
