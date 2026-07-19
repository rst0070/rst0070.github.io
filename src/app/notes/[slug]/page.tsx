import { findAllNoteSlugs, findNoteBySlug, getNoteDescription } from '@/infra/note';
import { NoteMdx } from './components/note';
import { ClientScripts } from './components/scripts';
import { CopyButtons } from './components/copy-buttons';
import { MermaidFullscreen } from './components/mermaid-fullscreen';
import { ReadingProgress } from './components/reading-progress';
import { Metadata } from 'next';
import { baseUrl } from '@/app/sitemap';

export default async function Page(
  {params,}: {params: Promise<{ slug: string }>}
) {
  const { slug } = await params
  const note = findNoteBySlug(slug)
  const url = `${baseUrl}/notes/${slug}`
  const description = getNoteDescription(note)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: note.metadata.title,
    description,
    datePublished: note.metadata.date,
    dateModified: note.metadata.lastmod || note.metadata.date,
    author: { '@type': 'Person', name: 'rst0070', url: baseUrl },
    publisher: { '@type': 'Person', name: 'rst0070', url: baseUrl },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    ...(note.metadata.tags
      ? { keywords: note.metadata.tags.split(',').map((t) => t.trim()).filter(Boolean) }
      : {}),
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
      { '@type': 'ListItem', position: 2, name: 'Notes', item: `${baseUrl}/notes` },
      { '@type': 'ListItem', position: 3, name: note.metadata.title, item: url },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
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
  const url = `${baseUrl}/notes/${slug}`
  const description = getNoteDescription(note)

  return {
    title: note.metadata.title,
    description,
    alternates: { canonical: `/notes/${slug}` },
    openGraph: {
      type: 'article',
      title: note.metadata.title,
      description,
      url,
      publishedTime: note.metadata.date,
      modifiedTime: note.metadata.lastmod || note.metadata.date,
      authors: [baseUrl],
      ...(note.metadata.tags
        ? { tags: note.metadata.tags.split(',').map((t) => t.trim()).filter(Boolean) }
        : {}),
    },
    twitter: {
      card: 'summary',
      title: note.metadata.title,
      description,
    },
  }
}
