import { ChatInput, ChatReply, ChatReplyStream, Message } from '../entity/chat'
import { ChatError } from '../error/chat'
import { EmbeddingPort } from '../port/embedding'
import { LlmPort } from '../port/llm'
import { ChunkRepository } from '../repository/chunk'
import { CHAT_POLICY, ChatPolicy, LLM_PRESETS } from '../config'
import { citationsFrom } from '../service/citation'
import { buildSystemPrompt } from '../service/prompt'

export class ChatUsecase {
    constructor(
        private readonly chunkRepository: ChunkRepository,
        private readonly embedding: EmbeddingPort,
        private readonly llm: LlmPort,
    ) {}

    /**
     * Validates, retrieves and starts the completion. Everything that can
     * refuse the turn (ChatError, a ModelError from embedding or from starting
     * the completion) rejects here, before any text is produced.
     */
    async start(input: ChatInput): Promise<ChatReplyStream> {
        assertChattable(input.messages, CHAT_POLICY)
        const window = contextWindow(input.messages, CHAT_POLICY.contextWindow)

        const [vector] = await this.embedding.embed([retrievalQuery(window, CHAT_POLICY)])
        const sources = await this.chunkRepository.searchByVector(vector, CHAT_POLICY.topK, { slug: input.slug })
        if (sources.length === 0) throw new ChatError('no-source')

        const deltas = await this.llm.stream({
            messages: [{ role: 'system', content: buildSystemPrompt(sources, { slug: input.slug }) }, ...window],
            ...LLM_PRESETS.chat,
        })
        return { citations: citationsFrom(sources), deltas }
    }

    /** The whole reply at once: `start`, with the text collected. */
    async reply(input: ChatInput): Promise<ChatReply> {
        const { citations, deltas } = await this.start(input)
        let content = ''
        for await (const delta of deltas) content += delta
        return { message: { role: 'assistant', content: content.trim() }, citations }
    }
}

/** Throws ChatError unless the conversation ends with a non-blank user question and every message fits. */
export function assertChattable(messages: Message[], policy: Pick<ChatPolicy, 'maxMessageLength'>): void {
    const last = messages.at(-1)
    if (last === undefined) throw new ChatError('empty')
    if (last.role !== 'user') throw new ChatError('last-not-user')
    if (last.content.trim() === '') throw new ChatError('empty')
    if (messages.some((message) => message.content.length > policy.maxMessageLength)) {
        throw new ChatError('message-too-long')
    }
}

/**
 * The last `size` messages, starting at a user message: assistant messages
 * left at the front by the cut are dropped, so the window can be shorter.
 */
export function contextWindow(messages: Message[], size: number): Message[] {
    const window = messages.slice(-size)
    const firstUser = window.findIndex((message) => message.role === 'user')
    return firstUser === -1 ? [] : window.slice(firstUser)
}

/**
 * Text embedded to retrieve sources: the window's user messages, newest
 * first, so truncation drops the oldest text and never the current question.
 * Assistant messages are left out: they are long, model-written, and pull
 * retrieval back to the previous sources.
 */
export function retrievalQuery(window: Message[], policy: Pick<ChatPolicy, 'maxRetrievalQueryLength'>): string {
    return window
        .filter((message) => message.role === 'user')
        .map((message) => message.content.trim())
        .filter((content) => content !== '')
        .reverse()
        .join('\n')
        .slice(0, policy.maxRetrievalQueryLength)
}
