// Loads MathJax and Mermaid from the CDN after the page is parsed, with the
// configuration the Next build used (next/script afterInteractive + onLoad).
// Until the note-scripts island exists this is a plain inline script, so the
// static pages, and the portfolio PDF rendered from them, keep math and
// diagrams.
export const MATHJAX_SRC =
  "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.5/MathJax.js?config=TeX-MML-AM_CHTML";
export const MERMAID_SRC = "https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js";

const loader = `(function(){
function load(id,src,onload){var s=document.createElement('script');s.id=id;s.src=src;s.onload=onload;document.body.appendChild(s);}
function run(){
load('mathjax-script',${JSON.stringify(MATHJAX_SRC)},function(){var M=window.MathJax;M.Hub.Config({tex2jax:{inlineMath:[['$','$']],processEscapes:true},TeX:{extensions:["AMSmath.js","AMSsymbols.js","noErrors.js","noUndefined.js"],Macros:{}}});M.Hub.Queue(['Typeset',M.Hub]);});
load('mermaid-script',${JSON.stringify(MERMAID_SRC)},function(){var m=window.mermaid;if(!m)return;m.initialize({startOnLoad:false,theme:document.documentElement.dataset.theme==='dark'?'dark':'neutral'});try{m.run({querySelector:'.mermaid:not([data-processed])'});}catch(e){console.error('Mermaid run error:',e);}});
}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',run);}else{run();}
})();`;

export function NoteScripts() {
  return <script dangerouslySetInnerHTML={{ __html: loader }} />;
}
