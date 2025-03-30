import {Note, NoteMetadata} from '@/core/entities';
import { findAllNoteSlugs, findNoteBySlug } from '@/infra/note';
import { NoteMdx } from './components';

export default async function Page(
  {params,}: {params: Promise<{ slug: string }>}
) {
  const { slug } = await params
  const note = findNoteBySlug(slug)

  return (
    <div>
      <NoteMdx note={note} />
    </div>
  )
}

export async function generateStaticParams() {
  const slugs = findAllNoteSlugs()
  return slugs.map((slug) => ({ slug }))
}

export const dynamicParams = false