---
title: "While customizing blog"
date: 2025-04-02
lastmod: 2025-04-05
---
I've been trying to customize my blog on github page for years. 
The first version was using jekyll + github page with a template someone made. 
While using it, I got feeling to customize small parts of the design, and the codes were getting messy.  
  
Now the new version uses `Next.js + react`, and this is a note about it.  
  
# Module: parsing markdown  
Many mdx libraries are providing way to build html elements from markdown text. 
I tried to use that but it got me error like:  
- "cannot use > or < inside the markdown text without explicitly bracing it with {}" 
- "need to use extra plugins for parsing latex syntax"
  
So I changed the plan to use parsing module separately.  
- generate html text not react element
- use [`showdown`](https://github.com/showdownjs/showdown) library for parsing markdown

Example codes are following.
  

__parsing module__  
```typescript
import showdown from "showdown";

// Idk well about actual purpose of below config
// But by using it I could prevent parsing $$ signed latex syntax
// Reason for using this is because I need to keep pure $$ signed text to parse it by latex parser
const converter = new showdown.Converter({
    literalMidWordUnderscores: true,
})

export function parseMarkdownToHtml(markdown: string): string {
    return converter.makeHtml(markdown);
}
```
  
__inserting the parsed html text__  
```html
<div dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(content) }} />
```
  
# Module: Client-side scripts
I used client side scripts for
- redering the latex text in user's browser.  
- highlighting code snippets.
  
```javascript
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
      
      // MathJax v2.x
      if (MathJax.Hub) {
        MathJax.Hub.Queue(['Typeset', MathJax.Hub]);
        
      }else if (MathJax.typeset) {
      // for MathJax v3.x
        MathJax.typeset();
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
    </>
  );
} 
```