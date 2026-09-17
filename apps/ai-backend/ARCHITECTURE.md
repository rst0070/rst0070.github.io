# ai-backend architecture

A Cloudflare Worker that answers chats about the site's content with
retrieval-augmented generation: Workers AI for embeddings and chat, Vectorize
for the chunk index. Plan and history: #20 (feature), #26 (this package).

Keep this document current when layers, rules or contracts change.

## HTTP API

| Endpoint | Auth | Request | Response |
|---|---|---|---|
| `POST /chat` | public, rate limited | `{ messages: { role: 'user' \| 'assistant', content: string }[], slug?: string }` | `{ message: { role: 'assistant', content: string }, citations: { slug, title, url }[] }`, or a stream with `Accept: text/event-stream` |
| `POST /admin/reindex` | `Authorization: Bearer <REINDEX_SECRET>` | `{ chunks: Chunk[] }` (at most 200) | `{ upserted: number }` |

- The Worker is stateless. The client holds the conversation and sends it every turn.
- `system` is not an accepted role. The system prompt is always built on the server.
- Citations are not sent back. Every turn retrieves again. Citation `n` is source `[n + 1]` in the answer.
- On a note page, the client sends that note's `slug` every turn and retrieval is limited to it.
- **Streaming.** With `Accept: text/event-stream`, `/chat` answers with server-sent events:
  - `citations` `{ citations }`, once, before any text
  - `delta` `{ text }`, repeated
  - `done` `{}`; or `error` `{ error: code }` if generation fails after the stream has started
  Anything that refuses the turn earlier (bad request, rate limit, `ChatError`, a model refusing the call) is an ordinary JSON error. A client that disconnects stops generation.
- **CORS.** `/chat` answers preflights and adds `Access-Control-Allow-Origin` (errors included) for origins in `ALLOWED_ORIGINS`. It is not access control: non-browser clients ignore it. `/admin/reindex` has no CORS.
- **Rate limit.** `/chat` counts requests per `CF-Connecting-IP` with the `CHAT_RATE_LIMITER` binding (5 a minute), before reading the body. The count is per Cloudflare location and eventually consistent; the Free plan's daily Neuron allocation is the hard ceiling.
- Errors are `{ error: code }` with these statuses:
  - Request shape: 400.
  - `ChatError`: 400, except `no-source`, which is 404.
  - `ModelError`: `quota-exhausted` is 503, `rate-limited` is 429, `unknown` is 502.
  - Auth: 401.
  - Rate limit (`too-many-requests`): 429.
  - Unknown path: 404. Wrong method: 405.
  - Anything else: 500.

## Layers

Ports and adapters. Business logic in `src/core` is pure. Everything
Cloudflare-specific is delivered to it through constructors.

```
index.ts          Worker entry: env → bindings + secret → DiContainer → route
  ↓
http/             routing, auth, CORS, rate limit, parsing, event streams, status mapping (consumes usecases only)
  ↓ usecase instances, received as deps
core/             entity, port, repository, usecase, service, error, config (pure)
  ↓ interfaces (core/port, core/repository)
repositories/     ChunkRepository over Vectorize
adapter/          EmbeddingPort, LlmPort over Workers AI
  ↓ handles, injected
platform          env.AI, env.VECTORIZE (handed in by index.ts, never imported)
```

```
src/
  index.ts                 Worker entry
  diContainer.ts           the only module naming concrete classes
  modelCatalog.ts          EMBEDDING_MODEL, CHAT_MODEL
  core/
    entity/                chat (Message, ChatInput, ChatReply, Citation), chunk, llm
    port/                  EmbeddingPort, LlmPort
    repository/            ChunkRepository
    error/                 ChatError, ModelError
    usecase/               ChatUsecase (+ assertChattable, contextWindow, retrievalQuery), ReindexUsecase
    service/               prompt, citation, chunking (chunking is used by script/, not the Worker)
    config.ts              CHAT_POLICY, LLM_PRESETS, CHUNKING_POLICY
  adapter/                 WorkersAiEmbeddingAdapter, WorkersAiLlmAdapter, Workers AI error mapping
  repositories/            VectorizeChunkRepository
  http/                    router, auth, cors, request parsing, respond, eventStream, route/{chat,reindex}
script/                    Node entry points run with tsx: reindex.ts, ask.ts
```

## Layer rules

1. **Core imports nothing but core and pure packages.** Core may import other `core/` files and `@rst0070/content` (the pure entry). Anything else is banned, including `@rst0070/content/node`. Enforced by ESLint as an allowlist.
2. **Core uses ECMAScript only.** No `fetch`, `Request`, `crypto`, `TextEncoder`, `console` or `process`. `tsconfig.core.json` (`lib: ["ES2022"]`, `types: []`) enforces this as an allowlist, because core runs in both workerd and Node.
3. **Ports wrap the outside world; repositories store our own entities.** Workers AI is a port. Vectorize stores our chunks, so it is behind a repository.
4. **Storage details stop at the repository.** Core identifies a chunk by `(slug, index)`. These live only in `VectorizeChunkRepository`:
   - the vector ID (hex SHA-256, 64 bytes)
   - metadata keys and filter syntax
   - `topK` and upsert batch limits
   - `crypto.subtle`
