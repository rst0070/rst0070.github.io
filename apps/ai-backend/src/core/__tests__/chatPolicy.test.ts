import { describe, expect, it } from 'vitest'
import { Message } from '../entity/chat'
import { ChatError } from '../error/chat'
import { assertChattable, contextWindow, retrievalQuery } from '../usecase/chat'

const user = (content: string): Message => ({ role: 'user', content })
const assistant = (content: string): Message => ({ role: 'assistant', content })

describe('contextWindow', () => {
    it('keeps the last messages up to the size', () => {
        const messages = [assistant('a0'), user('u1'), user('u2'), assistant('a2'), user('u3'), assistant('a3'), user('u4')]
        expect(contextWindow(messages, 6)).toEqual(messages.slice(-6))
    })

    it('drops an assistant message left first by the cut', () => {
        const messages = [user('u1'), assistant('a1'), user('u2'), assistant('a2'), user('u3'), assistant('a3'), user('u4')]
        expect(contextWindow(messages, 6)).toEqual(messages.slice(-5))
    })

    it('passes shorter conversations through', () => {
        const messages = [user('u1'), assistant('a1'), user('u2')]
        expect(contextWindow(messages, 6)).toEqual(messages)
    })
})

describe('retrievalQuery', () => {
    it('uses user messages only, newest first', () => {
        const window = [user('first question'), assistant('long answer'), user('follow-up')]
        expect(retrievalQuery(window, { maxRetrievalQueryLength: 1000 })).toBe('follow-up\nfirst question')
    })

    it('truncates the oldest text, never the current question', () => {
        const window = [user('old question'), assistant('answer'), user('current')]
        expect(retrievalQuery(window, { maxRetrievalQueryLength: 12 })).toBe('current\nold ')
    })
})

describe('assertChattable', () => {
    const policy = { maxMessageLength: 10 }

    function codeOf(messages: Message[]): string | undefined {
        try {
            assertChattable(messages, policy)
            return undefined
        } catch (error) {
            expect(error).toBeInstanceOf(ChatError)
            return (error as ChatError).code
        }
    }

    it('rejects an empty conversation or a blank question', () => {
        expect(codeOf([])).toBe('empty')
        expect(codeOf([user('   ')])).toBe('empty')
    })

    it('rejects a conversation that does not end with the user', () => {
        expect(codeOf([user('hi'), assistant('hello')])).toBe('last-not-user')
    })

    it('rejects any message over the length limit', () => {
        expect(codeOf([user('hi'), assistant('x'.repeat(11)), user('ok')])).toBe('message-too-long')
    })

    it('accepts a valid conversation', () => {
        expect(codeOf([user('hi'), assistant('hello'), user('x'.repeat(10))])).toBeUndefined()
    })
})
