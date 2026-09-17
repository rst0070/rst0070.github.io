/**
 * A model call failed. Adapters map vendor failures to these codes.
 *
 * - `quota-exhausted`: the model provider's allowance is used up for now
 * - `rate-limited`: too many requests, or no capacity; retry later
 * - `unknown`: anything else, including a response of an unexpected shape
 */
export type ModelErrorCode = 'quota-exhausted' | 'rate-limited' | 'unknown'

export class ModelError extends Error {
    override readonly name = 'ModelError'

    constructor(readonly code: ModelErrorCode, message: string = code, options?: { cause?: unknown }) {
        super(message, options)
    }
}
