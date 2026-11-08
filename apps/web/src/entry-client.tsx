// The browser entry: the site's CSS, and the islands. Pages are static HTML
// written by the prerender; only the marked islands become interactive.
import { createElement } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { ISLAND_ATTR, PROPS_ATTR, islands, isIslandName } from './islands/registry'
import './styles/globals.css'

// Dev only: the CSS import above has injected Vite's <style>, so drop the
// stand-in <link> scripts/dev.ts put in <head>; it would keep stale rules
// after a CSS hot update.
if (import.meta.hot) document.querySelector('link[data-dev-css]')?.remove()

for (const el of document.querySelectorAll<HTMLElement>(`[${ISLAND_ATTR}]`)) {
    const name = el.getAttribute(ISLAND_ATTR) ?? ''
    if (!isIslandName(name)) {
        console.error(`Unknown island "${name}"`)
        continue
    }
    const props = JSON.parse(el.getAttribute(PROPS_ATTR) ?? '{}')
    hydrateRoot(el, createElement(islands[name] as (p: object) => null, props))
}
