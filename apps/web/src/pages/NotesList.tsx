import type { Note } from "@rst0070/content"

export type NotesListData = { notes: Note[] }

/** Newest first; notes without a date keep their load order. */
export function sortNotesForList(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    if (a.metadata.date && b.metadata.date) {
      return b.metadata.date.localeCompare(a.metadata.date)
    }
    return 0
  })
}

export function NotesList({ data }: { data: NotesListData }) {
  return (
    <section className="max-w-[760px] mx-auto">
      <h1 className="font-semibold text-2xl mb-8 tracking-tighter">rst0070 notes</h1>
      {data.notes.map((note) => (
        <a key={note.slug} href={`/notes/${note.slug}`} className="flex flex-col space-y-1 mb-4 max-w-[700px] mx-auto">
            <div className="w-full flex flex-col md:flex-row space-x-0 md:space-x-2">
                <p className="text-neutral-600 dark:text-neutral-400 w-[100px] tabular-nums">{note.metadata.date}</p>
                <p className="text-neutral-900 dark:text-neutral-100 ml-[100px] tracking-tight">{note.metadata.title}</p>
            </div>
        </a>
      ))}
    </section>
  )
}
