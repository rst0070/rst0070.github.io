import { readPortfolio } from '@/infra/portfolio'
import { parseMarkdownToHtml, extractToc } from '@/infra/markdown'
import { Toc } from '@/app/notes/[slug]/components/toc'
import { ClientScripts } from '@/app/notes/[slug]/components/scripts'
import { CopyButtons } from '@/app/notes/[slug]/components/copy-buttons'
import { MermaidFullscreen } from '@/app/notes/[slug]/components/mermaid-fullscreen'
import { ReadingProgress } from '@/app/notes/[slug]/components/reading-progress'
import { baseUrl } from '@/app/sitemap'
import type { Metadata } from 'next'

const title = 'Portfolio'
const description =
  'Portfolio of Wonbin Kim — AI Engineer with production experience across the full LLM agent stack: agent orchestration, sandboxed agent governance, evaluation pipelines, multimodal RAG, and conversation memory.'
const url = `${baseUrl}/portfolio`

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Wonbin Kim',
  alternateName: 'rst0070',
  url,
  jobTitle: 'AI Engineer',
  description: `${description} Based in Taipei and open to relocation to Singapore.`,
  email: 'mailto:kwb0711@gmail.com',
  homeLocation: {
    '@type': 'Place',
    name: 'Taipei, Taiwan',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Taipei',
      addressCountry: 'TW',
    },
  },
  sameAs: [
    'https://github.com/rst0070',
    'https://www.linkedin.com/in/wonbin-kim-7263a7184/',
    'https://huggingface.co/rst0070',
    'https://rst0070.github.io/notes',
  ],
  worksFor: [
    { '@type': 'Organization', name: 'MaiAgent' },
    { '@type': 'Organization', name: 'Wrtn Technologies' },
  ],
}

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/portfolio' },
  openGraph: {
    type: 'profile',
    title,
    description,
    url,
  },
  twitter: {
    card: 'summary',
    title,
    description,
  },
}

export default async function Page() {
  const markdown = readPortfolio()
  const html = await parseMarkdownToHtml(markdown)
  const toc = extractToc(html)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ReadingProgress />
      <div className="post-layout">
        <article className="post-article">
          <div
            className="prose post-body"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </article>
        <aside className="post-toc-wrapper">
          <Toc items={toc} />
        </aside>
      </div>
      <ClientScripts />
      <CopyButtons />
      <MermaidFullscreen />
    </>
  )
}
