# Wonbin Kim

AI Engineer

Taipei · open to relocation to Singapore

[kwb0711@gmail.com](mailto:kwb0711@gmail.com) · [GitHub](https://github.com/rst0070) · [LinkedIn](https://www.linkedin.com/in/wonbin-kim-7263a7184/) · [HuggingFace](https://huggingface.co/rst0070) · [blog](https://rst0070.github.io/notes)

## Summary

AI Engineer with production experience across the full LLM agent — stack agent orchestration, tool design, sandboxed agent governance (prompt-injection blocking, PII redaction, output moderation), evaluation pipelines, multimodal RAG, and conversation memory. 

Hands-on with RL fine-tuning, knowledge graph, and AWS/Kubernetes infrastructure.

Contributor to Mem0 (Over 58k stars AI memory system)

1st author paper on speaker verification

## Skills

- **LLM / Agents:** LlamaIndex, LangChain, LangGraph, RAG (multimodal), agent tools, MCP-style protocols, vLLM, structured outputs, evaluation (DeepEval)
- **Training / ML:** PyTorch, GRPO, QLoRA, LLM fine-tuning, Speaker Verification
- **Infra:** AWS, GCP, Kubernetes, Docker, Terraform, Airflow, Argo Workflows, Elasticsearch, Redis, Kafka, Neo4J
- **Backend / Full-stack:** Python (Django, FastAPI), React / React Native, TypeScript, Java (Spring)

## Work Experience

### MaiAgent(AI Engineer, 2025.12 - , Taipei)

AI Agent platform for Enterprise [maiagent.ai](https://maiagent.ai/en/about)

Shipped full-stack AI features end-to-end inside an existing Django + LlamaIndex codebase - designing within the constraints of the existing system, across AI pipeline, backend, and frontend.

- **Agent Middleware**
    - **Constraint:** Enterprise customers needed per-tenant custom logic (PII redaction, prompt-injection blocking, output moderation) on every agent message, but hook requirements changed weekly, were written by non-engineers, and shipped through admin — ruling out git-tracked, deploy-gated Python functions.
    - Designed and delivered end-to-end a middleware hook system that sits between the user and the AI agent, where hook code lives in the database and executes in a gVisor-sandboxed container, with a JSON-formatted protocol over a single Docker-exec socket as the only integration surface — keeping untrusted per-customer code fully isolated from the application internals.
    - Designed a three-layer execution model — application engine, sandbox supervisor, and per-hook handlers — to manage middleware hook chain with isolation
    - Designed a reverse-direction RPC protocol so hooks can call back into the application (e.g. invoke an LLM, check credits)
    - Handled streaming output through a buffered stream path with a lookback tail for real-time UX (solving cross-chunk pattern splitting)
    - Solved three distinct isolation concerns in a layered model:
        - runtime security via gVisor
        - code-to-code isolation via fresh namespaces per handler (preventing globals, imports, state leakage between hooks in the same chain)
        - resource isolation via cgroups — settling on one container per trigger-point middleware chain as the cost-isolation tradeoff after ruling out one container per hook.

    <details>
    <summary>Details</summary>

    Design writeup covering the sandbox protocol, isolation model, and streaming architecture: [middleware-of-ai-agent](https://rst0070.github.io/notes/26-05-29-middleware-of-ai-agent)

    Follow-up on the reverse RPC protocol and capability registry design: [rpc-from-sandbox-to-application](https://rst0070.github.io/notes/26-06-08-rpc-from-sandbox-to-application)

    Concept graph of Middleware hook chain:

    ```mermaid
    flowchart LR
        User(((User)))

        subgraph InputChain["input hook chain"]
          direction LR
          I1["hook 1"]
          I2["hook 2"]
          Idots["..."]
          In["hook n"]
          I1 -->|pass / modify| I2
          I2 -->|pass / modify| Idots
          Idots -->|pass / modify| In
        end

        Agent["AI Agent"]

        subgraph OutputChain["output hook chain"]
          direction LR
          O1["hook 1"]
          O2["hook 2"]
          Odots["..."]
          Om["hook m"]
          O1 -->|pass / modify| O2
          O2 -->|pass / modify| Odots
          Odots -->|pass / modify| Om
        end

        UserOut(((User)))

        User -->|message| I1
        In -->|pass / modify| Agent
        InputChain -.->|any hook returns `block` / `skip`| UserOut
        Agent -->|reply: streaming or final| O1
        Om -->|pass / modify| UserOut
        OutputChain -.->|any hook returns block| UserOut

        class I1,I2,Idots,In,O1,O2,Odots,Om hook
        class Agent actor
        class InputChain,OutputChain chain
    ```

    Architecture(Application engine, Sandbox supervisor, per hook handler):

    ```mermaid
    flowchart LR
        subgraph Caller["The application (trusted)"]
          direction TB
          Engine["engine
          • chain session
          • state vector
          • audit log"]
        end

        subgraph Sandbox["Sandbox (gVisor)"]
          direction TB
          Supervisor["supervisor
          (stdlib-only, stateless)"]
          H1["handler 1
          (fresh namespace)"]
          H2["handler 2
          (fresh namespace)"]
          Hn["..."]
          Supervisor --> H1
          Supervisor --> H2
          Supervisor --> Hn
        end

        Engine -->|init / chunk| Supervisor
        Supervisor -->|ack / out / error| Engine

        class Caller trusted
        class Sandbox untrusted
    ```

    reverse-direction RPC protocol:

    ```mermaid
    sequenceDiagram
        participant J as Async job (deferred effect)
        participant A as Application
        participant H as Hook (sandbox)

        A->>+H: forward — run the hook on this text
        H->>+A: backward — host_call(name, payload)
        Note over A: gate logic (sync) — admit or refuse the call
        A-->>-H: result
        Note over A: record effect (not committed here)
        H-->>-A: modified text
        A-)J: trigger deferred job later — off the hot path
    ```

    </details>

- **Agent Evaluation**
    - **Constraint:** The existing evaluation pipeline used DeepEval’s raw metric pass/fail output directly — non-technical enterprise users received 8+ individual metric scores with no guidance on which failures mattered or what to do about them, making evaluation results effectively unactionable.
    - Redesigned the pass/fail determination by designing a **tiered metric priority system** based on studying DeepEval’s metric semantics to prevent noisy metrics like Context Relevancy and Tool Correctness from failing test cases that achieved the correct outcome

        <details>
        <summary>Details</summary>
        
        Safety metrics (Bias, Toxicity, Hallucination) take highest priority, followed by Outcome metrics (Answer Relevancy, Task Completion), then Grounding metrics (Context Recall)
        
        Algorithm:
        
        ```mermaid
        flowchart TD
        	Fail[success = False]
            Start([Each test case]) --> Classify[Classify metrics into 4 tiers:<br/>• Guardrails<br/>• Outcomes<br/>• Groundings<br/>• Others]
            Classify --> T1{Tier 1: All<br/>Guardrails passed?}

            T1 -->|No| Fail
            T1 -->|Yes| T2{Tier 2: All<br/>Outcomes passed?}

            T2 -->|No| Fail
            T2 -->|Yes| T3{Tier 3: All<br/>Groundings passed?}

            T3 -->|No| Fail
            T3 -->|Yes| T4{Tier 4: All<br/>Others passed?}

            T4 -->|Yes| Pass([PASS<br/>success = True])
            T4 -->|No| Override{Adaptive Override:<br/>Do all 3 core tiers<br/>have at least 1 metric?}

            Override -->|Yes<br/>Ignore Others| Pass
            Override -->|No| Fail
        
        ```

        </details>

    - Built an LLM-powered insight generation layer using Structured Outputs that automatically produces a natural-language summary, per-metric severity classification, and prioritized actionable recommendations with rationale — transforming raw evaluation data into an improvement playbook for non-technical users, with on-demand multilingual translation via Celery async tasks
        <details>
        <summary>Details</summary>

        ![Screenshot 2026-04-25 at 11.47.55 AM.png](/assets/portfolio/screenshot-2026-04-25-at-11-47-55-am.png)

        </details>

    - Hardened the evaluation pipeline for production reliability: implemented resumable batched execution with per-test-case retry tracking, structured output fallbacks for lower-capability LLMs, and real-time progress tracking via Socket.IO events broadcasting
    - Decoupled the evaluation pipeline from OpenAI by a provider-agnostic interface, enabling enterprise customers to use self-hosted LLMs via vLLM
- Deep Research
    - **Constraint:** The deep research feature was specified to use LangChain/LangGraph, while the entire existing AI pipeline was built on LlamaIndex — the two frameworks use incompatible LLM interfaces, message formats, and tool-calling protocols.
    - Designed a cross-framework interrupt protocol to enable the LangChain deep research agent to delegate queries to the existing LlamaIndex agent at runtime: the deep research agent raises a typed interrupt, the orchestrator routes the query through the existing agent pipeline, and resumes the LangChain agent with the response — enabling two heterogeneous agent systems to collaborate without rewriting either.
    - Delivered end-to-end: LLM adapter between LlamaIndex and Langchain, cross-framework interrupt protocol, prompt design, agent tools, streaming over SocketIO, and frontend integration.

    <details>
    <summary>Details</summary>

    - Cross-Framework Interrupt Protocol

        ```mermaid
        sequenceDiagram
            participant User
            participant Orch as Orchestrator<br/>(Django)
            participant DR as Deep Research Agent<br/>(LangChain / LangGraph)
            participant EA as Existing Agent<br/>(LlamaIndex)

            User->>Orch: User query

            rect rgb(30, 41, 59)
            Note over Orch,DR: Phase 1 — Planning (status: started)
            Orch->>DR: arun(status=started)
            DR->>DR: Create research plan
            DR-->>Orch: interrupt(USER_INPUT)
            Orch-->>User: Present plan
            User->>Orch: Confirm
            Orch->>DR: Command(resume=user_input)
            DR-->>Orch: interrupt(RUN_RESEARCH)
            end

            rect rgb(15, 23, 42)
            Note over Orch,EA: Phase 2 — Research (status: running)
            Orch->>DR: Command(resume="Start research")

            loop Research Loop
                DR->>DR: internet_search, write_file, etc.
                DR->>DR: use_internal_assistant(query)
                DR-->>Orch: interrupt(CHATBOT_RESPONSE)
                Orch->>EA: Route query to existing agent
                EA-->>Orch: LlamaIndex response
                Orch->>DR: Command(resume=response)
            end

            DR->>DR: append_to_final_report
            DR->>DR: finish_research
            DR-->>Orch: interrupt(FINISH_RESEARCH)
            end

            Orch-->>User: Final report
        ```

    </details>

- Multimodal RAG
    - **Constraint:** Existing RAG pipeline was built entirely on LlamaIndex with text-only embedding — no image ingestion, retrieval, or generation logic existed, and LlamaIndex’s core abstractions (chat engine, response synthesizer, agent framework) had no native support for image nodes
    - Took an abstract requirement (“make RAG support images”) and designed a multimodal RAG architecture with 4 cross-modal retrieval modes — text→image, image→text, text→text, and image→image — over a shared vector space with multimodal embeddings
    - Extended LlamaIndex’s text-only abstractions end-to-end so image data survives every layer — ingestion, retrieval, reranking, response synthesis, and the agent scratchpad — replacing components that would otherwise silently strip images to plain text
    - Exposed cross-modal knowledge base search to AI agents as a first-class tool, with an image budget system to prevent token overflow
    - Delivered end-to-end: image ingestion pipeline, cross-modal retrieval, chat engine and response synthesizer extensions, agent tool integration, image processing utilities, and frontend integration
    - Enabled enterprise customers to upload and search images within their knowledge bases for the first time, with full integration into the AI agent workflow

    <details>
    <summary>Details</summary>

    - Architecture

        ```mermaid
        flowchart TB
            subgraph Ingestion["Ingestion Pipeline"]
                direction LR
                ImgUp[Image Upload] --> IR[Image Reader + Multimodal Mixin]
                IR --> ME[Multimodal Embedding Generation]
                ME --> VI[(Vector Index text + image nodes)]
                TxtUp[Text Upload] --> TE[Text Embedding]
                TE --> VI
            end

            subgraph QueryFlow["Query Flow"]
                UQ[User Query\ntext and/or image]

                subgraph Engine["Chat Engine / Agent Framework — extended for multimodal —"]

                    subgraph Retrieval["Cross-Modal Retrieval"]
                        direction LR
                        TT[Text → Text]
                        TI[Text → Image]
                        IT[Image → Text]
                        II[Image → Image]
                    end

                    IST[Image Search Tool for AI Agent]
                    BPR[Bypass Reranker for Image Nodes]
                    SYN[Custom Response Synthesizer\nbuild ImageBlocks for LLM]
                end

                IPL[Image Processing Layer resize / convert / base64 sync + async]
                LLM[LLM Response with image understanding]
            end

            UQ --> Retrieval
            UQ --> IST
            IST --> Retrieval
            Retrieval <--> VI
            Retrieval --> BPR --> SYN
            SYN --> IPL --> LLM

            style Ingestion fill:#1e293b,stroke:#60a5fa,color:#e2e8f0
            style QueryFlow fill:#1e293b,stroke:#f472b6,color:#e2e8f0
            style Engine fill:#0f172a,stroke:#818cf8,color:#e2e8f0
            style Retrieval fill:#172554,stroke:#60a5fa,color:#e2e8f0
            style VI fill:#581c87,stroke:#c084fc,color:#e2e8f0
            style LLM fill:#9f1239,stroke:#fb7185,color:#fff
            style IPL fill:#164e63,stroke:#22d3ee,color:#e2e8f0
            style IST fill:#172554,stroke:#60a5fa,color:#e2e8f0
        ```

    - LlamaIndex Extensions (before vs after)

        ```mermaid
        flowchart LR
            subgraph Original["LlamaIndex Default"]
                direction TB
                CE1[Chat Engine] --> S1[Synthesizer strips nodes to text]
                A1[Agent Framework] --> T1[Tool results images ignored]
                S1 --> L1[LLM text only]
            end

            subgraph Extended["Developed Extensions"]
                direction TB
                CE2[Chat Engine + multimodal retrieval + image node bypass + empty retrieval fallback]
                CE2 --> S2[Custom Synthesizer builds ImageBlocks passes image nodes to LLM]
                A2[Agent Adapter + scratchpad image injection + image budget management + memory cleanup]
                A2 --> T2[Image Search Tool 4 cross-modal modes]
                S2 --> L2[LLM with image understanding]
                T2 --> S2
            end

            Original -- extended --> Extended

            style Original fill:#1e293b,stroke:#64748b,color:#94a3b8
            style Extended fill:#0f172a,stroke:#60a5fa,color:#e2e8f0
            style L2 fill:#9f1239,stroke:#fb7185,color:#fff
        ```

    </details>

- Agent Conversation Memory
    - **Constraint**: The production agent’s recall of prior conversations was unreliable on two fronts — long-term vector memory was silently failing retrieval with no tests or metrics to catch it, and semantic recall alone could not answer time-referenced or exact-quote questions ("did you resolve the issue I reported last week?", "what exact wording did we agree on earlier?").
    - Diagnosed and fixed the long-term vector memory:
        - Built a quantitative retrieval benchmark measuring recall, using conversation data extracted from the Salesforce/ConvoMem HuggingFace dataset with evidence-based ground truth, tested across 4 distinct scenarios with multi-thousand-turn conversations against Elasticsearch and OpenAI embeddings.
        - Identified two root causes through systematic testing: LlamaIndex’s default XML formatting in stored memory nodes was degrading vector similarity matching, and the absence of deduplication was polluting the Elasticsearch vector store with identical memory chunks.
        - Replaced the long-term memory persistence path so each message is stored as a structured Document carrying session ID, role, and message metadata instead of preformatted XML, keyed by a deterministic content-hashed node ID
        - Improved memory retrieval from completely failing beyond 50 conversation turns (0/4 test cases) to reliably retrieving across 8,000+ turns (4/4 test cases) — sufficient for typical annual usage — with zero additional LLM API cost, unlike memory solutions that rely on LLM-powered summarization.

        <details>
        <summary>Details</summary>

        Collected data for evaluation - https://huggingface.co/datasets/wonbin-tw/mem-test

        </details>

    - Closed the recall gap that semantic memory cannot cover by adding two LLM-callable conversation-history tools — no new index, no migration, no additional LLM API cost workflow:
        - Designed a search → locate → expand pattern on conversation: Splitting "many shallow matches" from "one deep context window" lets the LLM chain them efficiently rather than overpaying tokens on every call.
            - search tool - keyword/regex search over the current conversation and returns short snippets
            - expand tool - N neighboring messages around a chosen match to recover the surrounding dialogue.
        - Added defensive bounds against regex DoS, token bloat, and bad input: pattern length cap, per-message content truncation, page size cap, context window cap, and silent fallback to literal substring search when a user-supplied regex fails to compile, so invalid patterns never surface as exceptions to the LLM.
        <details>
        <summary>Example</summary>

            <video controls preload="metadata" src="/assets/portfolio/conversation-search-tool.mp4"></video>

        </details>

- Agent Schedule
    - **Constraint:** No scheduling infrastructure existed; the only requirement was a verbal request inspired by a competitor feature — all product design, technical architecture, and implementation were self-directed
    - Designed and implemented an end-to-end agent scheduling system from scratch, enabling AI agents to execute autonomously on cron, interval, or one-shot schedules via Celery Beat and django-celery-beat
    - Implemented execution audit trail with token usage tracking, soft-delete with race condition handling, and per-organization schedule limits
    - Introduced a ports-and-adapters architecture to decouple business logic from infrastructure dependencies (Celery Beat registration, RAG service invocation), enabling each concern to be tested and replaced independently
    - Delivered full-stack: Django models, service layer, REST API (CRUD + toggle + run-now), Celery task, and admin frontend

    <details>
    <summary>Details</summary>

    - Execution modes — **in-context** (persistent conversation with accumulated context across runs) and **isolated** (stateless, ephemeral resources cleaned up after each run), supporting both iterative analysis and one-off tasks
    - Architecture

        ```mermaid
        flowchart TD
            subgraph Trigger["Schedule Trigger"]
                CB[Celery Beat] -->|cron / interval / one-shot| Task[Celery Task]
            end

            Task --> Guards

            subgraph Guards["Pre-execution Guards"]
                direction LR
                CK[Credit Check] --- EN[Enabled Check] --- MX[Max Executions Check]
            end

            Guards --> Mode{Execution Mode}

            subgraph Execution["Agent Execution"]
                Mode -->|In-Context| IC[Chatbot Ability\n+ Accumulated Context\nvia dedicated conversation]
                Mode -->|Isolated| IS[Chatbot Ability Only\nephemeral conversation\ncleaned up after run]
            end

            IC --> Delivery
            IS --> Delivery

            subgraph Delivery["Multi-Target Delivery"]
                direction LR
                CV[Conversations\noutgoing messages] --- WH[Webhooks\nHTTP POST]
            end

            Delivery --> Audit[Execution Audit Record\nstatus / token usage / errors]

            style Trigger fill:#1e293b,stroke:#60a5fa,color:#e2e8f0
            style Guards fill:#1e293b,stroke:#f59e0b,color:#e2e8f0
            style Execution fill:#0f172a,stroke:#818cf8,color:#e2e8f0
            style Delivery fill:#1e293b,stroke:#34d399,color:#e2e8f0
            style Audit fill:#581c87,stroke:#c084fc,color:#e2e8f0
        ```

    </details>

- Auth & Session Security Hardening
    - **Constraint:** Production auth had four converging gaps — JWT access tokens were configured with a **100-year lifetime**, no revocation mechanism existed (logout was a no-op for the access token), Socket.IO connections survived logout indefinitely, and SSO logout paths (Keycloak, SAML) silently left simplejwt refresh tokens valid for 30 days, so a captured refresh token could mint fresh access tokens long after the user "logged out".
    - Designed a defense-in-depth model: shortened access token lifetime from 100 years to 15 minutes (phased through 1 day to give frontends time to land silent refresh) and built a Redis-backed access-token blacklist keyed by `jti` with TTL pinned to the token's remaining lifetime — sub-millisecond lookup on every authenticated request, no DB migration, and entries auto-expire so the blacklist never grows unbounded.
    - Solved per-user Socket.IO disconnect across 7 namespaces by repurposing Socket.IO rooms as a reverse index — each connection joins a `user_{id}` room on connect, so logout becomes an O(1) room lookup instead of an O(n) session scan, and the room-based pub/sub fans out across multiple server instances for free.
    - Closed the SSO refresh-token gap by routing Keycloak and SAML logout flows through a shared logout path that blacklists the simplejwt refresh token via SimpleJWT's built-in DB blacklist — eliminating the 30-day post-logout window where a captured refresh token could mint new sessions.
    - Built frontend silent token refresh end-to-end across two Vue apps (Axios for admin, `@vueuse/core` createFetch for web chat): a singleton-promise pattern collapses concurrent 401s into one refresh call, multi-tab coordination falls out of localStorage-backed reactive token state, and Socket.IO reconnection naturally picks up refreshed tokens via reactive token getters — no explicit reconnect logic needed.
    - Delivered end-to-end across backend (Django, simplejwt, Redis, Socket.IO room indexing across 7 namespaces, logout orchestration, new logout endpoint, SSO logout updates) and frontend (Axios + createFetch silent refresh modules, multi-tab coordination, Socket.IO reactive token plumbing), eliminating a class of post-logout token-replay risks across regular and SSO sessions.
- LLM Generation Streaming
    - **Constraint:** LLM streaming relied on Socket.IO room broadcasts with no persistence — if a client disconnected mid-stream (network switch, page refresh), all streamed content was irreversibly lost, requiring users to regenerate the entire response.
    - Designed a Redis-backed stream catch-up mechanism that caches every streamed chunk during an active LLM generation session and replays the cached sequence to reconnecting clients, enabling seamless recovery without re-triggering the LLM call.
    - Solved race conditions in the replay-to-room-join transition by enforcing replay-before-join ordering and adding a fallback for streams that finish during the replay window.
    - Updated the frontend streaming renderer to handle burst replay, where cached chunks arrive all at once instead of the gradual pace of live generation.
    - Delivered end-to-end across backend (Django/Socket.IO/Redis) and frontend (Vue), eliminating a class of user-facing message loss during connection instability.

### Wrtn Technologies(Data Engineer Intern, 2024.12 - 2025.06, Seoul)

AI-search platform serving 5 millions of monthly active users https://wrtn.ai/

I had the opportunity to experience data infrastructure and AI systems in a fast-paced startup environment through daily scrums and cross-functional collaboration.

- **Data pipelines**
    - Developed data pipelines to be used in RAG system leveraging Airflow, BigQuery, Aws Batch, and Elasticsearch
    - Developed deal price crawling pipeline extracting structured data from 20+ e-commerce sites leveraging Vision Language Model (gpt 4o mini)
- **RAG system**
    - Participated in developing RAG system for better performance on questions about “wrtn company” and “book recommendation”
    - Conducted experiments to find best chunking strategy on Elasticsearch with the result of 23% better performance compare to existing strategy
    - Achieved 75% accuracy on implicit question answering by applying key expansion and search planner optimization.
    - Built production FastAPI microservice with RESTful endpoints, enabling document updates through internal tooling integration (Retool)

    <details>
    <summary>Examples</summary>

    - Before vs After the work (translated, question: “tell me about yourself”)
        - Answer before:

            ![Screenshot 2025-06-18 at 10.09.58 PM (1).png](/assets/portfolio/screenshot-2025-06-18-at-10-09-58-pm-1.png)

        - Answer after:

            ![Screenshot 2025-06-18 at 10.08.55 PM (1).png](/assets/portfolio/screenshot-2025-06-18-at-10-08-55-pm-1.png)

    - Retool interface for update document (translated)

        ![Screenshot 2025-06-19 at 9.07.30 PM (1).png](/assets/portfolio/screenshot-2025-06-19-at-9-07-30-pm-1.png)

        ![Screenshot 2025-06-19 at 9.08.23 PM (1).png](/assets/portfolio/screenshot-2025-06-19-at-9-08-23-pm-1.png)
    </details>

- **Long Term Memory Module**
    - Participated in developing and operating Long Term Memory module of AI assistant using Elasticsearch
    - Built comprehensive evaluation pipeline through cross-functional collaboration with data labeling specialists and conducted POC evaluation of third-party memory service
    - Improved memory recall accuracy from 23% to 71% through experiments on memory format, embedding strategies and Elasticsearch query
    - Fixed wrong production memory item formats by backfill batches using AWS Batch, Argo Workflows, and Datadog.

    <details>
    <summary>Details</summary>

    News Article: “Memory is the core of wrtn 3.0 release”

    ![Screenshot 2025-09-12 at 5.24.07 PM.png](/assets/portfolio/screenshot-2025-09-12-at-5-24-07-pm.png)

    [https://www.aitimes.com/news/articleView.html?idxno=169537](https://www.aitimes.com/news/articleView.html?idxno=169537)

    </details>

- **AI Quality Assurance & Automation**
    - Developed automated quality evaluation system using LLM-powered validation to reduce manual data labeling workload and improve development velocity
    - Deployed production-ready evaluation API with FastAPI and Retool integration for real-time quality assessment workflows

    <details>
    <summary>Example</summary>

    Retool interface of evaluation result (translated)

    ![retool_answer_eval.png](/assets/portfolio/retool-answer-eval.png)
    </details>

---

## Open source contribution

### Mem0 AI Assistant Memory System

 https://github.com/mem0ai/mem0 is an open source AI assistant memory system which received over **58k starts** on Github. I contributed to the project by improving customization for actions and queries, and fixing critical data duplication issues.

- Github: [mem0ai/mem0](https://github.com/mem0ai/mem0)
- All contributions: [Pull Requests](https://github.com/mem0ai/mem0/pulls?q=is%3Apr+author%3Arst0070)
    - Contributed to redesigning embedding modules to support task-specific actions
    - Contributed to enabling customization on memory action prompt and related documents
    - Contributed to enabling customization on Elasticsearch query
    - Contributed to fixing [memory duplication issue](https://github.com/mem0ai/mem0/issues/2578) by implementing proper async/await pattern

    <details>
    <summary>Details</summary>

    **Screenshot of PRs**

    ![image.png](/assets/portfolio/image.png)

    </details>

### Terraform Libvirt Provider

Terraform provider to provision infrastructure with Linux's KVM using libvirt. I contributed to the project by fixing mismatched support for libvirt volume import

- Github: [dmacvicar/terraform-provider-libvirt](https://github.com/dmacvicar/terraform-provider-libvirt)
- Contributions: [Pull Requests](https://github.com/dmacvicar/terraform-provider-libvirt/pulls?q=is%3Apr+is%3Aclosed+author%3Arst0070)
  
  
---

## Personal Projects

### Tiny Graph Extractor — Sub-1B LLM for Knowledge Graph Extraction (in progress)

Github: [rst0070/tiny-graph-extractor](https://github.com/rst0070/tiny-graph-extractor)
QLoRA adapter(huggingface): [rst0070/tiny-graph-extractor-qwen3.5-0.8b-qlora](https://huggingface.co/rst0070/tiny-graph-extractor-qwen3.5-0.8b-qlora)

Fine-tuned Qwen3.5-0.8B with GRPO to extract entities and (head, relation, tail) triplets from text — replacing the frontier-LLM API calls in the [knowledge graph management system](https://github.com/rst0070/knowledge-base) built for the Moodmate project with a model that trains and runs on a single consumer GPU (RTX 4060 Ti, 16GB).

- **Purpose:** The knowledge-graph pipeline made multiple frontier-LLM structured-output calls per ingested document (entity extraction, edge extraction, knowledge checking) — per-call cost scaling linearly with document volume. Extraction is a narrow, structured task; the goal was to replace it with a sub-1B fine-tuned model, trading recurring API cost for a one-time training cost, and closing the quality gap to a hosted API baseline (Gemini 2.5 Flash Lite).

- **Constraint — no definition of what a "good" knowledge graph is:** Open extraction has no single correct answer, which broke every reference-based approach I tried first:
    * A token-matching supervised loss (initial SFT attempt) mostly measured *output structure*, not content quality — the model earned low loss by reproducing formatting, giving no signal about whether the extracted knowledge was right.
    * Even with gold labels, you cannot say *which phrasing* of a relation is "the answer": canonicalized gold (`Steve Jobs —founded→ Apple`) scored a correct surface-form extraction (`Apple —was founded by→ Steve Jobs`) as wrong. Measured on identical predictions: relation F1 0.21 vs entity F1 0.71 — the metric was punishing wording, not errors.
    * **Conclusion:** stop scoring against a reference answer; score the output against the *source text itself*, reference-free. This one decision shaped both the evaluation and the training method.

- **Evaluation design — a reference-free reward, validated before trusted:** Decomposed "good extraction" into 7 independently checkable properties, using deterministic text checks wherever text suffices and an NLI judge only for what strings cannot catch:
    * **Text-based checks (cheap, deterministic):** structure gate (valid JSON/schema or sentinel −1.0), entity/relation deduplication, **entity grounding** (each entity must appear as a normalized substring of the source), and **relation grounding** (each triplet's head/tail must appear in the emitted entity list — transitively tying every triplet to the source through the grounded entities).
    * **NLI-based check (for what strings can't judge):** relation *correctness* — whether "A relation B" is actually asserted by the text, including direction errors like swapped subject/object — scored by verbalizing each triplet and asking an entailment model (FactCG DeBERTa-v3-Large) with the source as premise. A **coverage** component (accepted unique triplets vs expected count) acts as the anti-collapse counterweight, since a precision-only reward is maximized by emitting almost nothing.
    * **Validated the judge with negative controls** before letting it train anything: scored all 731 gold relations plus corrupted-triplet controls. The NLI model separates true from false almost perfectly (AUC 0.998; every clearly-false triplet < 0.28) — but a naive 0.5 accept threshold sat *inside* the gold score mass, rejecting 35% of correct answers. Replaced the hard threshold with a linear acceptance ramp placed in the empirically measured true/false gap, and computed the reward's ceiling from gold's own score (~0.93) so results are read as distance-to-ceiling, not to 1.0.

- **Test set construction:** The first eval set (fully LLM-generated) was unrealistically clean and used a different relation vocabulary than the model's outputs — comparing against it penalized on-contract behavior. Rebuilt a frozen 200-item set with a realistic distribution: CrossRE samples across 6 domains (AI, literature, music, news, politics, science) + manually collected real news snippets and headlines translated from ~10 source languages, keeping translation artifacts and truncation as deliberate distribution properties. Gold graphs were authored under a written **surface-form style guide** (lift predicates verbatim, keep the sentence's direction, split conjunctions into per-entity triplets, no world-knowledge inference), with per-item provenance metadata so results can be sliced by origin.

- **Training design — GRPO directly on the base model, no SFT:**
    * REBEL is used only as a *source of input sentences* — its gold answers are discarded. Each step samples a group of 12 completions for one prompt, scores them with the same reference-free reward, and pushes the policy toward above-average completions: group-normalized advantages, clipped surrogate objective, per-token KL to a reference policy (DeepSeek formulation) — with the reference implemented as the same model with LoRA adapters disabled, so no second model in memory. Loss math covered by unit tests.
    * Fit rollout + NLI judge + QLoRA policy (4-bit base + LoRA adapters) on one 16GB GPU with a predictive/reactive VRAM strategy: token-budget batching with length-bucketed shuffling, plus OOM-catch with recursive batch halving and token-weighted loss accumulation for mathematically identical gradients.
    * Ran 5 GRPO iterations with **one attributable change per run**, each driven by a written diagnosis of the previous run's reward behavior — e.g., run 5 raised only the acceptance ramp's low edge after quantifying that garbage-level relations were still earning floor credit, which reversed an over-extraction trend (predicted/gold relation ratio 1.62 → 1.50) while correctness kept rising.
    * Reported gains against a paired 95% CI over the 200 items, only claiming run-to-run improvements that clear the noise band.

- **Results (200-item test set, reference-free reward, sentinels included):**
    * Mean total reward **0.422 → 0.796** (pretrained → GRPO 5) vs Gemini 2.5 Flash Lite at 0.858, against a measured ceiling of ~0.93 — the 0.8B model closes most of the gap to the hosted API.
    * Structured-output reliability: parse failures **41/200 → 8/200, matching Gemini exactly**.
    * All three separating components improved: relation correctness 0.631 → 0.740, relation grounding 0.671 → 0.896, coverage 0.729 → 0.840 (Gemini: 0.869 / 0.913 / 0.939).
- Tools used: PyTorch, GRPO (from-scratch implementation), QLoRA (PEFT + bitsandbytes), Unsloth, HuggingFace Transformers & Datasets, FactCG DeBERTa-v3 NLI, CrossRE, REBEL (inputs only), Qwen3.5-0.8B, W&B, Docker, pytest


<details>
<summary>Details — results, GRPO loop</summary>

**Benchmark vs Gemini 2.5 Flash Lite** — fixed 200-item test set, scored by the reference-free reward. "Mean total" counts unparseable outputs as −1.0 (the quantity GRPO optimizes); "weighted total" is over parsed outputs only:

| | Gemini 2.5 Flash Lite | Qwen3.5-0.8B pretrained | GRPO run 5 |
|---|---|---|---|
| mean total (incl. parse failures) | 0.858 | 0.422 | **0.796** |
| weighted total (parsed only) | 0.935 | 0.788 | **0.871** |
| parse failures / 200 | 8 | 41 | **8** |

Progression across runs (mean total): 0.422 (pretrained) → 0.581 → 0.663 → 0.775 → 0.792 → **0.796**. The gains come both from eliminating parse failures (41 → 8, matching Gemini) and from steady relation-quality improvement.

**Reference-free reward composition (eval weights):** 

```mermaid
flowchart TD
    OUT["model output (JSON)"] --> GATE{"structure gate valid JSON + schema?"}
    GATE -- no --> SENT["sentinel −1.0 no partial credit"]
    GATE -- yes --> TXT
    subgraph TXT["Text-based checks (deterministic)"]
        direction LR
        ST["structure 0.10 well-formed relations"]
        ED["entity dedup 0.10"]
        RD["relation dedup 0.10"]
        EG["entity grounding 0.10; entity ⊂ source text"]
        RG["relation grounding 0.10<br/>head/tail ∈ entity list"]
    end
    GATE -- yes --> NLI
    subgraph NLI["NLI-based checks (FactCG DeBERTa)"]
        direction LR
        RC["relation correctness 0.35; triplet entailed by source (catches direction errors)"]
        RV["relation coverage 0.15; anti-collapse counterweight"]
    end
    TXT --> SUM["weighted total ∈ [0, 1]"]
    NLI --> SUM
```

- The GRPO loop (one prompt = one optimizer step):

```mermaid
flowchart TD
    DS[("REBEL sentence<br/>(input only, gold discarded)")] --> GEN["Generate G=12 completions<br/>temperature sampling, no grad"]
    GEN --> SCORE["Score each with the<br/>reference-free reward"]
    SCORE --> CHECK{"All rewards identical?"}
    CHECK -- "yes → zero advantage" --> DS
    CHECK -- no --> ADV["Group advantages<br/>A_i = (r_i − mean) / std"]
    ADV --> LOSS["clipped surrogate − β·KL<br/>(reference = LoRA adapters OFF)"]
    LOSS --> DS
```

**Negative-control validation of the NLI judge (why the ramp exists):** 
gold relations vs corrupted triplets scored by the same judge — AUC 0.998, all clearly-false mass < 0.28, but 35% of gold below the naive 0.5 threshold. The acceptance ramp [0.20, 0.50] sits in the measured gap, giving borderline triplets a gradient instead of a per-rollout coin flip.

</details>

### **OffNote AI — On-Device Note AI (iOS, released at 26.04.28)**

https://apps.apple.com/us/app/offnote-ai/id6762131607

A privacy-first note-taking app that extracts facts from user memos and uses them to answer questions in chat — running fully on-device with no cloud calls, no analytics, and no account required.

- **Constraint**: Targeted a 0.8B quantized LLM (Qwen 3.5, Q4) and a 137M embedding model (Nomic Embed v1.5, Q8) running through llama.cpp on phones with limited RAM and a small context window — too small to expect normal LLM workflow
- Designed an on-device fact extraction pipeline after empirically ruling out knowledge-graph extraction across 5 self-built test scripts: grammar-constrained JSON collapsed the small model's output, nested entity/relation schemas exceeded its capacity, and an LLM-as-judge verifier proved no smarter than the extractor itself.
- Settled on a sliding-window approach (3 sentences with 1-sentence overlap) with two-shot prompting and a deterministic token-overlap grounding filter that drops hallucinated facts at zero LLM cost — replacing the failed LLM-judge pattern with a heuristic that is dumber but more reliable for sub-1B models.
- Designed a priority queue with preemption in front of the single shared llama.cpp completion context so background fact extraction cannot block the user-facing chat: a high-priority chat request stops the in-flight low-priority extraction, the preempted job is re-enqueued at the front of the low-priority queue, and the original caller's promise stays pending until the retry completes — preventing the chat UI from freezing during background indexing.
- Implemented a dual-retrieval storage layer in op-sqlite: on-device embedding search (via the on-device Nomic embedder) for chat-time RAG, and SQLite FTS for instant keyword search across the user's memo list — picking the right tool per surface instead of forcing one mechanism to do both.
- Delivered end-to-end as a React Native (Expo) app: model download/lifecycle management, on-device LLM and embedding contexts, ingestion pipeline, chat with RAG, memo CRUD, and onboarding — currently under App Store review after iterating on App Store rejection feedback.
- Documented the full extraction journey (5 attempts, what failed and why) as a public engineering writeup intended to be useful to others working with sub-1B on-device models — https://rst0070.github.io/notes/26-04-28-utilize-slm
- Tools used: React Native, Expo, llama.cpp (llama.rn), Qwen 3.5 0.8B, Nomic Embed Text v1.5, op-sqlite (FTS + vector), TypeScript

<details>
<summary>Details</summary>

<video controls preload="metadata" src="/assets/portfolio/offnote-ai-preview.mp4"></video>

</details>

### Currency Converter — Multi-Currency iOS App (~30 downloads on App Store)

https://apps.apple.com/us/app/currency-converter-multi-save/id6759523149

A calculator-first currency converter built around three product principles: ad-free, no tracking, no account required.

- Shipped a calculator-style input (expressions like `1000 + 500` evaluate and convert in real-time), a bookmark feature for saving frequent currency sets, and a multi-currency view that converts one amount across several targets at once — prioritizing input speed over visual polish.
- Designed a server-less rate-distribution pipeline to keep operating cost near zero: a GitHub Actions workflow fetches rates from exchangerate-api.com on a fixed schedule and pushes a JSON snapshot to Cloudflare R2, and each mobile client fetches from R2 and caches locally — replacing a backend service with object storage as a read-only API.
- Implemented offline-first behavior with cached rates and a "last updated" timestamp, so the app remains usable without network access and degrades gracefully if the upstream feed is unreachable.
- Made deliberate product trade-offs: no ads, no analytics, no account required — accepting reduced monetization and observability in exchange for a faster, more trustworthy experience for the target user.
- Tools used: React Native, TypeScript, GitHub Actions, Cloudflare R2, exchangerate-api.com

### World Headlines - Full-Stack News Aggregation Platform

Production web application ([world-headlines.rst0070.com](http://world-headlines.rst0070.com/)) providing global news perspectives through automated content aggregation and translation.

- Github: [rst0070/world-headlines](https://github.com/rst0070/world-headlines)
- Built data pipeline for multi-source news crawling, translation, and keyword extraction using Playwright, ArgoWorkflows, and LLM integration
- Developed and deployed full-stack application with Spring Boot backend, React frontend, and PostgreSQL database on self-managed( Libvirt + Terraform ) k3s cluster
- Tools used: Libvirt, Terraform, Kubernetes & helm, ArgoWorkflows, PostgreSQL, React, Spring boot, Playwright Python, LLM APIs

<details>
<summary>Details</summary>

**Screenshot** 

This is screenshot of the web application. It provides users to choose language between English and Original language of the news.

![image.png](/assets/portfolio/image-1.png)

**Architecture**

This is overview of the architecture on kubernetes cluster including workflow(crawling & translation pipeline), Spring Boot Backend, React Frontend, and Self Hosted PostgreSQL.

![image.png](/assets/portfolio/image-2.png)

**Infrastructure**

I constructed the kubernetes cluster on multi virtual machines leveraging Ubuntu, KVM, Terraform

![image.png](/assets/portfolio/image-3.png)

</details>

### Moodmate - AI-Powered Interactive Diary

AI-driven diary application that analyzes user emotions and provides intelligent interactions through LLM integration and graph-based knowledge management.

- Github: [moodmate-ai/moodmate](https://github.com/moodmate-ai/moodmate)
- Led full-stack development as Technical Lead, architecting REST APIs, React frontend integration, and resolving critical production issues
- Built graph-based knowledge management system using Neo4j with producer-consumer pattern to decouple heavy LLM operations from real-time API responses
    - Knowledge Base Github: [rst0070/knowledge-base](https://github.com/rst0070/knowledge-base)
- Implemented infrastructure with Infisical secrets management, Harbor registry, and automated CI/CD pipelines via GitHub Actions
- Tools used: Aws EKS, Infisical, Harbor, React, Spring Boot, FastAPI, Neo4j, Kafka, Gemini api, Embedding

<details>
<summary>Details</summary>

**Example of extracted knowledge graph from diary**

![image.png](/assets/portfolio/image-4.png)

**Project Structure**

![image.png](/assets/portfolio/image-5.png)

**Architecture of knowledge management system**

![image.png](/assets/portfolio/image-6.png)

</details>

### Connect seoul book - Library Information Platform

Web application ([uos-hackathon-static.vercel.app](https://uos-hackathon-static.vercel.app/), static web now) providing unified library information across Seoul. The project was submitted to UOS hackathon 2024.

- Github: [UOSHackathon2024/connect_seoul_book](https://github.com/UOSHackathon2024/connect_seoul_book)
- Built ETL pipeline using Airflow to scrape, transform, and load library data from government providing data source
- Deployed backend infrastructure and ETL pipeline with Docker Compose
- Tools used: Docker compose, Airflow, MySQL, Playwright

<details>
<summary>Details</summary>

**Screenshot**

![image.png](/assets/portfolio/image-7.png)

**Service Architecture**

![image.png](/assets/portfolio/image-8.png)

</details>

---

## Research Experience

### Intelligent Robot Laboratory, University of Seoul(2022.12 - 2023.08)

As an undergraduate researcher, I had the opportunity to research Speaker Verification and Deepfake Audio Detection utilizing deep learning models.

- **PAS: Partial Additive Speech Data Augmentation Method for Noise Robust Speaker Verification**
    - As 1st author, proposed a data augmentation strategy for enhancing performance of Speaker Verification models in noisy environments
    - [https://arxiv.org/abs/2307.10628](https://arxiv.org/abs/2307.10628)
    - https://github.com/rst0070/Partial_Additive_Speech

    <details>
    <summary>Details</summary>

    ![image.png](/assets/portfolio/image-9.png)

    ![image.png](/assets/portfolio/image-10.png)

    </details>

- **HM-Conformer**
    - As 5th author, implemented Deepfake Audio Detection environment and closed-source model, named Rawformer
    - https://ieeexplore.ieee.org/abstract/document/10448453
    - https://github.com/rst0070/Rawformer-implementation-anti-spoofing

    <details>
    <summary>Details</summary>

    The source code of Rawformer is shared on Github(32 stars), and It is used various research such as followings

    - [https://arxiv.org/pdf/2404.13914](https://arxiv.org/pdf/2404.13914)
    - [https://arxiv.org/html/2404.13914v1](https://arxiv.org/html/2404.13914v1)

    </details>
