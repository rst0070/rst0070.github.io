import { Chunk } from '../../core/entity/chunk'
import { ReindexUsecase } from '../../core/usecase/reindex'
import { hasBearerSecret } from '../auth'
import { badRequest, isRecord, readJson } from '../request'
import { HttpError, json } from '../respond'

export interface ReindexRouteDeps {
    readonly reindexUsecase: Pick<ReindexUsecase, 'reindex'>
    readonly reindexSecret: string
}

// One request embeds and upserts every chunk it carries, so the indexing
// script sends the corpus in batches below these.
const MAX_BODY_BYTES = 4 * 1024 * 1024
const MAX_CHUNKS = 200
const MAX_TEXT_LENGTH = 10_000

export async function handleReindex(request: Request, deps: ReindexRouteDeps): Promise<Response> {
    if (!await hasBearerSecret(request, deps.reindexSecret)) throw new HttpError(401, 'unauthorized')

    const chunks = parseChunks(await readJson(request, MAX_BODY_BYTES))
    return json(await deps.reindexUsecase.reindex(chunks))
}

function parseChunks(body: unknown): Chunk[] {
    if (!isRecord(body) || !Array.isArray(body.chunks)) throw badRequest('Body must be { chunks: Chunk[] }')
    if (body.chunks.length > MAX_CHUNKS) throw badRequest(`At most ${MAX_CHUNKS} chunks per request`)

    return body.chunks.map((value, i) => {
        const chunk = toChunk(value)
        if (chunk === undefined) throw badRequest(`chunks[${i}] is not a valid chunk`)
        return chunk
    })
}

function toChunk(value: unknown): Chunk | undefined {
    if (!isRecord(value)) return undefined
    const { slug, index, title, heading, url, date, text } = value
    const valid = typeof slug === 'string' && slug !== ''
        && typeof index === 'number' && Number.isInteger(index) && index >= 0
        && typeof title === 'string'
        && typeof heading === 'string'
        && typeof url === 'string'
        && (date === undefined || typeof date === 'string')
        && typeof text === 'string' && text.trim() !== '' && text.length <= MAX_TEXT_LENGTH
    if (!valid) return undefined
    return { slug, index, title, heading, url, ...(date === undefined ? {} : { date }), text }
}
