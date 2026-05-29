import { findAllNoteSlugs, findNoteBySlug } from '@/infra/note';
import { NoteMdx } from './components/note';
import { ClientScripts } from './components/scripts';
import { CopyButtons } from './components/copy-buttons';
import { MermaidFullscreen } from './components/mermaid-fullscreen';
import { ReadingProgress } from './components/reading-progress';
import { Metadata } from 'next';

export default async function Page(
  {params,}: {params: Promise<{ slug: string }>}
) {
  const { slug } = await params
  const note = findNoteBySlug(slug)

  return (
    <>
      <ReadingProgress />
      <NoteMdx note={note} />
      <ClientScripts />
      <CopyButtons />
      <MermaidFullscreen />
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
