import fs from 'fs'
import path from 'path'
import { Note, NoteMetadata } from '../core/entities'

function findAllNotePaths(): string[] {
    let noteDirPath = path.join(
        process.cwd(),
        'src',
        'notes'
    )
    const notePaths = fs.readdirSync(
            noteDirPath,
            {
                recursive: true,
                withFileTypes: true
            }
        ).filter(
            (note) => note.isFile() && note.name.endsWith('.md')
        )
        
    return notePaths.map(
        note => path.join(
            note.parentPath, note.name
        )
    )
}

/**
 * Convert note path to slug
 * @param notePath - note path: will be like ".../note/2025/test.md"
 * @returns slug: will be like "2025-test"
 */
function notePathToSlug(notePath: string): string {

    let resolvedPath = path.resolve(notePath)
    let slugs = resolvedPath.split('/')

    let noteName = slugs.pop()!
    let noteYear = slugs.pop()!

    return noteYear + '-' + noteName.replace('.md', '')
}

/**
 * Convert slug to note path
 * @param slug - slug: will be like "2025-test"
 * @returns note path: will be like ".../note/2025/test.md"
 */
function noteSlugToPath(slug: string): string {
    let splittedSlug = slug.split('-')
    let noteYear = splittedSlug.shift()!
    let noteName = slug.replace(noteYear + '-', '')

    return path.join(
        process.cwd(),
        'src', 
        'notes',
        noteYear,
        `${noteName}.md`
    )
}

function parseNoteRawData(noteRawData: string): {metadata: NoteMetadata, content: string} {
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
        metadata[key.trim() as keyof NoteMetadata] = value
    })

    return { metadata: metadata as NoteMetadata, content }
}

function readNote(notePath: string): Note {
    const noteRawData = fs.readFileSync(notePath, 'utf-8')
    const { metadata, content } = parseNoteRawData(noteRawData)
    return { metadata, content, slug: notePathToSlug(notePath) }
}

export function findAllNoteSlugs(): string[] {
    const notePaths = findAllNotePaths()
    return notePaths.map(notePath => notePathToSlug(notePath))
}

export function findNoteBySlug(slug: string): Note {
    const notePath = noteSlugToPath(slug)
    return readNote(notePath)
}

export function findAllNotes(): Note[] {
    const notePaths = findAllNotePaths()
    return notePaths.map(readNote)
}