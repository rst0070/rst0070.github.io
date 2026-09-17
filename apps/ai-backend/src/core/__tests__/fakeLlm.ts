import { CompletionParams } from '../entity/llm'
import { LlmPort } from '../port/llm'

/** Streams `deltas` one by one, and records every call. */
export class FakeLlm implements LlmPort {
    readonly calls: CompletionParams[] = []

    constructor(private readonly deltas: string[] = ['fake ', 'answer']) {}

    async stream(params: CompletionParams): Promise<AsyncIterable<string>> {
        this.calls.push(params)
        const deltas = this.deltas
        return (async function* () {
            yield* deltas
        })()
    }
}
