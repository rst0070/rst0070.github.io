// Tunable policy values. Starting points, tuned during evaluation (#26).

export interface ChatPolicy {
    /** Messages kept for retrieval and the model, counting the new user message. */
    contextWindow: number
    /** Chunks retrieved per turn. */
    topK: number
    /** Characters per message, user or assistant. */
    maxMessageLength: number
    /** Characters in the text embedded for retrieval. */
    maxRetrievalQueryLength: number
}

export const CHAT_POLICY: ChatPolicy = {
    contextWindow: 6,
    topK: 5,
    // Assistant replies are sent back by the client, so this must stay above
    // what LLM_PRESETS.chat.maxTokens can produce.
    maxMessageLength: 8000,
    maxRetrievalQueryLength: 1000,
}

export interface LlmPreset {
    maxTokens: number
    temperature: number
}

export const LLM_PRESETS = {
    // Reasoning models count reasoning tokens against maxTokens, so leave room
    // beyond the visible answer.
    chat: { maxTokens: 1536, temperature: 0.3 },
} satisfies Record<string, LlmPreset>

export interface ChunkingPolicy {
    /** A heading starts a new chunk once the current one has this many tokens. */
    minTokens: number
    /** A chunk grows past this only when a single fenced code block does. */
    maxTokens: number
    /** Up to this many tokens of trailing text are repeated at the start of the next chunk. */
    overlapTokens: number
    /**
     * UTF-8 bytes per chunk text. The text is stored as vector metadata, whose
     * limit is 10 KiB including the other fields; Korean is 3 bytes a character.
     */
    maxTextBytes: number
}

export const CHUNKING_POLICY: ChunkingPolicy = {
    minTokens: 300,
    maxTokens: 500,
    overlapTokens: 60,
    maxTextBytes: 8000,
}
