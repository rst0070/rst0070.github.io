import { describe, expect, it } from 'vitest'
import { batches, WorkersAiEmbeddingAdapter } from '../embedding'

const model = { id: '@cf/baai/bge-m3', dimensions: 2 }

class FakeAi {
    readonly calls: string[][] = []

    async run(_model: string, inputs: { text: string[] }): Promise<unknown> {
        this.calls.push(inputs.text)
        return { shape: [inputs.text.length, 2], data: inputs.text.map((text) => [text.length, this.calls.length]) }
    }
}

describe('batches', () => {
    it('keeps texts × the longest text within the per-call token budget', () => {
        // 50 texts like the reindex script sends, one of them long.
        const texts = Array.from({ length: 50 }, (_, i) => (i === 10 ? 'x'.repeat(6000) : 'short text'))

        const result = batches(texts)

        expect(result.flat()).toEqual(texts)
        for (const batch of result) {
            const longest = Math.max(...batch.map((text) => text.length + 2))
            expect(batch.length * longest).toBeLessThanOrEqual(50_000)
        }
    })

    it('packs short texts up to 100 per call', () => {
        expect(batches(Array.from({ length: 250 }, () => 'a')).map((batch) => batch.length)).toEqual([100, 100, 50])
    })

    it('counts characters, not UTF-16 units or bytes', () => {
        // 1,000 Hangul characters: 3,000 UTF-8 bytes, 1,002 tokens at most, so 49 fit.
        expect(batches(Array.from({ length: 60 }, () => '가'.repeat(1000))).map((batch) => batch.length)).toEqual([49, 11])
    })
})

describe('WorkersAiEmbeddingAdapter', () => {
    it('returns one vector per text in input order across calls', async () => {
        const ai = new FakeAi()
        const texts = ['a', 'x'.repeat(30_000), 'bb', 'ccc']

        const vectors = await new WorkersAiEmbeddingAdapter(ai as unknown as Ai, model).embed(texts)

        expect(ai.calls.length).toBeGreaterThan(1)
        expect(vectors.map(([length]) => length)).toEqual([1, 30_000, 2, 3])
    })
})
