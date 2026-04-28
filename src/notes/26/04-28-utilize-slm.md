---
title: What a 0.8B Model Can't Do (and What It Actually Can)
date: 2026-04-28
---
What happens when you try to build a knowledge management system on a phone, with no cloud, using a model that fits in 500MB of RAM? You learn — mostly through failure — what small language models are actually good at.

This is a record of five attempts to extract structured knowledge from personal memos using Qwen 3.5 0.8B (Q4), running fully on-device in a React Native app called OffNote AI. The goal was simple: when a user saves a memo, extract searchable knowledge so a chat feature can answer questions about it later (RAG). The journey to get there was not simple at all.

# The Constraint

- **Model:** Qwen 3.5 0.8B, Q4 quantized
- **Runtime:** On-device via llama.cpp (React Native binding)
- **Context window:** 2048 tokens
- **No cloud fallback.** Everything runs locally.

Anyone who works with LLMs will read that spec and think "that model is too small for NLP extraction." They're partially right. The question is: _which_ extraction task is too hard, and which one isn't?

# Attempt 1: Knowledge Graph with JSON Schema

The textbook approach. Extract entities (people, places, organizations) and relations (founded, works_at, located_in), output as structured JSON. This is what every knowledge graph paper does.

I used a system message with the instruction and one example, and a user message with the memo text. The entity extraction prompt looked like this:

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

The output had to be wrapped in an object (`{"entities": [...]}`) because the GBNF grammar constraint requires the top level to be a JSON object — you can't start with a bare array. The relation extraction followed the same pattern: `{"relations": [{"source": ..., "target": ..., "label": ...}]}`.

I used grammar-constrained decoding (GBNF via llama.cpp) to force valid JSON output, with `temperature: 0`. In theory, this guarantees well-formed output. In practice, it destroyed the model.

**What went wrong:**

Grammar constraints mask out large portions of the vocabulary at each decoding step. A 0.8B model's probability distribution is already less peaked than larger models — constraining it further pushes the model into low-confidence token paths. The result: empty arrays, repeated tokens, degenerate output.

The `enum` constraint on entity types was especially brutal. The model might internally associate a concept with "place," but the grammar forces it to choose from exactly 9 string literals. If the probability mass for the grammar-valid token is near zero, generation stalls. And the nesting depth — object wrapping an array of objects, each with an enum field — made it even worse.

Beyond formatting, the task itself was too compound for one pass. The model had to simultaneously:

- Understand the text
- Identify entities across 9 categories
- Generate syntactically valid nested JSON (`{entities: [{name, type}, ...]}`)
- Maintain coherent output across many tokens

Each of these is feasible alone for a 0.8B model. Combined, they exceed its capacity.

**Result:** Empty or garbage output on most inputs. Occasionally worked on trivially simple sentences like "Steve Jobs founded Apple."

# Attempt 2: Simplified Knowledge Graph (Drop Schema, Drop Types)

The first insight: drop the JSON schema constraint entirely and simplify the output format.

Instead of asking for typed entities as nested JSON objects, I asked for just a flat list of names — a single LLM call, no entity types, no grammar constraint:

```
"{memo_text}"

List all important people, places, organizations, and things mentioned above.
Output JSON: ["name1", "name2"] /no_think
```

The key changes from v1:

- No GBNF grammar constraint — just parse the free-text output with a regex to find `[...]`
- No entity types — all entities are just names. `["Apple", "Steve Jobs", "Cupertino"]` instead of `[{"name": "Apple", "type": "organization"}, ...]`
- Text-first, instruction-after prompt pattern (small models have strong recency bias)
- `/no_think` suffix to suppress Qwen 3.5's `<think>` blocks (plus `stripThinkingTags` as a fallback)
- `stop: ["]"]` to help terminate output cleanly
- Source-text validation: every extracted name must appear in the original text (catches hallucinations cheaply)

For relations, I split text into sentences and asked about one entity pair at a time:

```
"{sentence}"

What does "Steve Jobs" do to/with "Apple" in this sentence? Use short verbs.
Output JSON: ["verb1", "verb2"]
If unrelated, output: [] /no_think
```

**What improved:**

- Entity extraction started working — the flat `["name"]` format was far more reliable than nested objects with enum types
- Source-text validation caught hallucinated entities cheaply
- Simple JSON arrays (`["string", "string"]`) were within the model's capacity

**What still didn't work:**

- Relations were noisy and inconsistent — per-sentence, per-pair extraction produced many LLM calls with unreliable results
- The pipeline produced 10-20 LLM calls per memo, each individually okay but collectively unreliable
- The whole pipeline — entities, relations, graph structure — was still a _structured_ task

And here's the deeper problem I hadn't considered: **even if extraction were perfect, the RAG side would fail.** A 0.8B model can't reason over `Steve Jobs --[founded]--> Apple --[located_in]--> Cupertino` in a system prompt. It needs plain text it can simply read.

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

First implementation: split the memo into sentences, make one LLM call per sentence. No system message. No few-shot examples. Zero-shot with language detection:

```
Break following text into simple facts. Respond in {language}.
Output JSON: ["fact1", "fact2"]

text: "{sentence}" /no_think
```

Short and clean. The model produced JSON arrays, the format was working.

**What went wrong: hallucination.**

