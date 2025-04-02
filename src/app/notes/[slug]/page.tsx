import { findAllNoteSlugs, findNoteBySlug } from '@/infra/note';
import { NoteMdx } from './components';
import { Metadata } from 'next';
import Script from 'next/script';

export default async function Page(
  {params,}: {params: Promise<{ slug: string }>}
) {
  const { slug } = await params
  const note = findNoteBySlug(slug)

  return (
    <>
      <NoteMdx note={note} />
      {/* MathJax */}
      <Script
          id="mathjax-script"
          src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.5/MathJax.js?config=TeX-MML-AM_CHTML"
          strategy="lazyOnload"
        >
          {`
            MathJax.Hub.Config({
              tex2jax: {
                inlineMath: [['$', '$']]
              }
            });
            console.log('MathJax loaded');
          `}
      </Script>
      {/* Mermaid */}
      <Script id="mermaid-config" strategy="afterInteractive">
        {`
          if (typeof mermaid !== 'undefined') {
            mermaid.initialize({
              startOnLoad: true,
              theme: 'neutral',
              // Add more configuration options as needed
            });
          }
        `}
      </Script>

      <Script 
        id="mermaid-script"
        src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"
        strategy="afterInteractive"
      />
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