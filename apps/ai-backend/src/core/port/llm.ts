import { CompletionParams, CompletionResult } from '../entity/llm'

export interface LlmPort {
    complete(params: CompletionParams): Promise<CompletionResult>
}
