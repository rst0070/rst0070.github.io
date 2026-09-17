import { Note } from '@rst0070/content'
import { Chunk } from '../entity/chunk'
import { CHUNKING_POLICY, ChunkingPolicy } from '../config'

// Splits site markdown into chunks for embedding. Runs in the indexing script,
// not in the Worker: chunking the whole corpus in one request would not fit
// the Free plan's CPU limit.

export const PORTFOLIO_SLUG = 'portfolio'

export function chunkNote(note: Note, policy: ChunkingPolicy = CHUNKING_POLICY): Chunk[] {
    return chunkMarkdown(note.content, {
        slug: note.slug,
        title: note.metadata.title,
        url: `/notes/${note.slug}`,
        date: note.metadata.date,
    }, policy)
}

export function chunkPortfolio(markdown: string, policy: ChunkingPolicy = CHUNKING_POLICY): Chunk[] {
    return chunkMarkdown(markdown, { slug: PORTFOLIO_SLUG, title: 'Portfolio', url: '/portfolio' }, policy)
}

interface Document {
    slug: string
    title: string
    url: string
    date?: string
}

/** A unit that is never split across chunks: a paragraph, a list, or a whole fenced code block. */
interface Block {
    text: string
    /** Headings (levels 1–3) the block is under. */
    headingPath: string[]
    /** The block begins with a level 1–3 heading. */
    startsSection: boolean
    code: boolean
}

function chunkMarkdown(markdown: string, document: Document, policy: ChunkingPolicy): Chunk[] {
    const chunks: Chunk[] = []
    for (const group of packBlocks(parseBlocks(markdown, policy), policy)) {
        const heading = group.headingPath.join(' > ')
        const prefix = [document.title, ...group.headingPath].join(' > ')
        const body = group.blocks.map((block) => block.text).join('\n\n')
        chunks.push({
            slug: document.slug,
            index: chunks.length,
            title: document.title,
            heading,
            url: document.url,
            ...(document.date === undefined ? {} : { date: document.date }),
            text: truncateUtf8(`${prefix}\n\n${body}`, policy.maxTextBytes),
        })
    }
    return chunks
}

