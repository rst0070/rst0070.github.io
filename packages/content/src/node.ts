import fs from 'fs'
import path from 'path'
import { Note } from './entities'
import { noteSlugToPath, notePathToSlug, parseNoteRawData } from './note'

// Node entry (`@rst0070/content/node`): filesystem loaders for the content
// directory. Every loader takes the content root explicitly (the directory
// holding `notes/` and `portfolio.md`) instead of deriving it from
// `process.cwd()` or `__dirname`, which differ between Next's bundled server
// code, the Worker tooling and scripts.

function findAllNotePaths(contentRoot: string): string[] {
    let noteDirPath = path.join(
        contentRoot,
        'notes'
    )
    const notePaths = fs.readdirSync(
            noteDirPath,
            {
                recursive: true,
                withFileTypes: true
            }
        ).filter(
            (note) => note.isFile() && note.name.endsWith('.md') && !note.name.startsWith('_')
        )

    return notePaths.map(
        note => path.join(
            note.parentPath, note.name
        )
    )
}

/**
 * Slug of a note file found under `contentRoot`. The path handed to the pure
 * slug rule is relative to the content root ("notes/<year>/<name>.md") in POSIX
 * form, so the slug does not depend on the OS path separator or on where the
 * content root is.
 */
function notePathToSlugIn(contentRoot: string, notePath: string): string {
    return notePathToSlug(
        path.relative(contentRoot, notePath).split(path.sep).join('/')
    )
}

function readNote(contentRoot: string, notePath: string): Note {
    const noteRawData = fs.readFileSync(notePath, 'utf-8')
    const { metadata, content } = parseNoteRawData(noteRawData)
    return { metadata, content, slug: notePathToSlugIn(contentRoot, notePath) }
}

/**
 * Slugs of all published notes: every `.md` file under `<contentRoot>/notes`
 * (recursively) whose name does not start with `_`.
 */
export function findAllNoteSlugs(contentRoot: string): string[] {
    const notePaths = findAllNotePaths(contentRoot)
    return notePaths.map(notePath => notePathToSlugIn(contentRoot, notePath))
}

export function findNoteBySlug(contentRoot: string, slug: string): Note {
    const notePath = path.join(
        contentRoot,
        'notes',
        noteSlugToPath(slug)
    )
    return readNote(contentRoot, notePath)
}

export function findAllNotes(contentRoot: string): Note[] {
    const notePaths = findAllNotePaths(contentRoot)
    return notePaths.map(notePath => readNote(contentRoot, notePath))
}

/**
 * Read the raw portfolio markdown source. Unlike notes, the portfolio is a
 * single document with no frontmatter, so this simply returns its content.
 */
export function readPortfolio(contentRoot: string): string {
    const portfolioPath = path.join(
        contentRoot,
        'portfolio.md'
    )
    return fs.readFileSync(portfolioPath, 'utf-8')
}
