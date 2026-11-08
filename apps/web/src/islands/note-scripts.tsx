import { useEffect } from 'react';

// MathJax and Mermaid stay on the CDN at the versions the Next build used.
// They are injected on mount, as next/script's afterInteractive did, and run
// once: every page is a full load, so there is no client-side navigation to
// re-typeset after.
const MATHJAX_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.5/MathJax.js?config=TeX-MML-AM_CHTML';
const MERMAID_SRC = 'https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js';

type MathJaxGlobal = {
  Hub: { Config(config: object): void; Queue(...jobs: unknown[]): void };
};
type MermaidGlobal = {
  initialize(config: object): void;
  run(options: { querySelector: string }): void;
};

function injectScript(id: string, src: string, onLoad: () => void) {
  if (document.getElementById(id)) return;
  const script = document.createElement('script');
  script.id = id;
  script.src = src;
  script.async = true;
  script.addEventListener('load', onLoad, { once: true });
  document.body.appendChild(script);
}

function configureMathJax() {
  const MathJax = (window as unknown as { MathJax?: MathJaxGlobal }).MathJax;
  if (!MathJax) return;
  MathJax.Hub.Config({
    tex2jax: {
      inlineMath: [['$', '$']],
      processEscapes: true,
    },
    TeX: {
      extensions: ['AMSmath.js', 'AMSsymbols.js', 'noErrors.js', 'noUndefined.js'],
      Macros: {},
    },
  });
  MathJax.Hub.Queue(['Typeset', MathJax.Hub]);
}

function runMermaid() {
  const mermaid = (window as unknown as { mermaid?: MermaidGlobal }).mermaid;
  if (!mermaid) return;
  // Themed once, from the theme the page loaded with.
  const isDark = document.documentElement.dataset.theme === 'dark';
  mermaid.initialize({ startOnLoad: false, theme: isDark ? 'dark' : 'neutral' });
  try {
    mermaid.run({ querySelector: '.mermaid:not([data-processed])' });
  } catch (error) {
    console.error('Mermaid run error:', error);
  }
}

export function NoteScripts() {
  useEffect(() => {
    injectScript('mathjax-script', MATHJAX_SRC, configureMathJax);
    injectScript('mermaid-script', MERMAID_SRC, runMermaid);
  }, []);

  return null;
}
