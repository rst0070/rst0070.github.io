export interface LlmMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export interface CompletionParams {
    messages: LlmMessage[]
    maxTokens: number
    temperature: number
}

export interface CompletionResult {
    text: string
}
