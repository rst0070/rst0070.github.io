// A chat as the client holds it. The client never sends a system message: the
// system prompt is built on the server every turn (see service/prompt.ts).

export interface Message {
    role: 'user' | 'assistant'
    content: string
}

export interface ChatInput {
    messages: Message[]
    /** Set on a note page: retrieval is limited to that note. */
    slug?: string
}

export interface Citation {
    slug: string
    title: string
    url: string
}

export interface ChatReply {
    message: Message & { role: 'assistant' }
    /** In source order: citation n is source [n + 1] in the system prompt. */
    citations: Citation[]
}

/**
 * A reply being generated. Citations are known once retrieval is done, before
 * any text; `deltas` yields the assistant message's text piece by piece.
 */
export interface ChatReplyStream {
    citations: Citation[]
    deltas: AsyncIterable<string>
}
