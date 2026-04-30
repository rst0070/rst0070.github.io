---
title: What a 0.8B Model Can't Do (and What It Actually Can)
date: 2026-04-28
---
[OffNote AI](https://apps.apple.com/us/app/offnote-ai/id6762131607) is a knowledge app that runs entirely on-device — no cloud, no API calls. When a user saves a memo, the app extracts searchable knowledge so a chat feature can answer questions about it later (RAG).

This is a record of five attempts to do that extraction with Qwen 3.5 0.8B (Q4), and what the model can and can't handle.

# The Constraint

- **Model:** Qwen 3.5 0.8B, Q4 quantized
- **Runtime:** On-device via llama.cpp (React Native binding)
- **Context window:** 2048 tokens
- **No cloud fallback.** Everything runs locally.

A 0.8B model sounds too small for NLP extraction. The real question is _which_ extraction tasks fail — and which ones don't.

# Attempt 1: Knowledge Graph with JSON Schema

**Goal:** The standard knowledge-graph approach. Extract entities (people, places, organizations) and relations (founded, works_at, located_in) as structured JSON, using GBNF grammar-constrained decoding to guarantee valid output.

**Prompt** (with GBNF constraint, `temperature: 0`):

```
System:
Extract entities from the text. Return JSON with an "entities" array.
Entity types: person, organization, location, concept, technology, event, product, role, date.

Example:
Text: "Apple was founded by Steve Jobs in Cupertino."
Output: {"entities":[
  {"name":"Apple","type":"organization"},
  {"name":"Steve Jobs","type":"person"},
  {"name":"Cupertino","type":"location"}
]}

User:
<memo text>
```

The output had to be wrapped in `{"entities": [...]}` because GBNF requires the top level to be a JSON object — bare arrays aren't allowed. Relation extraction followed the same shape: `{"relations": [{"source": ..., "target": ..., "label": ...}]}`.

**Result:** Empty arrays, repeated tokens, degenerate output. Worked only on trivially simple sentences like "Steve Jobs founded Apple."

**Why it failed:**

- Grammar constraints mask out large portions of the vocabulary at each decoding step. A 0.8B model's distribution is already less peaked than larger models — constraining it further pushes the model into low-confidence token paths.
- The 9-value `enum` constraint on entity types is too tight. If the model internally associates a concept with "place" but the grammar forces one of 9 fixed strings, generation stalls.
- The task itself is too compound for one pass: understand text + classify into 9 categories + generate nested JSON + maintain coherence over many tokens. Each is feasible alone for a 0.8B model. Combined, they exceed its capacity.

# Attempt 2: Simplified Knowledge Graph (Drop Schema, Drop Types)

**Goal:** Drop the GBNF constraint and entity types. Switch to plain JSON arrays parsed from free text. Two separate LLM calls — one for entities, one for relations.

Shared changes from Attempt 1:

- No GBNF — parse the free-text output with a regex finding `[...]`
- Text-first, instruction-after (small models have strong recency bias)
- `/no_think` suffix to suppress Qwen 3.5's `<think>` blocks

## Call 1 — Entity extraction

**Prompt:**

```
"{memo_text}"

List all important people, places, organizations, and things mentioned above.
Output JSON: ["name1", "name2"] /no_think
```

Flat names only — `["Apple", "Steve Jobs", "Cupertino"]` instead of typed objects. A post-hoc source-text validation rejects any extracted name not present in the original memo, catching hallucinations cheaply.

**Result:** Worked. Flat `["name"]` arrays were within the model's capacity.

## Call 2 — Relation extraction

Split the memo into sentences, then ask about one entity pair at a time.

**Prompt:**

```
"{sentence}"

What does "Steve Jobs" do to/with "Apple" in this sentence? Use short verbs.
Output JSON: ["verb1", "verb2"]
If unrelated, output: [] /no_think
```

**Result:** Noisy and inconsistent. Per-sentence, per-pair extraction produced 10-20 LLM calls per memo — each individually okay, collectively unreliable.

## Why it still wasn't enough

The pipeline as a whole — entities, relations, graph structure — was still a _structured_ task. And there's a deeper problem: **even if extraction were perfect, the RAG side would fail.** A 0.8B model can't reason over `Steve Jobs --[founded]--> Apple --[located_in]--> Cupertino` in a system prompt. It needs plain text it can simply read.

The structure was the problem on both ends.

# The Pivot: From Graphs to Facts

I stepped back and asked: what is the simplest useful representation of knowledge that a small model can both _produce_ and _consume_?

The answer: **plain-text facts.** Short, self-contained statements in natural language.

```
Knowledge Graph approach:
  memo → entities + relations → graph query → format as text → RAG prompt

Fact approach:
  memo → facts (plain text) → FTS/vector search → RAG prompt
```

Instead of asking the model to identify entity types and relation labels (a classification task), I'd ask it to break text into simple statements (a rephrasing task). Rephrasing is far more natural for language models — it's closer to what they're trained to do.

I tested this idea with a quick experiment script (`testSimplify.mts`), trying three prompt styles on the same sentences:

- `svo`: "Rewrite as simple subject-verb-object sentences"
- `who_did_what`: "List who did what in this sentence"
- `json_facts`: "Break this into simple facts. Output JSON: [...]"

The `json_facts` style was clearly the winner — clean JSON arrays of fact strings. The model handled this naturally, even on complex sentences.

The moment I saw the output, I knew this was the right direction.

# Attempt 3: Per-Sentence Fact Extraction (Naive)

**Goal:** Pivot to fact extraction (a rephrasing task, not a classification task). Split the memo into sentences, one LLM call per sentence. Zero-shot, no system message, no examples.

**Prompt:**

```
Break following text into simple facts. Respond in {language}.
Output JSON: ["fact1", "fact2"]

text: "{sentence}" /no_think
```

**Result:** The format worked — the model reliably produced JSON arrays. But the _content_ was wrong: hallucinated facts not present in the source. A sentence about "lunch at my desk" might produce a fact about "the user prefers eating alone" — a reasonable inference, but not what was written.

**Why it failed:**

- No grounding: nothing forced the model to stay close to the source. It interpreted instead of extracted.
- No few-shot examples: the model had no concrete target for what "a fact" should look like. Sometimes it over-decomposed, sometimes under-decomposed, sometimes added interpretation.

For a knowledge base, we need extraction, not interpretation.

# Attempt 4: LLM-as-Judge

**Goal:** Add a verification layer to fix hallucinations. After extracting facts from each sentence, send all candidates back to the model with the source text and ask it to filter — "agentic reflection," generate then review.

**Prompt:**

````
Keep only facts that are directly supported by the source. Drop any fact that adds
information not in the source. If a fact is mostly correct but imprecise, rewrite it
to match the source. Respond in {language}.
Output JSON array of kept facts: ["fact1", "fact2"]

Source:
```text
{source sentence}
```

Candidate facts:

```text
1. {fact1}
2. {fact2}
3. {fact3}
```

````

A fail-open safety mechanism kept the originals if the judge returned nothing — so a broken judge couldn't make things worse than no judge.

**Result:** The judge was no better than the extractor. It passed hallucinated facts through, occasionally dropped valid ones, and sometimes "rewrote" facts in a way that introduced _new_ hallucinations. Often it just returned the input list unchanged.

**Why it failed:**

The "just add a judge" pattern assumes the judge is _smarter_ than the generator. At 0.8B, it isn't — there isn't enough capacity. A 0.8B model can't reliably meta-reason about its own outputs, and the batch verification format (multiple facts plus a source block in one prompt) was too complex for it to handle.

## Attempt 5: What Actually Works

The final design combines three ideas: sliding windows, few-shot examples, and a deterministic grounding filter.

### Sliding Window

Instead of per-sentence (too little context) or full-document (too much), I use a sliding window of 3 sentences with 1 sentence overlap:

```typescript
const WINDOW_SIZE = 3;
const WINDOW_OVERLAP = 1;
```

This gives the model enough surrounding context to understand references and implicit subjects, without overwhelming its 2048-token context.

## Few-Shot Examples

Two concrete examples in the prompt, showing exactly what input/output looks like:

```
Example 1:
Text: "I met Emma at the cafe on Tuesday. She's starting a new job at Acme next month."
Facts: ["The user met Emma at a cafe on Tuesday", "Emma is starting a new job at Acme next month"]

Example 2:
Text: "Finished reading Dune. Thought the middle dragged but the ending was great."
Facts: ["The user finished reading Dune", "The user thought the middle of Dune dragged", "The user thought the ending of Dune was great"]
```

Parallel example sets exist for Korean and Traditional Chinese; language detection picks the right one.

Few-shot mattered far more than I expected. Zero-shot prompting worked fine in my earlier testing with larger models, but at 0.8B the output quality dropped without two concrete examples.

## Deterministic Grounding Filter

This is what replaced the failed LLM-as-judge — and it's arguably the most important piece:

```typescript
function isGrounded(fact: string, source: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ');
  const sourceTokens = new Set(
    norm(source)
      .split(/\s+/)
      .filter((t) => t.length > 2),
  );
  const factTokens = norm(fact)
    .split(/\s+/)
    .filter((t) => t.length > 2);
  if (factTokens.length === 0) return false;
  const overlap = factTokens.filter((t) => sourceTokens.has(t)).length;
  return overlap / factTokens.length >= 0.5;
}
```

The logic: tokenize both the fact and the source window, and check if at least 50% of the fact's content words appear in the source. If a fact introduces words that aren't in the original text, it's probably hallucinated.

It's a dumb heuristic. It works. It costs zero LLM calls. It catches exactly the kind of hallucination that the LLM judge couldn't — invented facts that sound plausible but use words the user never wrote.

## The Full Prompt

```
Extract atomic facts from the text. Each fact must be:
- a single self-contained statement
- copied or lightly rephrased from the text (no new info)
- understandable without surrounding context

Respond as a JSON array of strings, in {language}.

{few-shot examples}

Now extract from:
Text: "{window}"
Facts:
```

One more trick: the assistant turn is prefilled with `<think></think>` before generation starts. Qwen 3.5 sees the thinking phase as already complete and goes straight to the JSON output — no reasoning tokens generated, no time wasted. This is more reliable than `/no_think` instructions because it works at the chat-template level instead of asking the model to follow a directive.

## Pipeline

```
Memo text
  → split into sentences
  → build sliding windows (3 sentences, 1 overlap)
  → for each window: LLM extracts facts as JSON array
    (assistant turn prefilled with <think></think> to skip reasoning)
  → parse JSON array
  → filter: isGrounded(fact, window) ≥ 50% token overlap
  → deduplicate (case-insensitive)
  → store in DB with embeddings for vector search
```

For a typical memo (~200 words, 5-10 sentences), this produces 3-4 windows and 5-15 high-quality facts.

# What I Learned

This is what worked for OffNote AI on one model. I'm still experimenting, and I'd expect some of these calls to shift as the product evolves.

**1. Designing the task to fit the model worked better than fitting the model to a standard NLP approach.**

Knowledge graph extraction is a structured classification task. Fact extraction is a rephrasing task. The 0.8B model handled rephrasing reliably; classifying entities into 9 types while generating nested JSON didn't work in any version of the prompt I tried.

**2. Structured output cost more than I expected at this scale.**

JSON schema constraints, enum types, and nested objects all seemed to tax the 0.8B model disproportionately. Simple flat JSON arrays were within its capacity; nested schemas with enum fields weren't. The gap between `["string"]` and `[{"name": "string", "type": "enum"}]` was much larger than I'd assumed.

**3. Few-shot examples mattered far more than I expected.**

Zero-shot prompting worked fine in my earlier testing with larger models. At 0.8B, the output quality fell apart without two concrete examples — but two seemed to be enough.

**4. The small model worked best when I treated it as a language model, not a thinker.**

The "LLM as judge" pattern assumes the judge can reason about the generator's output. At 0.8B, that assumption fell apart. A small model is closer to the language models I first learned about in school: a statistical next-token predictor, not a reasoner working inside a black box. Asking it to "judge" was asking the wrong thing.

The practical consequence: when a step needed judgment, I moved it out of the model and into code. The deterministic grounding filter replaced the failed LLM judge — a few lines of token-overlap arithmetic, zero LLM calls — and it caught exactly the hallucinations the LLM judge had confidently approved. Traditional ML and algorithmic approaches became more useful as the model got smaller.

**5. Extraction format is constrained by what the consumer can read.**

A 0.8B RAG model handles plain text well and graph notation poorly. So I extracted plain text — facts, not triples.

# What This Taught Me About Small Models

Most LLM engineering advice assumes you have a capable model. "Use structured output." "Add a verification step." "Use chain-of-thought reasoning." These patterns break down below 1B parameters.

Working with a 0.8B model forced me to think about what language models fundamentally _are_ — next-token predictors trained on natural language. The closer your task stays to natural language, the better small models perform. The further you push toward structured reasoning, classification, or meta-cognition, the worse they perform.

Fact extraction works because it asks the model to do the one thing it's actually good at: read text and rewrite it, slightly differently.
