import { describe, expect, it } from 'vitest'
import { buildSystemPrompt } from '../service/prompt'
import { makeChunk } from './fakeChunkRepository'

describe('buildSystemPrompt', () => {
    const chunks = [makeChunk('24-a', 2, 'A second'), makeChunk('24-b', 0, 'B first'), makeChunk('24-a', 0, 'A first')]

    it('numbers one source per slug in rank order, with title, URL and chunks in document order', () => {
        const prompt = buildSystemPrompt(chunks, {})

        expect(prompt).toContain('[1] Title of 24-a (/notes/24-a)\n\nA first\n\nA second')
        expect(prompt).toContain('[2] Title of 24-b (/notes/24-b)\n\nB first')
        expect(prompt).not.toContain('The reader is on')
    })

    it('states the grounding and language rules', () => {
        const prompt = buildSystemPrompt(chunks, {})

        expect(prompt).toContain('Answer only from the sources')
        expect(prompt).toContain('language of the user\'s latest message')
    })

    it('names the page the reader is on when scoped to a slug', () => {
        expect(buildSystemPrompt(chunks, { slug: '24-b' })).toContain('The reader is on the page "Title of 24-b" (/notes/24-b), source [2]')
    })
})
