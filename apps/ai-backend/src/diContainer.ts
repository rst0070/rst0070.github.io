import { WorkersAiEmbeddingAdapter } from './adapter/embedding'
import { WorkersAiLlmAdapter } from './adapter/llm'
import { ChatUsecase } from './core/usecase/chat'
import { ReindexUsecase } from './core/usecase/reindex'
import { CorsDeps } from './http/cors'
import { ChatRouteDeps, RateLimiter } from './http/route/chat'
import { ReindexRouteDeps } from './http/route/reindex'
import { CHAT_MODEL, EMBEDDING_MODEL } from './modelCatalog'
import { VectorizeBinding, VectorizeChunkRepository } from './repositories/chunkRepository'

/** Platform handles and secrets, read from `env` by the Worker entry. */
export interface Bindings {
    ai: Ai
    vectorize: VectorizeBinding
    chatRateLimiter: RateLimiter
    reindexSecret: string
    allowedOrigins: string[]
}

/**
 * The only module that names concrete adapters and repositories. Built once
 * per request: an isolate serves many visitors, so nothing here may outlive
 * the request.
 */
export class DiContainer implements ChatRouteDeps, ReindexRouteDeps, CorsDeps {
    readonly chatUsecase: ChatUsecase
    readonly chatRateLimiter: RateLimiter
    readonly reindexUsecase: ReindexUsecase
    readonly reindexSecret: string
    readonly allowedOrigins: readonly string[]

    constructor(bindings: Bindings) {
        const embedding = new WorkersAiEmbeddingAdapter(bindings.ai, EMBEDDING_MODEL)
        const llm = new WorkersAiLlmAdapter(bindings.ai, CHAT_MODEL)
        const chunkRepository = new VectorizeChunkRepository(bindings.vectorize)
        this.chatUsecase = new ChatUsecase(chunkRepository, embedding, llm)
        this.chatRateLimiter = bindings.chatRateLimiter
        this.reindexUsecase = new ReindexUsecase(chunkRepository, embedding)
        this.reindexSecret = bindings.reindexSecret
        this.allowedOrigins = bindings.allowedOrigins
    }
}
