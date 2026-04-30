import { NoteList } from "./components"

export default function Page() {
  return (
    <section className="max-w-[760px] mx-auto">
      <h1 className="font-semibold text-2xl mb-8 tracking-tighter">rst0070 notes</h1>
      <NoteList />
    </section>
  )
}