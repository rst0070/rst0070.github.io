/**
 * A piece of site content that is embedded and retrieved on its own.
 * Identified by (slug, index): `index` counts from 0 within one slug.
 */
export interface Chunk {
    slug: string
    index: number
    title: string
    /** Heading path inside the document, like "Setup > Install"; empty before the first heading. */
    heading: string
    /** Site path, like "/notes/<slug>" or "/portfolio". */
    url: string
    date?: string
    /** Embedded and shown to the model; starts with "title > heading path". */
    text: string
}
