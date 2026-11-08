# @rst0070/web

The site: React pages prerendered to static HTML by Vite and a script of our own, deployed
to GitHub Pages by `.github/workflows/deploy-web.yaml`. It reads markdown from
`../../content` at build time and ships no server. In the browser only the islands run
(theme toggle, TOC, reading progress, copy buttons, MathJax/Mermaid, the chat); every link is
a full page load.

```text
index.html                       # document template: theme init, analytics, favicon, client entry
vite.config.ts                   # the client build (islands bundle + CSS) into dist/
src/
├── routes.ts                    # every route: path -> output file, data loader, page, head
├── head.ts                      # Head type, site name, description, baseUrl
├── entry-server.tsx             # build time only: renders a route into the template
├── entry-client.tsx             # mounts the islands named by the server's markers
├── pages/                       # plain React: Layout, Home, NotesList, Note, Portfolio, NotFound
├── islands/                     # theme toggle, toc, progress, copy, note-scripts, chat/ (docs/ai-chat.md)
├── styles/globals.css           # theme tokens for light and dark
└── infra/                       # build time only, never imported by the client
    ├── content.ts               # CONTENT_ROOT: the one path everything derives from
    ├── note.ts, portfolio.ts    # loaders bound to CONTENT_ROOT (rules live in @rst0070/content)
    └── markdown.ts              # showdown -> HTML, Shiki code blocks, mermaid blocks, TOC
scripts/
├── dev.ts                       # `pnpm dev`: renders each route on request, Vite for the client
├── prerender.ts                 # routes -> dist/*.html, sitemap.xml, robots.txt, 404.html
└── generate-pdf.mjs             # renders /portfolio to dist/portfolio.pdf after the prerender
```

Pages are written as `dist/notes/<slug>.html`, not `<slug>/index.html`: Pages serves
`/notes/<slug>` from the former and would redirect the latter to a trailing slash.

## What a note page does

- Markdown through showdown with GitHub-style heading IDs and tables.
- Code blocks highlighted by Shiki at build time, both `github-light` and `github-dark`,
  with a language label and a Copy button.
- Mermaid blocks rendered in the browser, with a fullscreen button.
- A table of contents from the headings, a reading progress bar, prev and next by date.
- `BlogPosting` and `BreadcrumbList` JSON-LD, Open Graph and Twitter cards, a sitemap and
  robots.txt.
- Light and dark theme, chosen from `localStorage` then the OS, applied before first paint.

## Commands

```sh
pnpm dev          # every route at http://localhost:3000 (PORT to change), with HMR
pnpm build        # vite build, scripts/prerender.ts, then scripts/generate-pdf.mjs
pnpm test         # vitest: client helpers, plus checks over dist/ (run after a build)
```

`pnpm build` needs Chrome, which puppeteer downloads on install (`pnpm-workspace.yaml`
allows its postinstall). The PDF is written into `dist/`, so the Download button on
`/portfolio` only resolves after a production build. To look at the build the way Pages serves it:

```sh
npx serve -l 4173 dist   # resolves /notes/<slug> to notes/<slug>.html
```

## Environment

| Variable | When | Effect |
|---|---|---|
| `VITE_AI_API_URL` | build time | The Worker's URL, inlined into the client. Unset, the chat widget is not rendered. |

Locally, put it in `apps/web/.env.local` or pass it inline:

```sh
VITE_AI_API_URL=http://localhost:8787 pnpm dev
```

In CI it comes from the `AI_BACKEND_URL` repository variable.
