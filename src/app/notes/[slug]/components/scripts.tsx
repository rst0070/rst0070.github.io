'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';

export function ClientScripts() {
  const pathname = usePathname();

  // This effect will run on each route change
  useEffect(() => {
    // Process highlight.js if it's loaded
    if (typeof window !== 'undefined' && (window as any).hljs) {
      (window as any).hljs.highlightAll();
    }

    // For MathJax, we need a small delay to ensure content is fully rendered
    if (typeof window !== 'undefined' && (window as any).MathJax) {
      const MathJax = (window as any).MathJax;
      
      // If using MathJax v2.x
      if (MathJax.Hub) {
        MathJax.Hub.Queue(['Typeset', MathJax.Hub]);
      }
      // If using MathJax v3.x
      else if (MathJax.typeset) {
        MathJax.typeset();
      }
    }

    // Process Mermaid if it's loaded
    if (typeof window !== 'undefined' && (window as any).mermaid) {
      try {
        (window as any).mermaid.init();
      } catch (error) {
        console.error('Mermaid init error:', error);
      }
    }
  }, [pathname]); // Re-run this effect when the pathname changes

  return (
    <>
      <Script
        id="hljs-script"
        src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          const hljs = (window as any).hljs;
          hljs.highlightAll();
          console.log('hljs loaded');
        }}
      />
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
          console.log('MathJax loaded');
        }}
      />

      {/* Mermaid */}
      <Script 
        id="mermaid-script"
        src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (typeof (window as any).mermaid !== 'undefined') {
            (window as any).mermaid.initialize({
              startOnLoad: true,
              theme: 'neutral',
            });
          }
        }}
      />
    </>
  );
} 