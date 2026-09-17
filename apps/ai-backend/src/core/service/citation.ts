import { Citation } from '../entity/chat'
import { Chunk } from '../entity/chunk'

export interface Source {
    citation: Citation
    /** This source's retrieved chunks, in document order. */
    chunks: Chunk[]
}

/**
 * Retrieved chunks grouped into one source per slug, ordered by each slug's
 * best-ranked chunk. The system prompt numbers sources in this order, so a
 * citation's position matches its number in the answer.
 */
export function sourcesFrom(chunks: Chunk[]): Source[] {
    const sources = new Map<string, Source>()
    for (const chunk of chunks) {
        let source = sources.get(chunk.slug)
        if (source === undefined) {
            source = { citation: { slug: chunk.slug, title: chunk.title, url: chunk.url }, chunks: [] }
            sources.set(chunk.slug, source)
        }
        source.chunks.push(chunk)
    }
    return [...sources.values()].map((source) => ({
        citation: source.citation,
        chunks: [...source.chunks].sort((a, b) => a.index - b.index),
    }))
}

/** One citation per slug, in rank order. */
export function citationsFrom(chunks: Chunk[]): Citation[] {
    return sourcesFrom(chunks).map((source) => source.citation)
}
