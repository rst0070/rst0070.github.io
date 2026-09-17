/**
 * The chat request cannot be answered as sent.
 *
 * - `empty`: no messages, or the latest question is blank
 * - `last-not-user`: the last message is not from the user
 * - `message-too-long`: a message is longer than CHAT_POLICY.maxMessageLength
 * - `no-source`: retrieval found nothing to answer from
 */
export type ChatErrorCode = 'empty' | 'last-not-user' | 'message-too-long' | 'no-source'

export class ChatError extends Error {
    override readonly name = 'ChatError'

    constructor(readonly code: ChatErrorCode, message: string = code) {
        super(message)
    }
}
