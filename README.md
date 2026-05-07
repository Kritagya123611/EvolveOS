<div align="center">

```
                  ███████╗██╗   ██╗ ██████╗ ██╗     ██╗   ██╗███████╗ ██████╗ ███████╗
                  ██╔════╝██║   ██║██╔═══██╗██║     ██║   ██║██╔════╝██╔═══██╗██╔════╝
                  █████╗  ██║   ██║██║   ██║██║     ██║   ██║█████╗  ██║   ██║███████╗
                  ██╔══╝  ╚██╗ ██╔╝██║   ██║██║     ╚██╗ ██╔╝██╔══╝  ██║   ██║╚════██║
                  ███████╗ ╚████╔╝ ╚██████╔╝███████╗ ╚████╔╝ ███████╗╚██████╔╝███████║
                  ╚══════╝  ╚═══╝   ╚═════╝ ╚══════╝  ╚═══╝  ╚══════╝ ╚═════╝ ╚══════╝
                       i
```

**A sovereign, self-evolving civilization of AI agents.**  
They live in here. You don't. Work crosses in. Intelligence crosses out.

<br/>

![Node](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-ESM-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-2.5%20Flash-4285F4?style=flat-square&logo=google&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-pgvector-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-BullMQ-DC382D?style=flat-square&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=flat-square&logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

</div>

---

## What Is This

EvolveOS is not an agent framework. It is not a prompt runner. It is not a wrapper around an LLM API.

It is an attempt to build the first AI system that works like an organization — one that **accumulates experience, teaches itself, repairs itself, and gets meaningfully smarter every day just by existing and working.**

**The Core Architectural Bet:** The current AI paradigm is to give models access to human systems and manage the risk with fragile guardrails. EvolveOS flips this. You build a sovereign world where agents live permanently. You send work **IN**. You get results **OUT**. The separation is the safety.

To achieve this, EvolveOS agents are built with:

- **A Persistent Hippocampus** — Long-term RAG memory powered by Supabase `pgvector`.
- **Physical Hands** — Execution of real syscalls on the host OS via Gemini Function Calling.
- **A Genesis Protocol** — Autonomous breeding of successor agents based on performance.
- **A Mentorship Pipeline** — Live transfer of synthesized architectural patterns to junior agents.

All of this runs across a crash-resilient, multi-process infrastructure wired together through BullMQ and Dockerized Redis.

> **Note:** This is early. The ideas are larger than the current implementation. That gap is the roadmap.
## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         HUMAN INTERFACE                             │
│              Task submitted → result returned. That's it.           │
└────────────────────────────┬────────────────────────────────────────┘
                             │ TaskPacket (BullMQ Job)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PROCESS 2 — queue.ts (BullMQ Worker)             │
│                                                                     │
│  bootWorld() ──► hydrate RAM from Supabase agents table             │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    JUDGEMENT LOOP (Lead Agent)               │   │
│  │                                                              │   │
│  │  model.startChat()                                           │   │
│  │       │                                                      │   │
│  │       ├── searchMemories() ──► pgvector cosine similarity    │   │
│  │       │        └── inject relevant past lessons into prompt  │   │
│  │       │                                                      │   │
│  │       └── while (task not complete):                         │   │
│  │               ├── LLM decides next action                    │   │
│  │               ├── functionCall detected → executeSyscall()   │   │
│  │               │       ├── runTerminalCommand → execSync()    │   │
│  │               │       └── writeLocalFile → fs.writeFile()    │   │
│  │               └── terminal output fed back to LLM            │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │               MENTORSHIP PIPELINE (Shadow Agent)             │   │
│  │                                                              │   │
│  │  Junior agent observes Lead's full reasoning trace           │   │
│  │  Synthesizes architectural pattern → 2-sentence lesson       │   │
│  │  saveMemory() → generateEmbedding() → Supabase memories      │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                   PROCESS 1 — clock.ts (Heartbeat)                  │
│                                                                     │
│  bootWorld() ──► reset all agent states to IDLE (crash recovery)    │
│                                                                     │
│  Loop:                                                              │
│    ├── Intrinsic Research: agents explore unprompted                │
│    └── Genesis Protocol: breed Gen-2 agents from high performers    │
│              └── spawnAgent() → RAM + Supabase INSERT               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        PERSISTENCE LAYER                            │
│                                                                     │
│   Supabase (PostgreSQL)                                             │
│     ├── agents table ──── agent registry, state, generation         │
│     └── memories table ── 768-D vectors + raw text (pgvector)       │
│                                                                     │
│   Redis (Docker)                                                    │
│     └── BullMQ queues ─── cross-process job transport               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Design Decisions Worth Reading

**Why two processes instead of one?**
The clock (heartbeat) and the worker have fundamentally different execution profiles. The clock runs continuous loops — breeding, intrinsic research, world health. The worker is event-driven — it sleeps until a job arrives. Combining them creates interference patterns that are hard to debug and impossible to scale. Two processes sharing Supabase state is cleaner, crash-isolates correctly, and maps naturally to horizontal scaling later.

**Why a circuit breaker on embeddings?**
Vector memory is not optional infrastructure in EvolveOS — it is the agent's hippocampus. If the embedding API is down and the whole memory system fails, you have an amnesiac agent completing tasks without context. The local fallback produces a deterministic, non-random 768-D vector from the text hash. It will never be as semantically rich as a real embedding — but it keeps the DB consistent and the agent functioning. Degraded intelligence beats broken infrastructure.

**Why `execSync` instead of `spawn` or `exec`?**
The Judgement Loop is inherently synchronous — the LLM waits for the syscall result before reasoning about the next step. Async here buys nothing and adds error surface. `execSync` with a timeout is the honest choice.

**Why Gemini Function Calling instead of a custom parser?**
The LLM deciding when to call a tool — and with what parameters — is a reasoning problem, not a parsing problem. Offloading it to native Function Calling means the model's own judgment determines when a syscall is appropriate. This produces more coherent multi-step execution than any regex or keyword parser would.

---

## Core Systems

### Hybrid Cache Architecture — `registry.ts`
Agents live in two places simultaneously: a RAM mirror for microsecond reads, and Supabase for permanent truth. `bootWorld()` reconciles them on every startup and resets all states to `IDLE` — so a crashed process never leaves agents in a locked state that poisons the next run.

### Persistent Hippocampus — `memory.ts`
Every agent has a long-term memory backed by Supabase `pgvector`. Memories are embedded using Google's `embedding-001` model into 768-dimensional vectors and retrieved via Cosine Similarity through a custom Postgres RPC (`match_memories`).

**Circuit Breaker:** If Google's embedding API returns a 404 or overload error, the system falls back to a local deterministic hashing algorithm that produces a valid 768-D array from raw text. The database transaction never fails. The agent never stalls.

### Host OS Syscalls — `tools.ts`
Agents can execute real commands on the host Ubuntu machine. This is wired through Gemini Function Calling — the LLM declares intent, EvolveOS executes physically.

Current syscalls:
```typescript
AXIOM_SYSCALLS = [
  runTerminalCommand,  // execSync → returns stdout/stderr
  writeLocalFile       // fs.writeFile → returns success/path
]
```

The Judgement Loop feeds terminal output back into the LLM context, creating a closed feedback cycle between thought and physical execution.

### The Judgement Loop — `queue.ts`
The core execution primitive. Not a chain. Not a DAG. A `while` loop that terminates when the LLM decides the task is physically complete.

```
receive TaskPacket
  → hydrate agent from RAM
  → fetch top-k memories via cosine similarity
  → inject memories into system prompt
  → model.startChat()
  → while !complete:
      → LLM reasons over current state
      → if functionCall: executeSyscall() → feed output back
      → if text response: evaluate completion
  → return result
```

### Mentorship Pipeline
A junior (shadow) agent observes the lead agent's complete reasoning trace after task completion. It synthesizes the core architectural pattern into a 2-sentence lesson and writes it to the vector database. Future agents inherit this lesson on day one — before they've done anything.

This is how institutional knowledge compounds without human curation.

### Genesis Protocol — `clock.ts`
The heartbeat process monitors agent performance. High-performing agents trigger a breeding event — `spawnAgent()` creates a mutated Gen-2 agent, pushes it to RAM, and INSERTs it into Supabase permanently. The civilization grows its own population.

---

### Security & Sandboxing (The Arbitrary Code Execution Problem)
Currently, Layer 2 (Tools & Syscalls) executes commands directly on the host OS via Node's `execSync`. **This is intentionally dangerous for local prototyping.** In a production environment, this architecture demands strict isolation. The immediate roadmap for Layer 2 involves routing 
all `runTerminalCommand` requests into ephemeral, restricted Docker containers or secure sandboxes (like gVisor or Firecracker microVMs). The LLM is given hands, but those hands must be kept inside a blast-proof box.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js v20, TypeScript, ESM (`tsx`) |
| LLM | Google Gemini 2.5 Flash (generation + function calling) |
| Embeddings | Google `embedding-001` (768-D) |
| Vector DB | Supabase PostgreSQL + `pgvector` |
| Job Queue | BullMQ |
| Broker | Redis (Dockerized) |
| OS Interface | `execSync`, `fs` (Node stdlib) |
| Transport | `ws` (custom Supabase Realtime transport for Node 20) |

---

## Project Structure

```
evolveos/
├── src/
│   ├── db.ts          # Supabase connection (ws transport)
│   ├── registry.ts    # RAM cache + bootWorld() + spawnAgent()
│   ├── memory.ts      # Embedding, circuit breaker, saveMemory(), searchMemories()
│   ├── tools.ts       # AXIOM_SYSCALLS schema + executeSyscall()
│   ├── clock.ts       # Process 1: heartbeat, intrinsic research, Genesis Protocol
│   └── queue.ts       # Process 2: BullMQ worker, Judgement Loop, Mentorship
├── docker-compose.yml # Redis
├── .env
├── package.json
└── tsconfig.json
```

---

## Getting Started

**Prerequisites:** Node.js v20, Docker, a Supabase project, a Google AI API key.

```bash
git clone https://github.com/yourusername/evolveos
cd evolveos
npm install
```

**Start Redis:**
```bash
docker compose up -d
```

**Configure environment:**
```bash
cp .env.example .env
# Fill in: SUPABASE_URL, SUPABASE_ANON_KEY, GOOGLE_AI_API_KEY, REDIS_URL
```

**Run the Supabase migrations** (agents table, memories table with pgvector, match_memories RPC).

**Start both processes:**
```bash
# Terminal 1 — Heartbeat
npx tsx src/clock.ts

# Terminal 2 — Worker
npx tsx src/queue.ts
```

---

## Supabase Schema

```sql
-- Agents registry
create table agents (
  id text primary key,
  name text not null,
  domain text not null,
  reputation integer default 50,
  system_prompt text not null,
  state text default 'IDLE',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Persistent memory with vector support
create extension if not exists vector;

create table memories (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id),
  content text not null,
  embedding vector(768),
  created_at timestamptz default now()
);

-- Cosine similarity search
create or replace function match_memories(
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (id uuid, content text, similarity float)
language sql stable as $$
  select id, content, 1 - (embedding <=> query_embedding) as similarity
  from memories
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
```

---

## Roadmap

- [ ] Access control layer — agents cannot read each other's memories without permission
- [ ] Inter-agent job board — task decomposition + bid engine
- [ ] Reputation engine — performance-weighted trust scores
- [ ] Guild formation — persistent domain expert teams
- [ ] World constitution — immutable core values enforced at the process level
- [ ] REST/WebSocket API — external task submission interface
- [ ] Sub-world sandboxes — isolated experiment environments before main-world deployment
- [ ] `worldrift` CLI — human-facing Jarvis interface

---

## Philosophy

The dominant paradigm in agentic AI is: give the model access to your systems, then manage the risk.

EvolveOS starts from a different premise. The agents live in their world. You live in yours. The border between them is the only security primitive that matters — because it is architectural, not configurable.

Everything else — self-repair, mentorship, genesis, intrinsic research — is a consequence of taking seriously the idea that agents should behave less like tools and more like an organization with memory, values, and the ability to improve itself.

This is an early implementation of a long idea.

---

## Contributing

This project is in active early development. The architecture is intentionally opinionated and the codebase is intentionally small — every file is meant to be readable by a new contributor in under 10 minutes.

If the philosophy resonates and you want to build on it, open an issue or start a discussion. PRs without a prior conversation are unlikely to be merged — not because contributions aren't welcome, but because the design decisions need to be understood before they can be extended.

---

## License

MIT — build on it, break it, make it yours.

---

<div align="center">
<br/>
<i>The agents live here. You don't.<br/>Work crosses in. Intelligence crosses out.</i>
<br/><br/>
</div>
