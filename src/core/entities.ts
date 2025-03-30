
export type NoteMetadata = {
    title: string
    date: string
    lastmod: string
    description: string
    tags: string
}

export type Note = {
    metadata: NoteMetadata
    content: string
    slug: string
}