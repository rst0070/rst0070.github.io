// Every page the site serves: its public path, the file it is written to, the
// data it needs (loaded at build time, may read the filesystem), its head
// tags and its page component. The one boundary between pages and the
// prerender (scripts/prerender.ts) and the dev server.
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { extractToc, estimateReadingMinutes, parseMarkdownToHtml } from '@/infra/markdown'
import { findAdjacentNotes, findAllNotes, findNoteBySlug, getNoteDescription } from '@/infra/note'
import { readPortfolio } from '@/infra/portfolio'
import {
    type Head,
    absoluteUrl,
    baseUrl,
    pageTitle,
    siteDescription,
    siteName,
    siteOpenGraph,
    siteTwitter,
} from '@/head'
import { Home } from '@/pages/Home'
import { NotFound } from '@/pages/NotFound'
import { Note, type NoteData } from '@/pages/Note'
import { NotesList, type NotesListData, sortNotesForList } from '@/pages/NotesList'
import {
    Portfolio,
    type PortfolioData,
    description as portfolioDescription,
    jsonLd as portfolioJsonLd,
    title as portfolioTitle,
} from '@/pages/Portfolio'

export type Route<D> = {
    /** Public URL, e.g. "/notes/26-07-03-foo". */
    path: string
    /** Under dist/, e.g. "notes/26-07-03-foo.html"; "/" -> "index.html". */
    outFile: string
    /** Build time only. Async because the markdown pipeline is. */
    load(): D | Promise<D>
    head(data: D): Head
    Page(props: { data: D }): ReactNode
}

export type AnyRoute = Route<any>

function route<D>(r: Route<D>): Route<D> {
    return r
}

/** The defaults every page starts from (Next's root layout metadata). */
function siteHead(overrides: Partial<Head>): Head {
    return {
        title: siteName,
        description: siteDescription,
        canonical: '/',
        openGraph: siteOpenGraph,
        twitter: siteTwitter,
        jsonLd: [],
        ...overrides,
    }
}

const home = route<null>({
    path: '/',
    outFile: 'index.html',
    load: () => null,
    head: () =>
        siteHead({
            description:
                'Software engineer sharing notes on software engineering, machine learning, and infrastructure.',
        }),
    Page: () => createElement(Home),
})

const notesList = route<NotesListData>({
    path: '/notes',
    outFile: 'notes.html',
    load: () => ({ notes: sortNotesForList(findAllNotes()) }),
    head: () =>
        siteHead({
            title: pageTitle('Notes'),
            description: 'All notes by rst0070 on software engineering, machine learning, and infrastructure.',
            canonical: '/notes',
        }),
    Page: NotesList,
})

function splitTags(raw: string | undefined): string[] | undefined {
    return raw ? raw.split(',').map((t) => t.trim()).filter(Boolean) : undefined
}

function noteRoute(slug: string): Route<NoteData> {
    const path = `/notes/${slug}`
    return {
        path,
        outFile: `notes/${slug}.html`,
        async load() {
            const note = findNoteBySlug(slug)
            const html = await parseMarkdownToHtml(note.content)
            const { older, newer } = findAdjacentNotes(slug)
            return {
                note,
                description: getNoteDescription(note),
                html,
                toc: extractToc(html),
                readingMinutes: estimateReadingMinutes(note.content),
                older,
                newer,
            }
        },
        head({ note, description }) {
            const url = absoluteUrl(path)
            const { title, date, lastmod } = note.metadata
            const tags = splitTags(note.metadata.tags)
            return {
                title: pageTitle(title),
                description,
                canonical: path,
                openGraph: {
                    type: 'article',
                    title,
                    description,
                    url,
                    images: [],
                    publishedTime: date,
                    modifiedTime: lastmod || date,
                    authors: [baseUrl],
                    ...(tags ? { tags } : {}),
                },
                twitter: { card: 'summary', title, description, images: [] },
                jsonLd: [
                    {
                        '@context': 'https://schema.org',
                        '@type': 'BlogPosting',
                        headline: title,
                        description,
                        datePublished: date,
                        dateModified: lastmod || date,
                        author: { '@type': 'Person', name: 'rst0070', url: baseUrl },
                        publisher: { '@type': 'Person', name: 'rst0070', url: baseUrl },
                        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
                        url,
                        ...(tags ? { keywords: tags } : {}),
                    },
                    {
                        '@context': 'https://schema.org',
                        '@type': 'BreadcrumbList',
                        itemListElement: [
                            { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
                            { '@type': 'ListItem', position: 2, name: 'Notes', item: `${baseUrl}/notes` },
                            { '@type': 'ListItem', position: 3, name: title, item: url },
                        ],
                    },
                ],
            }
        },
        Page: Note,
    }
}

const portfolio = route<PortfolioData>({
    path: '/portfolio',
    outFile: 'portfolio.html',
    async load() {
        const html = await parseMarkdownToHtml(readPortfolio())
        return { html, toc: extractToc(html) }
    },
    head: () => ({
        title: pageTitle(portfolioTitle),
        description: portfolioDescription,
        canonical: '/portfolio',
        openGraph: {
            type: 'profile',
            title: portfolioTitle,
            description: portfolioDescription,
            url: absoluteUrl('/portfolio'),
            images: [],
        },
        twitter: { card: 'summary', title: portfolioTitle, description: portfolioDescription, images: [] },
        jsonLd: [portfolioJsonLd],
    }),
    Page: Portfolio,
})

export const notFound = route<null>({
    path: '/404',
    outFile: '404.html',
    load: () => null,
    head: () => siteHead({ robots: 'noindex' }),
    Page: () => createElement(NotFound),
})

/** Every route, note slugs enumerated from content/ (replaces generateStaticParams). */
export function routes(): AnyRoute[] {
    const notes = findAllNotes().map((note) => noteRoute(note.slug))
    return [home, notesList, ...notes, portfolio, notFound]
}

/** The sitemap's entries: every page but the 404, in Next's order. */
export function sitemapEntries(): { url: string; lastModified: string }[] {
    const today = new Date().toISOString().split('T')[0]
    const statics = ['/', '/notes', '/portfolio'].map((p) => ({ url: absoluteUrl(p), lastModified: today }))
    const notes = findAllNotes().map((note) => ({
        url: absoluteUrl(`/notes/${note.slug}`),
        lastModified: note.metadata.lastmod || note.metadata.date,
    }))
    return [...statics, ...notes]
}
