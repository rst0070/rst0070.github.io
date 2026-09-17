import {
    findAllNoteSlugs as findAllNoteSlugsIn,
    findAllNotes as findAllNotesIn,
    findNoteBySlug as findNoteBySlugIn,
} from '@rst0070/content/node'
import { findAdjacentNotes as findAdjacentNotesIn, type Note } from '@rst0070/content'
import { CONTENT_ROOT } from './content'

// Note loading and rules live in @rst0070/content. This module binds them to
// the site's CONTENT_ROOT so pages keep importing from `@/infra/note`.

export { excerptFromContent, getNoteDescription } from '@rst0070/content'

export function findAllNoteSlugs(): string[] {
    return findAllNoteSlugsIn(CONTENT_ROOT)
}

export function findNoteBySlug(slug: string): Note {
    return findNoteBySlugIn(CONTENT_ROOT, slug)
}

export function findAllNotes(): Note[] {
    return findAllNotesIn(CONTENT_ROOT)
}

export function findAdjacentNotes(slug: string): { older: Note | null; newer: Note | null } {
    return findAdjacentNotesIn(findAllNotes(), slug)
}
