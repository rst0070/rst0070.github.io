# Make it yours

Forking this repo gives you the site and the assistant. This page is the path from fork
to a running copy, and the list of every place my name is hardcoded. Budget an hour; the
Cloudflare and GitHub setup is most of it.

## 1. Fork and rename

A GitHub *user site* must live in a repo named `<user>.github.io`. That is what keeps
`basePath` empty in `apps/web/next.config.ts`. A project site (`<user>.github.io/<repo>`)
needs a `basePath`, and every root-absolute asset path in `content/` would need it too.

```sh
gh repo fork rst0070/rst0070.github.io --clone --fork-name <user>.github.io
cd <user>.github.io
corepack enable && pnpm install
```

## 2. Create the Cloudflare resources

Both Workers AI and Vectorize are on the Free plan. Create the metadata index before
inserting anything, or the vectors will not be filterable by page.

```sh
cd apps/ai-backend
pnpm exec wrangler login
pnpm exec wrangler vectorize create <index-name> --dimensions=1024 --metric=cosine
pnpm exec wrangler vectorize create-metadata-index <index-name> --propertyName=slug --type=string
```

`1024` is the dimension of `@cf/baai/bge-m3`. Pick another embedding model and the number
changes with it.

## 3. Replace the identity

Each block is the current value and what to change. Search for `rst0070`, `Wonbin` and
`kwb0711` afterwards to catch anything this list misses.

The Worker's name, its index, and which site may call it:

```diff
 # apps/ai-backend/wrangler.jsonc
-    "name": "rst0070-ai-backend",
+    "name": "<user>-ai-backend",
 ...
-            "index_name": "rst0070-content",
+            "index_name": "<index-name>",
 ...
-        "ALLOWED_ORIGINS": "https://rst0070.github.io"
+        "ALLOWED_ORIGINS": "https://<user>.github.io"
```

What the model is told it is answering about:

```diff
 # apps/ai-backend/src/core/service/prompt.ts
-        'You answer questions about rst0070.github.io, the personal site of Wonbin Kim (rst0070): its notes and the portfolio.',
+        'You answer questions about <user>.github.io, the personal site of <Name> (<user>): its notes and the portfolio.',
```

The site's name, description, canonical URL, and analytics:

```diff
 # apps/web/src/app/layout.tsx
-const siteName = "rst0070 - notes";
-const siteDescription =
-  "Notes on software engineering, machine learning, and infrastructure by rst0070.";
+const siteName = "<user> - notes";
+const siteDescription = "...";
 ...
-const gaMeasurementId = "G-CDVVPEEMR0";
+const gaMeasurementId = "G-XXXXXXXXXX";   // or remove the three gtag lines in <head>
```

```diff
 # apps/web/src/app/sitemap.ts
-export const baseUrl = 'https://rst0070.github.io'
+export const baseUrl = 'https://<user>.github.io'
```

The portfolio page carries a `Person` JSON-LD block and its own metadata. Rewrite the
constants at the top of the file, and the download name:

```diff
 # apps/web/src/app/portfolio/page.tsx
-const title = 'Wonbin Kim - AI Engineer | Portfolio'
-const description = 'Portfolio of Wonbin Kim — ...'
-const jsonLd = { '@type': 'Person', name: 'Wonbin Kim', ... }
+const title = '<Name> - <Role> | Portfolio'
+const description = '...'
+const jsonLd = { '@type': 'Person', name: '<Name>', ... }
 ...
-              download="Wonbin-Kim-Portfolio.pdf"
+              download="<Name>-Portfolio.pdf"
```

The PDF footer and the Worker URL the site falls back to when no variable is set:

```diff
 # apps/web/scripts/generate-pdf.mjs
-    <span>Wonbin Kim — Portfolio</span>
+    <span><Name> — Portfolio</span>
```

