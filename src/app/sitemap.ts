import { findAllNotes } from '@/infra/note'

export const baseUrl = 'https://rst0070.github.io'

export default async function sitemap() {
    let notes = findAllNotes().map((note) => ({
        url: `${baseUrl}/notes/${note.slug}`,
        lastModified: note.metadata.date,
    }))

    let routes = ['', '/notes'].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date().toISOString().split('T')[0],
    }))

  return [...routes, ...notes]
}