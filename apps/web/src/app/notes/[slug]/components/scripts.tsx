'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';

export function ClientScripts() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).MathJax) {
      const MathJax = (window as any).MathJax;

      if (MathJax.Hub) {
        MathJax.Hub.Queue(['Typeset', MathJax.Hub]);
      } else if (MathJax.typeset) {
        MathJax.typeset();
      }
    }

    if (typeof window !== 'undefined' && (window as any).mermaid) {
      try {
        (window as any).mermaid.run({ querySelector: '.mermaid:not([data-processed])' });
      } catch (error) {
        console.error('Mermaid run error:', error);
      }
    }
  }, [pathname]);

  return (
    <>
      {/* MathJax */}
      <Script
        id="mathjax-script"
        src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.5/MathJax.js?config=TeX-MML-AM_CHTML"
        strategy="afterInteractive"
        onLoad={() => {
          const MathJax = (window as any).MathJax;
          MathJax.Hub.Config({
            tex2jax: {
              inlineMath: [['$', '$']],
              processEscapes: true,
            },
            TeX: {
              extensions: ["AMSmath.js", "AMSsymbols.js", "noErrors.js", "noUndefined.js"],
              Macros: {}
            },
          });
          MathJax.Hub.Queue(['Typeset', MathJax.Hub]);
        }}
      />

      {/* Mermaid */}
      <Script
        id="mermaid-script"
        src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (typeof (window as any).mermaid !== 'undefined') {
            const mermaid = (window as any).mermaid;
            const isDark = document.documentElement.dataset.theme === 'dark';
            // Script loads afterInteractive (after DOMContentLoaded), so
            // startOnLoad never fires — initialize without it and run manually.
            mermaid.initialize({
              startOnLoad: false,
              theme: isDark ? 'dark' : 'neutral',
            });
            try {
              mermaid.run({ querySelector: '.mermaid:not([data-processed])' });
            } catch (error) {
              console.error('Mermaid run error:', error);
            }
          }
        }}
      />
    </>
  );
}