Without grounding, the model would invent facts not present in the source text. A sentence about "lunch at my desk" might produce a fact about "the user prefers eating alone" — a reasonable inference, but not what was written. For a knowledge base, we need extraction, not interpretation.

Without few-shot examples, the output quality was also inconsistent. The model didn't have a clear target for what "a fact" should look like — sometimes it would over-decompose, sometimes under-decompose, sometimes add interpretation.

# Attempt 4: LLM-as-Judge

The obvious fix for hallucination: add a verification layer. After extracting facts from each sentence, send all candidate facts back to the model along with the source text and ask it to filter:

````
Keep only facts that are directly supported by the source. Drop any fact that adds
information not in the source. If a fact is mostly correct but imprecise, rewrite it
to match the source. Respond in {language}.
Output JSON array of kept facts: ["fact1", "fact2"]

Source:
```text
{source sentence}
````

Candidate facts:

```text
1. {fact1}
2. {fact2}
3. {fact3}
```

````

The idea was "agentic reflection" — the model generates, then the model reviews. I even built a fail-open safety mechanism: if the verification call returns nothing, keep the originals (so a broken judge doesn't make things worse than no judge).

**The judge was stupid too.**

A 0.8B model can't reliably meta-reason about its own outputs. It would pass hallucinated facts through, occasionally drop valid ones, and sometimes "rewrite" facts in a way that introduced *new* hallucinations. The batch verification format — sending all facts at once — was also too complex for the model to handle reliably. It would often just parrot back the input list unchanged.

The "just add a judge" pattern that works with GPT-4 class models doesn't transfer to sub-1B models. The judge needs to be *smarter* than the extractor, and at 0.8B, you don't have that headroom.

## Attempt 5: What Actually Works

The final design combines three ideas: sliding windows, few-shot examples, and a deterministic grounding filter.

### Sliding Window

Instead of per-sentence (too little context) or full-document (too much), I use a sliding window of 3 sentences with 1 sentence overlap:

```typescript
const WINDOW_SIZE = 3;
const WINDOW_OVERLAP = 1;
````

This gives the model enough surrounding context to understand references and implicit subjects, without overwhelming its 2048-token context.

## Few-Shot Examples

Two concrete examples in the prompt, showing exactly what input/output looks like:

```
Example 1:
Text: "I met Sarah at the cafe on Tuesday. She's starting a new job at Acme next month."
Facts: ["The user met Sarah at a cafe on Tuesday", "Sarah is starting a new job at Acme next month"]

Example 2:
Text: "Finished reading Dune. Thought the middle dragged but the ending was great."
Facts: ["The user finished reading Dune", "The user thought the middle of Dune dragged", "The user thought the ending of Dune was great"]
```

For Korean memos, a parallel set of Korean examples is used. Language detection picks the right set.

Few-shot is non-negotiable for small models. Zero-shot works for GPT-4. At 0.8B, the model needs to see exactly what you want.

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

## Pipeline

```
Memo text
  → split into sentences
  → build sliding windows (3 sentences, 1 overlap)
  → for each window: LLM extracts facts as JSON array
  → strip <think> tags (Qwen 3.5 thinking mode)
  → parse JSON array
  → filter: isGrounded(fact, window) ≥ 50% token overlap
  → deduplicate (case-insensitive)
  → store in DB with embeddings for vector search
```

For a typical memo (~200 words, 5-10 sentences), this produces 3-4 windows and 5-15 high-quality facts.

# What I Learned

**1. Design the task to match the model, not the other way around.**

Knowledge graph extraction is a structured classification task. Fact extraction is a rephrasing task. A 0.8B model can rephrase. It cannot classify entities into 9 types while generating valid nested JSON.

**2. Structured output is expensive at small scale.**

JSON schema constraints, enum types, nested objects — all of these tax small models disproportionately. Simple JSON arrays (a flat list of strings) work. Complex schemas don't. The gap between `["string"]` and `[{"name": "string", "type": "enum"}]` is enormous at 0.8B.

**3. Context matters, but not too much.**

Per-sentence processing lost context (pronouns, implicit subjects). Full-document processing overwhelmed the model. Sliding windows of 3 sentences hit the sweet spot — enough context to resolve references, short enough for the model to fully attend.

**4. Few-shot is non-negotiable for small models.**

Zero-shot prompting works for GPT-4. At 0.8B, the model needs concrete examples of the expected input-output format. Two examples were enough, but zero was not.

**5. Replace LLM verification with deterministic checks.**

The "LLM as judge" pattern assumes the judge is smarter than the generator. At 0.8B, it isn't. A simple token-overlap heuristic catches hallucinations that the LLM judge confidently approved. When your model is small, move verification logic out of the model and into code.

**6. The consumption side matters as much as extraction.**

Even perfect knowledge graphs are useless if the RAG model can't interpret graph notation. A 0.8B model reads natural language. So give it natural language — facts, not triples.

# The Uncomfortable Truth

Most LLM engineering advice assumes you have a capable model. "Use structured output." "Add a verification step." "Use chain-of-thought reasoning." These patterns break down below 1B parameters.

Working with a 0.8B model forced me to think about what language models fundamentally _are_ — next-token predictors trained on natural language. The closer your task stays to natural language, the better small models perform. The further you push toward structured reasoning, classification, or meta-cognition, the faster they fall apart.

Fact extraction works because it asks the model to do the one thing it's actually good at: read text and rewrite it, slightly differently.