```diff
 # .github/workflows/deploy-web.yaml
-          NEXT_PUBLIC_AI_API_URL: ${{ vars.AI_BACKEND_URL || 'https://rst0070-ai-backend.kwb0711.workers.dev' }}
+          NEXT_PUBLIC_AI_API_URL: ${{ vars.AI_BACKEND_URL }}
```

The empty-state suggestions in the widget mention my topics:

```diff
 # apps/web/src/app/_chat/chat-panel.tsx
-const SITE_SUGGESTIONS = ['What does the author work on?', 'Which notes are about Kubernetes?'];
+const SITE_SUGGESTIONS = ['What does the author work on?', 'Which notes are about <topic>?'];
```

Files to delete, not edit. They verify *my* ownership with Google, Naver, and AdSense:

```diff
 apps/web/public/
-├── ads.txt
-├── google46bad5644771cd27.html
-├── naver1e2feb11078d7ad32b6f3b4e53609e3c.html
 ├── og-image.jpg                # replace with yours, 1254×1254 is what layout.tsx declares
 └── assets/                     # my note images and portfolio media, replace with yours
 apps/web/src/app/
 └── icon.jpg                    # replace: the favicon
```

And the content itself:

```diff
 content/
-├── notes/20 ... 26/            # my notes
-└── portfolio.md                # my portfolio
+├── notes/<yy>/<mm-dd-slug>.md  # see writing.md for the format
+└── portfolio.md                # any markdown, no frontmatter
```

`LICENSE` covers the code. Add your own notice for your content.

## 4. Set the Worker's secret

The Worker reads `REINDEX_SECRET` to authorize `/admin/reindex`. Deployed, it comes from
Cloudflare, not from the repo:

```sh
cd apps/ai-backend
pnpm exec wrangler secret put REINDEX_SECRET      # paste a long random string
cp .dev.vars.example .dev.vars                     # and put the same string there for local runs
```

## 5. Wire GitHub

The Worker workflow deploys from a `cloudflare` environment. Create it under
Settings → Environments, restricted to `main`, and add:

| Kind | Name | Value |
|---|---|---|
| Environment secret | `CLOUDFLARE_API_TOKEN` | An API token with the "Edit Cloudflare Workers" template, plus Vectorize and Workers AI access |
| Environment secret | `REINDEX_SECRET` | The same string as in step 4 |
| Repository variable | `CLOUDFLARE_ACCOUNT_ID` | From the Workers overview page |
| Repository variable | `AI_BACKEND_URL` | `https://<user>-ai-backend.<subdomain>.workers.dev`, shown after the first deploy |

`AI_BACKEND_URL` does double duty: the index job posts to it, and the site build inlines it
into the widget as `NEXT_PUBLIC_AI_API_URL`.

Then Settings → Pages → Source: **GitHub Actions**. The Pages workflow uploads its own
artifact and needs no branch.

## 6. First deploy

The Worker has to exist before the index can be filled, and `AI_BACKEND_URL` is only known
after the Worker exists. So the first run is two pushes, or one push and one manual run:

```text
push to main
  ai-backend.yaml
    check                 # lint, test, chunk everything as a dry run
    deploy                # creates the Worker; note its URL
    index                 # fails: AI_BACKEND_URL is not set yet
  deploy-web.yaml
    build + deploy        # the site is live, widget pointed at an empty variable

set AI_BACKEND_URL
Actions -> ai-backend -> Run workflow, reindex: all
  deploy
  index                 # embeds every note, a few minutes
Actions -> Deploy Next.js site to Pages -> Run workflow
  build                 # now inlines the real URL, the widget appears
```

After that, every push does the right thing on its own: content-only pushes reindex what
changed, Worker pushes redeploy, and anything touching chunking or the models reindexes
everything.

## 7. Check

```sh
curl -sS https://<user>-ai-backend.<subdomain>.workers.dev/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"What is this site about?"}]}'
```

A JSON answer with `citations` means the index is filled and the model is reachable. A
`no-source` error means the index is empty. Open the site and the launcher button should
be in the bottom corner.
