# Writing a note

A note is one markdown file. Its path decides its URL, its frontmatter decides its title
and date, and pushing it does the rest: the site rebuilds and the assistant learns it.

## Where it goes

```text
content/
├── notes/
│   ├── 26/
│   │   ├── 04-28-utilize-slm.md          # published
│   │   └── _07-30-draft-idea.md          # draft: ignored by the site and the index
│   └── 25/ ...
└── portfolio.md                          # one document, no frontmatter
apps/web/public/assets/notes/
└── 26/04-28/                              # images for that note, any layout works
```

The slug is the year folder joined to the file name. The site and the Worker share the rule
in `packages/content/src/note.ts`, so a note is the same document everywhere:

```text
content/notes/26/04-28-utilize-slm.md
  -> slug  26-04-28-utilize-slm
  -> url   /notes/26-04-28-utilize-slm
  -> the chat widget filters retrieval by this slug on that page
```

Only the last two path segments matter, and nothing else in the path is parsed. A `_`
prefix on the file name makes it a draft.

## Frontmatter

```md
---
title: What a 0.8B Model Can't Do (and What It Actually Can)
date: 2026-04-28
lastmod: 2026-05-02
description: Five attempts at on-device knowledge extraction with Qwen 3.5 0.8B.
tags: llm, on-device, rag
---
```

| Field | Required | Used for |
|---|---|---|
| `title` | yes | Page title, notes list, chunk prefix, citation text |
| `date` | yes | Sort order (newest first), prev/next links, `datePublished` |
| `lastmod` | no | `dateModified` and the sitemap; falls back to `date` |
| `description` | no | Meta description and social cards; falls back to a 160-character excerpt |
| `tags` | no | Comma-separated, becomes `keywords` in the page's JSON-LD |

The parser is deliberately simple: one `key: value` per line, quotes stripped, no nesting.

## What renders specially

````text
```python            -> Shiki highlighting, light and dark themes, a Copy button
```mermaid           -> a diagram rendered in the browser, with a fullscreen button
# Heading            -> an entry in the table of contents and an anchor
![alt](/assets/notes/26/04-28/plot.png)   -> root-absolute, from apps/web/public
````

Headings also decide where the assistant's chunks break, so a note with a heading every
few paragraphs retrieves better than one long wall of text. Code blocks are never split
across chunks.

## What a push does

```text
git push origin main (content/notes/26/04-28-utilize-slm.md)
  deploy-web.yaml
    build                  # next build + portfolio.pdf, then publish to Pages
  ai-backend.yaml
    changes                # index = "changed": only content/ moved
    index
      reindex --paths-from content/notes/26/04-28-utilize-slm.md
        prune to N chunks  # drops chunks the note no longer has
        upsert N chunks    # embeds the new text
```

Renames and deletions work the same way. The old path arrives with no file behind it, so
its slug is removed from the index. Turning a note into a draft by adding `_` does the same.
New vectors take a few seconds to become searchable.

## Checking before pushing

```sh
pnpm dev                                          # the site at http://localhost:3000
pnpm --filter @rst0070/ai-backend reindex --dry-run   # chunk everything, print sizes, send nothing
```

The dry run is also what CI runs on every pull request. It fails on a note that would not
index, and prints the chunk count and the largest chunk's byte size.

## The portfolio

`content/portfolio.md` is plain markdown with no frontmatter. It renders at `/portfolio`
with the same pipeline as a note, indexes under the slug `portfolio`, and is rendered to
`portfolio.pdf` by headless Chrome during the build (see
[apps/web/README.md](../apps/web/README.md)).
