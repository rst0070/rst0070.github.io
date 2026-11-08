// What each page puts in <head>, as data. Replaces Next's `metadata` /
// `generateMetadata`: routes.ts builds a Head per page from these defaults,
// and entry-server serializes it.

export const baseUrl = 'https://rst0070.github.io'
export const siteName = 'rst0070 - notes'
export const siteDescription =
    'Notes on software engineering, machine learning, and infrastructure by rst0070.'

/** The languages a page can be in. `en` is the default; `ko` is spelled the same in files, URLs, `lang` and storage. */
export type Lang = 'en' | 'ko'
export const defaultLang: Lang = 'en'

/** A page's versions by language, as site paths. Known at build time. */
export type Alternates = Partial<Record<Lang, string>>

export type HeadImage = { url: string; width?: number; height?: number; alt?: string }

export type Head = {
    /** Already templated, e.g. "Note title | rst0070"; home uses the site name. */
    title: string
    description: string
    /** A path, resolved against baseUrl. */
    canonical: string
    openGraph: {
        type: 'website' | 'article' | 'profile'
        title: string
        description: string
        url: string
        siteName?: string
        images: HeadImage[]
        publishedTime?: string
        modifiedTime?: string
        authors?: string[]
        tags?: string[]
    }
    twitter: {
        card: 'summary' | 'summary_large_image'
        title: string
        description: string
        images: string[]
    }
    /** e.g. "noindex" on the 404 page. */
    robots?: string
    /** Serialized into <script type="application/ld+json">. */
    jsonLd: object[]
    /**
     * Other-language versions of this page. With more than one entry, the head
     * gets an hreflang link per language plus x-default (the default language).
     */
    alternates?: Alternates
}

/** "%s | rst0070", the title template every page but home uses. */
export function pageTitle(title: string): string {
    return `${title} | rst0070`
}

/** A site path or URL as an absolute URL; "/" is the bare origin, as Next wrote it. */
export function absoluteUrl(pathOrUrl: string): string {
    if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl
    return pathOrUrl === '/' ? baseUrl : `${baseUrl}${pathOrUrl}`
}

const ogImage: HeadImage = { url: '/og-image.jpg', width: 1254, height: 1254, alt: 'rst0070' }

/**
 * The site-wide Open Graph and Twitter cards. A page that sets none of its own
 * inherits these unchanged, url included, as it did under Next's layout
 * metadata.
 */
export const siteOpenGraph: Head['openGraph'] = {
    type: 'website',
    siteName,
    title: siteName,
    description: siteDescription,
    url: baseUrl,
    images: [ogImage],
}

export const siteTwitter: Head['twitter'] = {
    card: 'summary',
    title: siteName,
    description: siteDescription,
    images: [ogImage.url],
}