5. **Vendor details stop at the adapter.** Request and response shapes, batch sizes and error codes live in `adapter/`. Model ids come from `modelCatalog.ts` through the container.
6. **Core throws core's types.** Adapters map platform failures to `ModelError`. `http/respond.ts` maps core errors to statuses.
7. **Adapters and repositories import only `core/entity`, `core/port`, `core/repository` and `core/error`.**
8. **`http/` consumes usecases only**, plus core entities and errors. It never imports adapters, repositories, ports or services. Each route declares a `*Deps` interface, and `DiContainer` implements them all. HTTP-only concerns (the rate limiter, allowed origins) are declared in `http/` too and handed through the container; core never sees them.
9. **Usecases are classes whose dependencies arrive in the constructor.** Dep-free policy is a module-level export beside its usecase.
10. **Dependencies are delivered, never fetched.** Only `index.ts` reads `env`. `import { env } from 'cloudflare:workers'` is banned everywhere else.
11. **One container per request, no module-level mutable state.** An isolate serves many visitors.
12. **`script/` is its own entry.** It may import `core/entity`, `core/service` and `@rst0070/content/node`. Its HTTP calls are plain `fetch`.
13. **`diContainer.ts` is imported only by `index.ts`** and its own test.

Enforcement:
- ESLint (`eslint.config.js`) enforces rules 1, 7, 8, 10, 12 and 13, using `import-x/no-restricted-paths` zones and `no-restricted-imports`.
- `tsconfig.core.json` enforces rule 2.
- A `__tests__` directory obeys the zone of the layer it lives in. The exception is `src/__tests__/diContainer.test.ts`.

## Chat turn

`ChatUsecase.start`, with values from `CHAT_POLICY` and `LLM_PRESETS`:

1. **Validate** with `assertChattable`. There must be at least one message, the last one must be a non-blank user message, and every message must be ≤ `maxMessageLength`.
2. **Take the context window** with `contextWindow`: the last 6 messages. Assistant messages left at the front by the cut are dropped.
3. **Build the retrieval query** with `retrievalQuery`: the window's user messages only, newest first, truncated to `maxRetrievalQueryLength`.
4. **Retrieve.** Embed the query and search for the top 5 chunks, filtered by `slug` when given. No chunks means `ChatError('no-source')`.
5. **Build the system prompt** with `buildSystemPrompt`. It contains:
   - grounding and language rules
   - the sources numbered one per note, each with its title and URL
   - when `slug` is set, the page the reader is on
6. **Start the completion** with `[system, ...window]`. `ChatUsecase.start` resolves once the model has accepted the call, with `citationsFrom(chunks)` (one citation per slug, in rank order) and the answer's text as an async iterable, so every refusal above happens before any text.
7. **Reply.** `/chat` streams the text as events, or `ChatUsecase.reply` collects it into one message.

`LlmPort.stream` is the only completion call. `WorkersAiLlmAdapter` requests `stream: true`, reads the Workers AI event stream (Chat Completions chunks; reasoning deltas are skipped), and fails with `ModelError('unknown')` if the stream ends without answer text, which is also what happens when reasoning uses up `maxTokens`.

## Indexing

Chunking runs in `script/reindex.ts`, not the Worker, because the Free plan's CPU limit is too small for it.

`chunkNote` / `chunkPortfolio` (`core/service/chunking.ts`):
- **Where chunks break.** A chunk breaks at `#`–`###` headings once it holds `minTokens`, and by size at `maxTokens`. Tokens are estimated at about 4 ASCII characters, or 1 other character, per token.
- **Code.** A fenced code block (including mermaid) is never split.
- **Overlap.** A chunk that ends mid-section repeats up to `overlapTokens` of trailing sentences in the next chunk.
- **Prefix.** Each chunk's text starts with `title > heading path`.
- **Byte cap.** The text is capped at `maxTextBytes` of UTF-8, because it is stored in Vectorize metadata (10 KiB limit).
- **Slugs and URLs.** Notes use `/notes/<slug>`. The portfolio uses slug `portfolio`, URL `/portfolio`, and has no date.

`ReindexUsecase` embeds the chunk texts and upserts them. It only upserts: vectors for deleted or shortened notes stay in the index until stale-vector deletion exists (Phase 3).

## Running

One-time setup:

```sh
pnpm --filter @rst0070/ai-backend exec wrangler login
# Create both before inserting anything: vectors inserted before the metadata
# index exists are not filterable by slug.
pnpm --filter @rst0070/ai-backend exec wrangler vectorize create rst0070-content --dimensions=1024 --metric=cosine
pnpm --filter @rst0070/ai-backend exec wrangler vectorize create-metadata-index rst0070-content --propertyName=slug --type=string
cp apps/ai-backend/.dev.vars.example apps/ai-backend/.dev.vars   # then set REINDEX_SECRET; it also allows localhost:3000
```

Every run, from `apps/ai-backend`:

```sh
pnpm dev                                  # wrangler dev; AI and Vectorize are remote bindings
pnpm reindex                              # chunk content and POST it to localhost:8787
pnpm ask script/questions.example.json    # run conversations against /chat
```

To try the site's chat widget (`apps/web/src/app/_chat`) against it, run the
site with the Worker's URL (the widget is not rendered without it):

```sh
NEXT_PUBLIC_AI_API_URL=http://localhost:8787 pnpm --filter @rst0070/web dev
```

`wrangler dev` uses the real Workers AI and Vectorize, and spends the same daily
Neurons as production. New vectors take a few seconds to become searchable.

Checks: `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm types:check`.
After changing `wrangler.jsonc` or `src/index.ts`, run `pnpm types` to
regenerate `worker-configuration.d.ts`.
