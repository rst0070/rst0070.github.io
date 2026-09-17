import { Chunk } from '../entity/chunk'
import { sourcesFrom } from './citation'

/**
 * The only system message of a chat turn. Retrieved sources go here rather
 * than into the conversation, so the client's messages reach the model
 * unchanged.
 */
export function buildSystemPrompt(chunks: Chunk[], scope: { slug?: string }): string {
    const sources = sourcesFrom(chunks)
    const current = scope.slug === undefined
        ? undefined
        : sources.findIndex((source) => source.citation.slug === scope.slug)

    const rules = [
        'You answer questions about rst0070.github.io, the personal site of Wonbin Kim (rst0070): its notes and the portfolio.',
        '',
        'Rules:',
        '- Answer only from the sources below. If they do not cover the question, say so plainly instead of guessing.',
        '- Reply in the language of the user\'s latest message.',
        '- Cite the sources you use by number in square brackets, like [1], right after the statement they support.',
        '- Keep answers concise.',
    ]
    if (current !== undefined && current >= 0) {
        const citation = sources[current].citation
        rules.push(`- The reader is on the page "${citation.title}" (${citation.url}), source [${current + 1}]. "This note" or "this post" means that page.`)
    }

    const sourceBlocks = sources.map((source, i) => [
        `[${i + 1}] ${source.citation.title} (${source.citation.url})`,
        ...source.chunks.map((chunk) => chunk.text),
    ].join('\n\n'))

    return [...rules, '', 'Sources:', '', sourceBlocks.join('\n\n---\n\n')].join('\n')
}
