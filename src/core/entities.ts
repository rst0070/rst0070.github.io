
export type NoteMetadata = {
    title: string
    date: string
    tags: string
}

export type Note = {
    metadata: NoteMetadata
    content: string
    slug: string
}