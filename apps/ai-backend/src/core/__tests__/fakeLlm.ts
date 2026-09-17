import { CompletionParams, CompletionResult } from '../entity/llm'
import { LlmPort } from '../port/llm'

export class FakeLlm implements LlmPort {
    readonly calls: CompletionParams[] = []

    constructor(private readonly text = 'fake answer') {}

    async complete(params: CompletionParams): Promise<CompletionResult> {
        this.calls.push(params)
        return { text: this.text }
    }
}
