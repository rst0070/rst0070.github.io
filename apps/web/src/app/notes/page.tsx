import { NoteList } from "./components"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Notes",
  description:
    "All notes by rst0070 on software engineering, machine learning, and infrastructure.",
  alternates: { canonical: "/notes" },
}

export default function Page() {
  return (
    <section className="max-w-[760px] mx-auto">
      <h1 className="font-semibold text-2xl mb-8 tracking-tighter">rst0070 notes</h1>
      <NoteList />
    </section>
  )
}