import { CompletionParams } from '../entity/llm'

export interface LlmPort {
    /**
     * Starts a completion. Resolves once the model has accepted the call, so
     * a refused call (quota, rate limit) rejects here, before any text; the
     * iterable then yields the answer's text as it is generated.
     */
    stream(params: CompletionParams): Promise<AsyncIterable<string>>
}
