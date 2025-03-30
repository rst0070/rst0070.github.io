import {Note, NoteMetadata} from '@/core/entities';
import { findAllNoteSlugs, findNoteBySlug } from '@/infra/note';
import { NoteMdx } from './components';
import { Metadata } from 'next';


export default async function Page(
  {params,}: {params: Promise<{ slug: string }>}
) {
  const { slug } = await params
  const note = findNoteBySlug(slug)

  return (
    <>
      <NoteMdx note={note} />
    </>
  )
}

export async function generateStaticParams() {
  const slugs = findAllNoteSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const note = findNoteBySlug(slug)
  return {
    title: note.metadata.title,
    description: note.metadata.description,
  }
}