import { ChatInput, Message } from '../../core/entity/chat'
import { ChatUsecase } from '../../core/usecase/chat'
import { badRequest, isRecord, readJson } from '../request'
import { json } from '../respond'

export interface ChatRouteDeps {
    readonly chatUsecase: Pick<ChatUsecase, 'reply'>
}

// Wire limits, checked before core runs, so parsing work stays bounded even if
// a client never trims its history. Content limits are core's (CHAT_POLICY).
const MAX_BODY_BYTES = 512 * 1024
const MAX_MESSAGES = 50
const MAX_SLUG_LENGTH = 200

export async function handleChat(request: Request, deps: ChatRouteDeps): Promise<Response> {
    const input = parseChatInput(await readJson(request, MAX_BODY_BYTES))
    const reply = await deps.chatUsecase.reply(input)
    return json(reply)
}

function parseChatInput(body: unknown): ChatInput {
    if (!isRecord(body)) throw badRequest('Body must be a JSON object')

    const { messages, slug } = body
    if (!Array.isArray(messages)) throw badRequest('`messages` must be an array')
    if (messages.length > MAX_MESSAGES) throw badRequest(`At most ${MAX_MESSAGES} messages`)
    if (!messages.every(isMessage)) {
        throw badRequest('Each message must be { role: "user" | "assistant", content: string }')
    }

    if (slug === undefined) return { messages: messages.map(toMessage) }
    if (typeof slug !== 'string' || slug === '' || slug.length > MAX_SLUG_LENGTH) {
        throw badRequest('`slug` must be a non-empty string')
    }
    return { messages: messages.map(toMessage), slug }
}

function isMessage(value: unknown): value is Message {
    return isRecord(value)
        && (value.role === 'user' || value.role === 'assistant')
        && typeof value.content === 'string'
}

/** Drops any extra fields a client sent. */
function toMessage(message: Message): Message {
    return { role: message.role, content: message.content }
}
