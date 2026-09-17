import { describe, expect, it } from 'vitest'
import { Note } from '@rst0070/content'
import { ChunkingPolicy } from '../config'
import { chunkNote, chunkPortfolio, estimateTokens, truncateUtf8, utf8ByteLength } from '../service/chunking'

const policy: ChunkingPolicy = { minTokens: 20, maxTokens: 60, overlapTokens: 10, maxTextBytes: 8000 }

function note(content: string): Note {
    return {
        slug: '24-06-24-example',
        content,
        metadata: { title: 'Example', date: '2024-06-24', lastmod: '2024-06-24', description: '', tags: '' },
    }
}

/** About `tokens` estimated tokens of English words. */
function words(tokens: number, word = 'word'): string {
    return Array.from({ length: tokens }, () => word).join(' ')
}

describe('chunkNote', () => {
    it('starts a new chunk at a heading once the current chunk is big enough', () => {
        const chunks = chunkNote(note(`## One\n\n${words(25)}\n\n## Two\n\n${words(25)}`), policy)

        expect(chunks.map((chunk) => chunk.heading)).toEqual(['One', 'Two'])
        expect(chunks[1].text).toContain('## Two')
    })

    it('keeps small sections together', () => {
        const chunks = chunkNote(note('## One\n\nshort\n\n## Two\n\nalso short'), policy)

        expect(chunks).toHaveLength(1)
        expect(chunks[0].heading).toBe('One')
    })

    it('tracks the heading path across levels', () => {
        const markdown = `## Setup\n\n${words(25)}\n\n### Install\n\n${words(25)}\n\n## Usage\n\n${words(25)}`
        const chunks = chunkNote(note(markdown), policy)

        expect(chunks.map((chunk) => chunk.heading)).toEqual(['Setup', 'Setup > Install', 'Usage'])
    })

    it('splits long sections by size', () => {
        const paragraphs = Array.from({ length: 6 }, (_, i) => `Paragraph ${i}. ${words(20)}`).join('\n\n')
        const chunks = chunkNote(note(`## Long\n\n${paragraphs}`), policy)

        expect(chunks.length).toBeGreaterThan(1)
        expect(chunks.every((chunk) => chunk.heading === 'Long')).toBe(true)
    })

    it('never splits inside a fenced code block, even one over the size limit', () => {
        const code = ['```mermaid', 'graph TD', '', '## not a heading', '', ...Array.from({ length: 40 }, (_, i) => `  A${i} --> B${i}`), '```'].join('\n')
        const chunks = chunkNote(note(`## Diagram\n\n${words(20)}\n\n${code}\n\n${words(20)}`), policy)

        const withCode = chunks.filter((chunk) => chunk.text.includes('```mermaid'))
        expect(withCode).toHaveLength(1)
        expect(withCode[0].text).toContain(code)
        expect(chunks.every((chunk) => chunk.heading === 'Diagram')).toBe(true)
    })

    it('prefixes each chunk with the title and heading path', () => {
        const chunks = chunkNote(note(`intro ${words(25)}\n\n## Part\n\n### Detail\n\n${words(25)}`), policy)

        expect(chunks[0].text.startsWith('Example\n\nintro')).toBe(true)
        expect(chunks[1].text.startsWith('Example > Part > Detail\n\n')).toBe(true)
    })

    it('fills slug, index, url and date', () => {
        const chunks = chunkNote(note(`## A\n\n${words(25)}\n\n## B\n\n${words(25)}`), policy)

        expect(chunks.map(({ slug, index, title, url, date }) => ({ slug, index, title, url, date }))).toEqual([
            { slug: '24-06-24-example', index: 0, title: 'Example', url: '/notes/24-06-24-example', date: '2024-06-24' },
            { slug: '24-06-24-example', index: 1, title: 'Example', url: '/notes/24-06-24-example', date: '2024-06-24' },
        ])
    })

    it('caps chunk text at the byte limit, counting Korean as 3 bytes a character', () => {
        const korean = '가'.repeat(3000)
        const chunks = chunkNote(note(`\`\`\`text\n${korean}\n\`\`\``), { ...policy, maxTextBytes: 1000 })

        expect(chunks).toHaveLength(1)
        expect(utf8ByteLength(chunks[0].text)).toBeLessThanOrEqual(1000)
        expect(chunks[0].text.endsWith('\n```')).toBe(true)
    })

    it('returns no chunks for empty content', () => {
        expect(chunkNote(note('   \n\n'), policy)).toEqual([])
    })
})

describe('chunkPortfolio', () => {
    it('uses the portfolio slug and url, and no date', () => {
        const chunks = chunkPortfolio('# Name\n\n## Summary\n\nAI engineer.', policy)

        expect(chunks).toHaveLength(1)
        expect(chunks[0]).toMatchObject({ slug: 'portfolio', index: 0, url: '/portfolio', heading: 'Name > Summary' })
        expect(chunks[0]).not.toHaveProperty('date')
    })
})

describe('estimateTokens', () => {
    it('counts about four ASCII characters or one Hangul character per token', () => {
        expect(estimateTokens('abcd'.repeat(10))).toBe(10)
        expect(estimateTokens('한국어')).toBe(3)
    })
})

describe('truncateUtf8', () => {
    it('leaves short text alone and never cuts a character in half', () => {
        expect(truncateUtf8('한국어', 9)).toBe('한국어')
        expect(truncateUtf8('한국어', 8)).toBe('한국')
    })
})
