// Runs the conversations in a question file against POST /chat, sending each
// follow-up with the history so far, and prints the answers as Markdown. Used
// to judge answer quality and compare chat models (set in src/modelCatalog.ts).
//
//   pnpm ask script/questions.example.json > answers.md
//
// AI_BACKEND_URL defaults to `wrangler dev` (http://localhost:8787).
//
// A question file is a JSON array of conversations:
//   [{ "name": "...", "slug": "optional note slug", "turns": ["question", "follow-up", ...] }]

import { readFileSync } from 'node:fs'
import { ChatReply, Message } from '../src/core/entity/chat'

interface Conversation {
    name: string
    slug?: string
    turns: string[]
}

async function main(): Promise<void> {
    const file = process.argv[2]
    if (file === undefined) throw new Error('Usage: pnpm ask <questions.json>')
    const url = new URL('/chat', process.env.AI_BACKEND_URL || 'http://localhost:8787')
    const conversations = parseConversations(JSON.parse(readFileSync(file, 'utf-8')))

    for (const conversation of conversations) {
        console.log(`## ${conversation.name}${conversation.slug === undefined ? '' : ` (slug: ${conversation.slug})`}\n`)
        const messages: Message[] = []
        for (const turn of conversation.turns) {
            messages.push({ role: 'user', content: turn })
            console.log(`**User:** ${turn}\n`)

            const started = Date.now()
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages, ...(conversation.slug === undefined ? {} : { slug: conversation.slug }) }),
            })
            const seconds = ((Date.now() - started) / 1000).toFixed(1)
            if (!response.ok) {
                console.log(`**Error:** ${response.status} ${await response.text()} (${seconds}s)\n`)
                break
            }

            const reply = (await response.json()) as ChatReply
            messages.push(reply.message)
            console.log(`**Assistant** (${seconds}s):\n\n${reply.message.content}\n`)
            const citations = reply.citations.map((citation, i) => `[${i + 1}] ${citation.title} — ${citation.url}`)
            console.log(`Citations:\n${citations.map((line) => `- ${line}`).join('\n')}\n`)
        }
    }
}

function parseConversations(value: unknown): Conversation[] {
    const valid = Array.isArray(value) && value.every((item) => typeof item === 'object' && item !== null
        && typeof item.name === 'string'
        && (item.slug === undefined || typeof item.slug === 'string')
        && Array.isArray(item.turns) && item.turns.length > 0
        && item.turns.every((turn: unknown) => typeof turn === 'string'))
    if (!valid) throw new Error('Question file must be [{ name, slug?, turns: string[] }]')
    return value as Conversation[]
}

main().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
})
