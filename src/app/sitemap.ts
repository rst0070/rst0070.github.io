import { findAllNotes } from '@/infra/note'
import type { MetadataRoute } from 'next'

export const baseUrl = 'https://rst0070.github.io'
export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
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