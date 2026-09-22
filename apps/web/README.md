# @rst0070/web

The site: a Next.js app exported to static HTML, deployed to GitHub Pages by
`.github/workflows/deploy-web.yaml`. It reads markdown from `../../content` at build time
and ships no server.

```text
src/
├── app/
│   ├── layout.tsx               # site name, metadata, theme init, analytics, the chat widget
│   ├── page.tsx                 # home
│   ├── notes/                   # list, and [slug]/ for one note
│   ├── portfolio/               # renders content/portfolio.md, links portfolio.pdf
│   ├── _chat/                   # the assistant widget (docs/ai-chat.md)
│   ├── sitemap.ts, robots.ts    # baseUrl lives in sitemap.ts
│   └── globals.css              # theme tokens for light and dark
└── infra/
    ├── content.ts               # CONTENT_ROOT: the one path everything derives from
    ├── note.ts, portfolio.ts    # loaders bound to CONTENT_ROOT (rules live in @rst0070/content)
    └── markdown.ts              # showdown -> HTML, Shiki code blocks, mermaid blocks, TOC
scripts/
└── generate-pdf.mjs             # renders /portfolio to out/portfolio.pdf after next build
```

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
pnpm dev          # next dev at http://localhost:3000
pnpm test         # vitest, the chat widget's client code
pnpm build        # next build, then scripts/generate-pdf.mjs
```

`pnpm build` needs Chrome, which puppeteer downloads on install (`pnpm-workspace.yaml`
allows its postinstall). The PDF is written into `out/`, so the Download button on
`/portfolio` only resolves after a production build.

## Environment

| Variable | When | Effect |
|---|---|---|
| `NEXT_PUBLIC_AI_API_URL` | build time | The Worker's URL, inlined into the client. Unset, the chat widget is not rendered. |

Locally, put it in `apps/web/.env.local` or pass it inline:

```sh
NEXT_PUBLIC_AI_API_URL=http://localhost:8787 pnpm dev
```

In CI it comes from the `AI_BACKEND_URL` repository variable.
