// Build time (and dev server) only: renders one route to the body HTML and
// the <head> tags that go into the index.html template. Never imported by the
// client entry or an island.
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { type Alternates, type Head, absoluteUrl, defaultLang } from '@/head'
import { Layout } from '@/pages/Layout'
import type { AnyRoute } from '@/routes'

export { notFound, routes, sitemapEntries } from '@/routes'

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

const meta = (attr: 'name' | 'property', key: string, content: string | number) =>
    `<meta ${attr}="${key}" content="${escapeHtml(String(content))}"/>`

/** JSON for an inline <script>: "<" escaped so content can never close the tag. */
function scriptJson(value: object): string {
    return JSON.stringify(value).replace(/</g, '\\u003c')
}

/** One hreflang link per language, then x-default (the default language's version). Only for a page with translations. */
function hreflangLinks(alternates: Alternates | undefined): string[] {
    const entries = Object.entries(alternates ?? {})
    if (entries.length < 2) return []
    const link = (lang: string, href: string) =>
        `<link rel="alternate" hreflang="${lang}" href="${escapeHtml(absoluteUrl(href))}"/>`
    const fallback = alternates?.[defaultLang]
    return [...entries.map(([lang, href]) => link(lang, href)), ...(fallback ? [link('x-default', fallback)] : [])]
}

/** Serializes a Head in the order Next's metadata API wrote the same tags. */
export function renderHead(head: Head): string {
    const { openGraph: og, twitter } = head
    const tags = [
        `<title>${escapeHtml(head.title)}</title>`,
        meta('name', 'description', head.description),
        ...(head.robots ? [meta('name', 'robots', head.robots)] : []),
        `<link rel="canonical" href="${escapeHtml(absoluteUrl(head.canonical))}"/>`,
        ...hreflangLinks(head.alternates),
        meta('property', 'og:title', og.title),
        meta('property', 'og:description', og.description),
        meta('property', 'og:url', og.url),
        ...(og.siteName ? [meta('property', 'og:site_name', og.siteName)] : []),
        ...og.images.flatMap((image) => [
            meta('property', 'og:image', absoluteUrl(image.url)),
            ...(image.width ? [meta('property', 'og:image:width', image.width)] : []),
            ...(image.height ? [meta('property', 'og:image:height', image.height)] : []),
            ...(image.alt ? [meta('property', 'og:image:alt', image.alt)] : []),
        ]),
        meta('property', 'og:type', og.type),
        ...(og.publishedTime ? [meta('property', 'article:published_time', og.publishedTime)] : []),
        ...(og.modifiedTime ? [meta('property', 'article:modified_time', og.modifiedTime)] : []),
        ...(og.authors ?? []).map((author) => meta('property', 'article:author', author)),
        ...(og.tags ?? []).map((tag) => meta('property', 'article:tag', tag)),
        meta('name', 'twitter:card', twitter.card),
        meta('name', 'twitter:title', twitter.title),
        meta('name', 'twitter:description', twitter.description),
        ...twitter.images.map((image) => meta('name', 'twitter:image', absoluteUrl(image))),
        ...head.jsonLd.map((block) => `<script type="application/ld+json">${scriptJson(block)}</script>`),
    ]
    return tags.join('\n    ')
}

export type Rendered = { html: string; head: string; lang: string }

export async function render(route: AnyRoute): Promise<Rendered> {
    const data = await route.load()
    const lang = route.lang ?? defaultLang
    // The dropdown gets the page's language and its versions, nothing else.
    const alternates: Alternates = route.alternates ?? { [lang]: route.path }
    const html = renderToString(
        createElement(Layout, { lang, alternates }, createElement(route.Page, { data })),
    )
    return { html, head: renderHead(route.head(data)), lang }
}

const SLOTS = ['<!--app-lang-->', '<!--app-head-->', '<!--app-html-->'] as const

/** Fills index.html's slots with a rendered route; the slot comments go with them. */
export function fillTemplate(template: string, { html, head, lang }: Rendered): string {
    for (const slot of SLOTS) {
        if (!template.includes(slot)) throw new Error(`index.html is missing the ${slot} slot`)
    }
    return template
        .replace('<!--app-lang-->', () => escapeHtml(lang))
        .replace('<!--app-head-->', () => head)
        .replace('<!--app-html-->', () => html)
}

/** The whole document for one route: what the prerender writes and the dev server answers. */
export async function renderDocument(template: string, route: AnyRoute): Promise<string> {
    return fillTemplate(template, await render(route))
}
