import { Note, NoteMetadata } from './entities'

// Pure note rules shared by every consumer (site, Worker, indexer). Nothing in
// this file may use Node APIs (fs, path, process, ...): it is part of the
// Worker-safe `@rst0070/content` entry, and `pnpm typecheck` checks it without
// Node types.

/**
 * Convert note path to slug
 *
 * Only the last two segments of the path are used: `<year>/<name>.md` becomes
 * `<year>-<name>`, and any leading directories are ignored. So a path relative
 * to the notes directory ("24/06-24-LSH-example.md"), relative to the content
 * root ("notes/24/06-24-LSH-example.md") or absolute all give the same slug.
 *
 * Only the first ".md" in the file name is removed. The path is not
 * normalized ("." / ".." segments are not resolved), so pass a normalized one.
 *
 * @param notePath - normalized POSIX note path (`/` separators): will be like "2025/test.md"
 * @returns slug: will be like "2025-test"
 */
export function notePathToSlug(notePath: string): string {

    let slugs = notePath.split('/')

    if (slugs.length < 2) {
        throw new Error(`Note path must end with "<year>/<name>.md": ${notePath}`)
    }

    let noteName = slugs.pop()!
    let noteYear = slugs.pop()!

    return noteYear + '-' + noteName.replace('.md', '')
}

/**
 * Convert slug to note path
 *
 * Splits the slug at its first "-": the part before it is the year folder, the
 * rest is the file name. The result is not normalized, so resolve it against
 * the notes directory with `path.join` (as `@rst0070/content/node` does).
 *
 * @param slug - slug: will be like "2025-test"
 * @returns POSIX note path relative to the notes directory: will be like "2025/test.md"
 */
export function noteSlugToPath(slug: string): string {
    let splittedSlug = slug.split('-')
    let noteYear = splittedSlug.shift()!
    let noteName = slug.replace(noteYear + '-', '')

    return `${noteYear}/${noteName}.md`
}

export function parseNoteRawData(noteRawData: string): {metadata: NoteMetadata, content: string} {
    let frontmatterRegex = /---\s*([\s\S]*?)\s*---/
    let match = frontmatterRegex.exec(noteRawData)
    let frontMatterBlock = match![1]
    let content = noteRawData.replace(frontmatterRegex, '').trim()
    let frontMatterLines = frontMatterBlock.trim().split('\n')
    let metadata: Partial<NoteMetadata> = {}

    frontMatterLines.forEach((line) => {
        let [key, ...valueArr] = line.split(': ')
        let value = valueArr.join(': ').trim()
        value = value.replace(/^['"](.*)['"]$/, '$1') // Remove quotes
        metadata[key.trim() as keyof NoteMetadata] = String(value)
    })

    return { metadata: metadata as NoteMetadata, content }
}

/**
 * Newest first by frontmatter `date` (compared as strings). Returns a new
 * array and leaves the input untouched.
 */
export function sortNotesByDateDesc(notes: Note[]): Note[] {
    return [...notes].sort((a, b) => {
        if (a.metadata.date && b.metadata.date) {
            return b.metadata.date.localeCompare(a.metadata.date)
        }
        return 0
    })
}

/**
 * Derive a plain-text excerpt from markdown content, for use as a
 * meta description fallback when a note has no explicit `description`.
 */
export function excerptFromContent(content: string, maxLen = 160): string {
    const text = content
        .replace(/```[\s\S]*?```/g, ' ')          // fenced code blocks
        .replace(/`[^`]*`/g, ' ')                  // inline code
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')     // images
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')   // links -> link text
        .replace(/<[^>]+>/g, ' ')                  // html tags
        .replace(/^\s{0,3}#{1,6}\s+/gm, '')        // heading markers
        .replace(/[*_~>#|]/g, ' ')                 // leftover md symbols
        .replace(/\s+/g, ' ')
        .trim()

    if (text.length <= maxLen) return text
    return text.slice(0, maxLen - 1).replace(/\s+\S*$/, '').trim() + '…'
}

/**
 * The best available description for a note: its explicit frontmatter
 * `description`, otherwise an excerpt derived from its content.
 */
export function getNoteDescription(note: Note): string {
    const explicit = note.metadata.description?.trim()
    if (explicit) return explicit
    return excerptFromContent(note.content)
}

/**
 * The notes directly before and after `slug` when `notes` is sorted newest
 * first (see `sortNotesByDateDesc`). Pass every note to get the site's
 * prev/next links.
 */
export function findAdjacentNotes(notes: Note[], slug: string): { older: Note | null; newer: Note | null } {
    const sortedNotes = sortNotesByDateDesc(notes)
    const idx = sortedNotes.findIndex(n => n.slug === slug)
    if (idx < 0) return { older: null, newer: null }
    // List is newer-first: index+1 is older, index-1 is newer
    return {
        older: idx + 1 < sortedNotes.length ? sortedNotes[idx + 1] : null,
        newer: idx - 1 >= 0 ? sortedNotes[idx - 1] : null,
    }
}
