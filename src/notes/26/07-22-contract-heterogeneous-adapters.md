---
title: "Design note: making a contract between business logic and heterogeneous adapters"
date: 2026-07-22
lastmod: 2026-07-22
---

## 1. Background

I was connecting external detection models to our application — PII detection and guardrail classification. 
For each capability there are multiple options: different vendors, different models, and more will come later.

They all do "the same thing" from the business point of view, but each one speaks its own language. 

One vendor detects ~200 PII categories, another detects 30, and the two lists only partially overlap. 
So the real design question was not "how do I call these APIs" — it was: 
**what contract should my business logic hold against a set of adapters that are heterogeneous, and will stay heterogeneous?**  
  
I didn't arrive at the answer directly. 
This note records the actual sequence of questions I asked myself.

## 2. The thought journey

### 2.1 "Should I define an inner set and a hard contract?"

My first instinct: take the intersection of what every provider supports, define it as a closed set of categories, and make that the contract. 
It's attractive because the contract is *hard* — business logic can rely on every category working, on every provider.

But the intersection has a built-in decay: every new provider can only shrink it. 
And anything a provider does *beyond* the intersection becomes structurally unreachable — the contract has no words for it.

### 2.2 "What if we want to support provider-specific features?"

This was the question that broke the inner-set idea. 
Provider-specific supports are often exactly why a customer picks that provider. 
A contract that cannot even *express* them means the abstraction is fighting the product.

### 2.3 "Hmm, then a superset?"

Next instinct: go the other way. 
Merge every provider's supports into one big set of categories and expose all of it. 
Now nothing is unreachable.

### 2.4 "That's unstable and hard to manage"

But the superset imports a problem: most of those categories are **not mine**. 
They are external-world facts.  
  
A vendor can add categories, remove them, or rename them at any time — and if their categories live inside my business contract, every such change is a direct hit on my system.  
  
I'd be maintaining hundreds of definitions whose lifecycle I don't control.  
  
Worse, the superset lies to users: it offers categories that silently don't exist on the provider they actually selected, and the mismatch only surfaces at runtime.  
  
The underlying realization: the two instincts fail for mirrored reasons.  
- The inner set is *stable but too small*
- the superset is *complete but unstable*. 
  
  
What I actually had was two different kinds of categories mixed together

- categories with **stable meaning**, that the business wants to build logic on
- categories that are **external-world dependent**, that the business only needs to pass through.

Stable meaning is owned by the business logic. Unstable identifiers are owned by the provider's worlds - the business may carry them, but never understands.

### 2.5 "In-flight capability check?!"

If business logic carries these identifiers but never understands them, then the understanding has to live somewhere. 
That's the resolution: **separate the responsibility.**

- **Business logic carries the category** — stores it, displays it, routes it — as opaque data.
- **The adapter — the provider-specific code — maintains and checks it**: it owns the catalog of what its provider supports, and every requested category is verified against that catalog.

Now the contract no longer depends on hard-coding every category. 
Business logic builds on top of the separated responsibility: it relies only on the small stable set it owns, and the moving catalog stays the adapter's problem — checked *in flight*, at the moment business logic connects to an adapter.

## 3. Example of the final decision

What does this look like in practice? 
A category becomes a pair of following two:

- `type` — the reliable part. A small set the business curates and guarantees, so logic can safely branch on it (filtering, policy, analytics).
- `provider_specific_type` — the unstable part. The provider's own identifier, passed through as data: displayed, stored, validated against the declaration — never branched on.

```
("email",             "provider-x-email-address")   # mapped to a stable category
("provider_specific", "provider-x-2fdasjdnkj")      # exists only in provider X's world
```

When a user configures the feature, they first pick a provider; the system then shows
exactly the list that provider declared — including its provider-specific entries,
honestly labeled as such. The check happens at configuration time, so an unsupported
selection is impossible to save, instead of failing at runtime.

This dissolves both earlier failures:

- Nothing is unreachable — every provider-specific category is expressible (superset's
  strength).
- Nothing is a lie — you can only select what your provider declared (inner set's
  strength).
- And when a vendor changes its catalog, only the *declaration data* changes; the
  business contract — the small stable set — doesn't move.

## 4. Takeaways

- The size of the contract was the wrong axis. The real axis is **who owns each part of the vocabulary**: 
  - stable meaning is owned by business logic
  - unstable data is owned by the external world — an adapter speaks for it
  - a capability declaration bridges the two.

- Validate at configuration time, not runtime. 
  - The moment a user makes a choice is the moment the system knows both the request and the provider's declaration — that's where a mismatch should fail.

- Business logic never makes decisions based on the unstable data it carries
  — that would tie business behavior to something the external world can change at any time.
  - When it needs to, the answer isn't an exception; it's promoting that data into the stable set and branching there.

It turned out afterwards that this shape has a name — see the appendix.

---

## Appendix: this shape has a name

After the design settled, I did AI-assisted research on how the industry handles heterogeneous providers — and it turns out I had walked into a known pattern. 
The three options I cycled through are the three standard contract strategies, and the one I landed on is what the industry converged on (Kubernetes CSI, LSP/MCP capability exchange, JDBC's `DatabaseMetaData.supports*()`):

| Strategy | Shape | Failure mode |
|---|---|---|
| Intersection (inner set) | Only what all providers share | Shrinks with every new provider; provider-specific features structurally unusable |
| Naive union (superset) | Everything every provider offers | Users configure features that silently don't exist until runtime; contract absorbs external churn |
| **Negotiated union** | Union + per-provider capability declaration, checked at config time | Fails fast, at configuration time |

The research also gave me one razor I wish I'd had from the start: a provider difference is either **semantic** (it changes what a result *means* — must be surfaced) or **operational** (it only changes how the result was produced — the adapter can absorb it). 
Detection categories are semantic: "scanned" means something different at 30 categories versus 200. 
That's why hiding the gap was never an option.
