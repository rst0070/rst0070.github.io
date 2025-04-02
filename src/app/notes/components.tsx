import { findAllNotes } from "@/infra/note"
import Link from "next/link"

export function NoteList() {
  const notes = findAllNotes().sort((a, b) => {
    if (a.metadata.date && b.metadata.date) {
      return b.metadata.date.localeCompare(a.metadata.date)
    }
    return 0
  })

  return (
    <>
      {notes.map((note) => (
        <Link key={note.slug} href={`/notes/${note.slug}`} className="flex flex-col space-y-1 mb-4 max-w-[700px] mx-auto">
            <div className="w-full flex flex-col md:flex-row space-x-0 md:space-x-2">
                <p className="text-neutral-600 dark:text-neutral-400 w-[100px] tabular-nums">{note.metadata.date}</p>
                <p className="text-neutral-900 dark:text-neutral-100 ml-[100px] tracking-tight">{note.metadata.title}</p>
            </div>
        </Link>
      ))}
    </>
  )
}