import { EmbeddingModel } from './adapter/embedding'
import { ChatModel } from './adapter/llm'

// Workers AI models in use. Changing EMBEDDING_MODEL means recreating the
// Vectorize index with its dimensions and re-indexing everything.

export const EMBEDDING_MODEL: EmbeddingModel = {
    id: '@cf/baai/bge-m3',
    dimensions: 1024,
}

export const CHAT_MODEL: ChatModel = {
    id: '@cf/openai/gpt-oss-20b',
    inputs: { reasoning_effort: 'low' },
}
