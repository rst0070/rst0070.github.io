import { describe, expect, it } from 'vitest'
import { Message } from '../entity/chat'
import { ChatError } from '../error/chat'
import { CHAT_POLICY } from '../config'
import { ChatUsecase } from '../usecase/chat'
import { FakeChunkRepository, makeChunk } from './fakeChunkRepository'
import { FakeEmbedding } from './fakeEmbedding'
import { FakeLlm } from './fakeLlm'

const user = (content: string): Message => ({ role: 'user', content })
const assistant = (content: string): Message => ({ role: 'assistant', content })

function setup(results = [makeChunk('24-a', 0), makeChunk('24-b', 3), makeChunk('24-a', 1)]) {
    const repository = new FakeChunkRepository(results)
    const embedding = new FakeEmbedding()
    const llm = new FakeLlm('the answer')
    return { repository, embedding, llm, usecase: new ChatUsecase(repository, embedding, llm) }
}

describe('ChatUsecase.reply', () => {
    it('sends exactly one system message, first, followed by the window unchanged', async () => {
        const { llm, usecase } = setup()
        const messages = [user('u1'), assistant('a1'), user('u2'), assistant('a2'), user('u3'), assistant('a3'), user('u4')]

        await usecase.reply({ messages })

        const sent = llm.calls[0].messages
        expect(sent.filter((message) => message.role === 'system')).toHaveLength(1)
        expect(sent[0].role).toBe('system')
        expect(sent.slice(1)).toEqual(messages.slice(2))
    })

    it('retrieves with the window\'s user messages and passes slug to the repository filter', async () => {
        const { repository, embedding, usecase } = setup()

        await usecase.reply({ messages: [user('what is a'), assistant('a is...'), user('and b?')], slug: '24-a' })

        expect(embedding.calls).toEqual([['and b?\nwhat is a']])
        expect(repository.searches[0].filter).toEqual({ slug: '24-a' })
        expect(repository.searches[0].k).toBe(CHAT_POLICY.topK)
    })

    it('throws no-source when retrieval finds nothing', async () => {
        const { llm, usecase } = setup([])

        await expect(usecase.reply({ messages: [user('hello')] })).rejects.toEqual(new ChatError('no-source'))
        expect(llm.calls).toHaveLength(0)
    })

    it('validates before calling any port', async () => {
        const { embedding, usecase } = setup()

        await expect(usecase.reply({ messages: [assistant('hi')] })).rejects.toEqual(new ChatError('last-not-user'))
        expect(embedding.calls).toHaveLength(0)
    })

    it('returns the completion and citations deduped by slug in rank order', async () => {
        const { usecase } = setup()

        const reply = await usecase.reply({ messages: [user('question')] })

        expect(reply.message).toEqual({ role: 'assistant', content: 'the answer' })
        expect(reply.citations).toEqual([
            { slug: '24-a', title: 'Title of 24-a', url: '/notes/24-a' },
            { slug: '24-b', title: 'Title of 24-b', url: '/notes/24-b' },
        ])
    })
})