const FENCE = /^ {0,3}(`{3,}|~{3,})/
const HEADING = /^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/

function parseBlocks(markdown: string, policy: ChunkingPolicy): Block[] {
    const blocks: Block[] = []
    const headings: { level: number, text: string }[] = []
    let lines: string[] = []
    let fence: string | undefined
    let pendingHeadings: string[] = []
    let pendingSection = false

    const flush = (code: boolean) => {
        const text = lines.join('\n').replace(/^\n+|\s+$/g, '')
        lines = []
        if (text === '') return
        const headingPath = headings.map((heading) => heading.text)
        const withHeadings = [...pendingHeadings, text].join('\n\n')
        const pieces = code ? [withHeadings] : splitOversized(withHeadings, policy.maxTokens)
        pieces.forEach((piece, i) => {
            blocks.push({ text: piece, headingPath, startsSection: pendingSection && i === 0, code })
        })
        pendingHeadings = []
        pendingSection = false
    }

    for (const line of markdown.replace(/\r\n?/g, '\n').split('\n')) {
        if (fence !== undefined) {
            lines.push(line)
            if (isClosingFence(line, fence)) {
                fence = undefined
                flush(true)
            }
            continue
        }

        const fenceMatch = FENCE.exec(line)
        if (fenceMatch !== null) {
            flush(false)
            fence = fenceMatch[1]
            lines.push(line)
            continue
        }

        const headingMatch = HEADING.exec(line)
        if (headingMatch !== null) {
            flush(false)
            const level = headingMatch[1].length
            const text = headingMatch[2].trim()
            if (level <= 3) {
                while (headings.length > 0 && headings[headings.length - 1].level >= level) headings.pop()
                if (text !== '') headings.push({ level, text })
                pendingSection = true
            }
            pendingHeadings.push(line.trim())
            continue
        }

        if (line.trim() === '') {
            flush(false)
            continue
        }
        lines.push(line)
    }

    // An unclosed fence runs to the end of the document.
    flush(fence !== undefined)
    // Headings with nothing after them still carry text worth finding.
    if (pendingHeadings.length > 0) {
        lines = [...pendingHeadings]
        pendingHeadings = []
        flush(false)
    }
    return blocks
}

function isClosingFence(line: string, fence: string): boolean {
    const match = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(line)
    return match !== null && match[1][0] === fence[0] && match[1].length >= fence.length
}

interface BlockGroup {
    headingPath: string[]
    blocks: Block[]
}

/**
 * Greedy packing: a chunk ends before a block that would push it past
 * `maxTokens`, or before a heading once it holds `minTokens`. A chunk that
 * ends mid-section repeats a little of its tail at the start of the next.
 */
function packBlocks(blocks: Block[], policy: ChunkingPolicy): BlockGroup[] {
    const groups: BlockGroup[] = []
    let current: BlockGroup | undefined
    let tokens = 0

    for (const block of blocks) {
        const blockTokens = estimateTokens(block.text)
        if (current !== undefined && (
            tokens + blockTokens > policy.maxTokens
            || (block.startsSection && tokens >= policy.minTokens)
        )) {
            groups.push(current)
            const overlap = block.startsSection ? undefined : overlapFrom(current, policy.overlapTokens)
            const overlapTokens = overlap === undefined ? 0 : estimateTokens(overlap.text)
            if (overlap !== undefined && overlapTokens + blockTokens <= policy.maxTokens) {
                current = { headingPath: block.headingPath, blocks: [overlap] }
                tokens = overlapTokens
            } else {
                current = undefined
                tokens = 0
            }
        }
        current ??= { headingPath: block.headingPath, blocks: [] }
        current.blocks.push(block)
        tokens += blockTokens
    }
    if (current !== undefined) groups.push(current)
    return groups
}

/** Trailing sentences of the group's last block, up to `maxTokens`; none from code. */
function overlapFrom(group: BlockGroup, maxTokens: number): Block | undefined {
    const last = group.blocks[group.blocks.length - 1]
    if (last.code) return undefined

    const sentences = splitSentences(last.text)
    const kept: string[] = []
    let tokens = 0
    for (let i = sentences.length - 1; i >= 0; i--) {
        const sentenceTokens = estimateTokens(sentences[i])
        if (tokens + sentenceTokens > maxTokens) break
        kept.unshift(sentences[i])
        tokens += sentenceTokens
    }
    if (kept.length === 0 || (kept.length === sentences.length && group.blocks.length === 1)) return undefined
    return { text: kept.join(' '), headingPath: last.headingPath, startsSection: false, code: false }
}

/** Splits text above `maxTokens` at lines, then sentences, then characters. */
function splitOversized(text: string, maxTokens: number): string[] {
    if (estimateTokens(text) <= maxTokens) return [text]

    const units = text.split('\n').flatMap((line) => {
        if (estimateTokens(line) <= maxTokens) return [line]
        return splitSentences(line).flatMap((sentence) => splitByTokens(sentence, maxTokens))
    })

    const pieces: string[] = []
    let current: string[] = []
    let tokens = 0
    for (const unit of units) {
        const unitTokens = estimateTokens(unit)
        if (current.length > 0 && tokens + unitTokens > maxTokens) {
            pieces.push(current.join('\n'))
            current = []
            tokens = 0
        }
        current.push(unit)
        tokens += unitTokens
    }
    if (current.length > 0) pieces.push(current.join('\n'))
    return pieces.map((piece) => piece.trim()).filter((piece) => piece !== '')
}

function splitSentences(text: string): string[] {
    return text.split(/(?<=[.!?。？！])\s+/).filter((sentence) => sentence !== '')
}

function splitByTokens(text: string, maxTokens: number): string[] {
    const pieces: string[] = []
    let piece = ''
    let tokens = 0
    for (const char of text) {
        const charTokens = tokenWeight(char)
        if (piece !== '' && tokens + charTokens > maxTokens) {
            pieces.push(piece)
            piece = ''
            tokens = 0
        }
        piece += char
        tokens += charTokens
    }
    if (piece !== '') pieces.push(piece)
    return pieces
}

/**
 * Rough token count without a tokenizer: about four ASCII characters per
 * token, and about one token per other character (Hangul, CJK, symbols).
 */
export function estimateTokens(text: string): number {
    let tokens = 0
    for (const char of text) tokens += tokenWeight(char)
    return Math.ceil(tokens)
}

function tokenWeight(char: string): number {
    return char.codePointAt(0)! < 0x80 ? 0.25 : 1
}

export function utf8ByteLength(text: string): number {
    let bytes = 0
    for (const char of text) bytes += utf8CharBytes(char)
    return bytes
}

function utf8CharBytes(char: string): number {
    const codePoint = char.codePointAt(0)!
    if (codePoint < 0x80) return 1
    if (codePoint < 0x800) return 2
    if (codePoint < 0x10000) return 3
    return 4
}

/**
 * Cuts text to at most `maxBytes` of UTF-8 at a character boundary, preferring
 * a line break, and closes a fenced code block left open by the cut.
 */
export function truncateUtf8(text: string, maxBytes: number): string {
    if (utf8ByteLength(text) <= maxBytes) return text

    // Room for a closing fence ("\n" plus the fence) if the cut lands in code.
    const reserve = 1 + longestFence(text)
    let cut = ''
    let bytes = 0
    for (const char of text) {
        const charBytes = utf8CharBytes(char)
        if (bytes + charBytes > maxBytes - reserve) break
        cut += char
        bytes += charBytes
    }
    const lineEnd = cut.lastIndexOf('\n')
    if (lineEnd > cut.length / 2) cut = cut.slice(0, lineEnd)

    const openFence = openFenceAtEnd(cut)
    return openFence === undefined ? cut : `${cut}\n${openFence}`
}

function longestFence(text: string): number {
    let longest = 0
    for (const line of text.split('\n')) {
        const match = FENCE.exec(line)
        if (match !== null) longest = Math.max(longest, match[1].length)
    }
    return longest
}

function openFenceAtEnd(text: string): string | undefined {
    let fence: string | undefined
    for (const line of text.split('\n')) {
        if (fence === undefined) {
            const match = FENCE.exec(line)
            if (match !== null) fence = match[1]
        } else if (isClosingFence(line, fence)) {
            fence = undefined
        }
    }
    return fence
}
