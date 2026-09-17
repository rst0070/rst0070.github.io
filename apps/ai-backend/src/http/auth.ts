/**
 * True when the request carries `Authorization: Bearer <secret>`. An empty
 * secret (not configured) authorizes nothing.
 */
export async function hasBearerSecret(request: Request, secret: string): Promise<boolean> {
    if (secret === '') return false
    const match = /^Bearer (.+)$/.exec(request.headers.get('Authorization') ?? '')
    if (match === null) return false
    return constantTimeEqual(match[1], secret)
}

/**
 * Compares SHA-256 digests byte by byte without an early exit, so the time
 * taken does not reveal how much of the secret matched, or its length.
 */
async function constantTimeEqual(a: string, b: string): Promise<boolean> {
    const encoder = new TextEncoder()
    const [digestA, digestB] = await Promise.all([
        crypto.subtle.digest('SHA-256', encoder.encode(a)),
        crypto.subtle.digest('SHA-256', encoder.encode(b)),
    ])
    const bytesA = new Uint8Array(digestA)
    const bytesB = new Uint8Array(digestB)
    let difference = 0
    for (let i = 0; i < bytesA.length; i++) difference |= bytesA[i] ^ bytesB[i]
    return difference === 0
}
