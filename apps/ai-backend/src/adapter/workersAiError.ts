import { ModelError } from '../core/error/model'

// The AI binding throws an Error whose message starts with Cloudflare's
// internal code ("3036: ..."). Documented codes:
// https://developers.cloudflare.com/workers-ai/platform/errors/
//
// - 3036: the daily free Neuron allocation is used up. Also seen in practice as
//   4006 with the same text, although 4006 is not in the documented table.
// - 3040: out of capacity ("Capacity temporarily exceeded"). The docs name no
//   separate code for the per-minute rate limit, so its wording is matched too.

const QUOTA_EXHAUSTED = /^(3036|4006):|daily free allocation|neurons/i
const RATE_LIMITED = /^3040:|capacity|rate limit|too many requests/i

export function toModelError(error: unknown): ModelError {
    if (error instanceof ModelError) return error
    const message = error instanceof Error ? error.message : String(error)
    if (QUOTA_EXHAUSTED.test(message)) return new ModelError('quota-exhausted', message, { cause: error })
    if (RATE_LIMITED.test(message)) return new ModelError('rate-limited', message, { cause: error })
    return new ModelError('unknown', message, { cause: error })
}

export async function runModel<T>(call: () => Promise<T>): Promise<T> {
    try {
        return await call()
    } catch (error) {
        throw toModelError(error)
    }
}
