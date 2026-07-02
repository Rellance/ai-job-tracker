# AI Job Tracker — System Design

|                  |                                                      |
| ---------------- | ---------------------------------------------------- |
| **Document**     | 02 — System Design                                   |
| **Status**       | Draft for approval                                   |
| **Version**      | 1.0                                                  |
| **Owner**        | Illia                                                |
| **Last updated** | 2026-06-30                                           |
| **Depends on**   | `01-PRD.md`                                          |
| **Feeds**        | `03-database-design.md`, `05-implementation-plan.md` |

> This document describes **how** the system is built: topology, layering, the background-job and AI pipelines, auth, security, billing, storage, and observability. Data shapes are finalized in `03-database-design.md`.

**Locked decisions carried from PRD review:** Free quota = **10 AI actions / month**; ghosted threshold = **21 days**; **Google OAuth schema-ready but MVP is credentials-only**.

---

## 1. Architecture at a glance

```
                                   ┌──────────────────────────────────┐
                                   │            BROWSER                 │
                                   │  Next.js RSC + Client Components   │
                                   │  shadcn/ui · Tailwind              │
                                   │  TanStack Query (Kanban / AI poll  │
                                   │   / notifications only)            │
                                   └───────────────┬────────────────────┘
                                                   │ HTTPS (cookie session)
              ┌────────────────────────────────────┼─────────────────────────────────┐
              │                       NEXT.JS 15 "web" container                       │
              │                                                                         │
              │   Server Components ──► read via Service Layer ──► Prisma               │
              │   Server Actions    ──► mutate via Service Layer ──► Prisma + emit Event│
              │   Route Handlers     ──► AI enqueue · Stripe webhook · auth · uploads   │
              │                              │                 ▲                        │
              │                              │ enqueue job     │ poll job status        │
              └──────────────────────────────┼─────────────────┼────────────────────────┘
                                             ▼                 │
                                      ┌─────────────┐          │
                                      │   Redis     │◄─────────┘
                                      │  (BullMQ)   │
                                      └──────┬──────┘
                                             │ consume
              ┌──────────────────────────────▼──────────────────────────────┐
              │                    "worker" container (BullMQ)                │
              │   ai-runs · resume-parse · reminders(repeatable) · email      │
              │        │              │                │            │         │
              └────────┼──────────────┼────────────────┼────────────┼────────┘
                       ▼              ▼                ▼            ▼
                ┌───────────┐  ┌────────────┐   ┌───────────┐ ┌──────────┐
                │ OpenAI API│  │   R2/S3    │   │ Postgres  │ │  Resend  │
                │(structured│  │ (resumes)  │   │ (Prisma)  │ │ (email)  │
                │  outputs) │  └────────────┘   └───────────┘ └──────────┘
                └───────────┘
   Cross-cutting:  Stripe (Checkout + webhooks) · Sentry (errors) · Zod env validation
```

**Two processes share one codebase, one database, one Redis.** `web` serves UI + API; `worker` runs jobs. This is the key shape that makes BullMQ work (a queue needs an always-on consumer that a serverless function can't be).

---

## 2. Deployment topology (Docker Compose)

| Service    | Image / build                 | Role                                 | Dev | Prod                              |
| ---------- | ----------------------------- | ------------------------------------ | --- | --------------------------------- |
| `web`      | app Dockerfile (Next.js)      | UI + Route Handlers + Server Actions | ✔   | ✔                                 |
| `worker`   | same image, different command | BullMQ consumers + scheduler         | ✔   | ✔                                 |
| `postgres` | postgres:16                   | primary DB                           | ✔   | managed PG in prod (or container) |
| `redis`    | redis:7                       | BullMQ broker                        | ✔   | managed Redis or container        |
| `mailpit`  | mailpit                       | catch dev emails                     | ✔   | — (Resend in prod)                |

External (prod): **OpenAI**, **Stripe**, **Cloudflare R2**, **Resend**, **Sentry**.

`web` and `worker` are the **same built image** invoked with different entrypoints (`next start` vs `node worker.js`). One build, two roles — simpler CI and guaranteed code parity between the request side and the job side.

---

## 3. Application layering & rules

```
app/ (routes)        ── thin: auth-guard → Zod-parse → call service → shape response
  ├─ Server Actions  ── mutations from forms (create/edit/delete, move card, add note)
  ├─ Route Handlers  ── AI enqueue, job status, Stripe webhook, auth, file upload
  └─ Server Comps    ── reads (render directly from services)
        │
lib/services/        ── THE ONLY place business logic + Prisma live. fn(userId, input)
        │
        ├─ lib/db.ts        Prisma singleton
        ├─ lib/ai/          OpenAI client, prompts, per-tool Zod schemas, runStructured()
        ├─ lib/queue/       BullMQ queues + job producers (enqueue helpers)
        ├─ lib/billing/     Stripe client, checkout, webhook handlers, quota
        ├─ lib/storage/     R2/S3 abstraction (put/get/signed url)
        ├─ lib/events/      ActivityEvent emitter (single chokepoint)
        ├─ lib/auth.ts      Auth.js config
        └─ lib/validations/ Zod schemas shared by client + server
```

**Hard rules (enforced in review):**

1. Components never import Prisma, OpenAI, or Stripe directly — only services/hooks.
2. Business logic lives only in `lib/services`. Route files and actions are glue.
3. Every service function takes `userId` as its first argument and scopes all queries by it.
4. Every mutation that matters emits exactly one `ActivityEvent` via `lib/events` (never write to the table directly).
5. Validation happens twice: client (UX) and server (trust). Same Zod schema both sides.

**Why this layering?** It keeps the monolith from rotting: if we ever split `worker`/`web`/an external API out, the service layer lifts cleanly because nothing above it owns logic. Tradeoff: a little indirection for small CRUD — accepted, because the AI/queue/billing surfaces are where complexity actually lives and they _need_ a clean home.

---

## 4. Three request lifecycles

**(A) Mutation — Server Action (e.g. create application)**

```
form submit → Server Action
  → getServerSession (401-equivalent: redirect)
  → Zod parse (return field errors to RHF)
  → applicationService.create(userId, data)
       → prisma.application.create
       → eventService.emit(userId, 'APPLICATION_CREATED', …)
  → revalidatePath('/app/applications')
```

**(B) AI tool — Route Handler + background job (e.g. analyze JD)**

```
POST /api/ai/analyze-jd
  → session + Zod parse
  → quotaService.assertWithinLimit(userId)        // 402-style block if over
  → cache: find AiArtifact by inputHash → if hit, return immediately
  → aiArtifactService.createPending(userId, kind, input)   // status PENDING
  → queue.aiRuns.add({ artifactId })
  → 202 { artifactId, status: 'PENDING' }
        … client polls GET /api/ai/artifacts/:id via TanStack Query …
```

**(C) Read — Server Component (e.g. dashboard)**

```
DashboardPage (RSC)
  → session
  → analyticsService.getOverview(userId)   // direct Prisma aggregation, no API call
  → render charts (client component receives plain data)
```

Mixing styles is intentional and rule-bound (PRD §): **Server Actions for first-party form UX, Route Handlers for AI/streaming/webhooks/uploads, RSC for reads.**

---

## 5. Background jobs (BullMQ)

### Queues

| Queue          | Producer              | Worker does                                                               | Retry                                                                        |
| -------------- | --------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `ai-runs`      | AI route handlers     | call OpenAI → validate → persist `AiArtifact` → emit event + notification | 2 retries, exp backoff; on final fail → status FAILED, **no quota consumed** |
| `resume-parse` | resume upload handler | download from R2 → extract text → save `parsedText`                       | 3 retries                                                                    |
| `reminders`    | repeatable scheduler  | scan due `reminderAt`/`scheduledFor` → create `Notification`              | n/a (idempotent scan)                                                        |
| `email`        | various services      | render + send via Resend (Mailpit in dev)                                 | 3 retries                                                                    |

### Worker process

- Separate entrypoint (`src/worker.ts`) importing the same services. Each queue gets a BullMQ `Worker` with a typed processor.
- **Reminders** use a BullMQ _repeatable job_ (every minute) that queries for due items — simpler and more reliable than scheduling one timer per reminder, and survives restarts.
- **Idempotency:** AI jobs key off `artifactId` (already PENDING); a re-delivered job that finds the artifact COMPLETE exits early. Reminder scan marks items dispatched to avoid double-send.
- **Concurrency** is bounded per queue to protect OpenAI rate limits and DB connections.

### Job status to the client

The client doesn't hold a socket open. It polls `GET /api/ai/artifacts/:id` with TanStack Query (`refetchInterval` while `PENDING/RUNNING`, stop on terminal). Simple, serverless-friendly, good enough at this scale. _Alternative considered:_ SSE/WebSocket push — more infra for marginal UX gain at MVP; deferred.

**Why BullMQ over inline async?** A 10–30s OpenAI call must not occupy a request/Server-Action lifecycle (timeouts, bad UX, no retry). Jobs give retries, backoff, concurrency limits, and a clean "pending → ready" UX. Tradeoff: an always-on `worker` + Redis (already accepted in scope).

---

## 6. AI module (`lib/ai`)

```
lib/ai/
  client.ts        ── OpenAI client (key from validated env)
  models.ts        ── model tiering map: { extraction: 'mini', generation: 'full' }
  runStructured.ts ── generic: (schema, prompt, model) → typed, validated result
  prompts/         ── one template per tool (system + user builder)
  schemas/         ── Zod output schema per tool (also source for JSON schema)
  tools/           ── analyzeJd, resumeGap, matchScore, coverLetter, interviewPrep, optimize
  cost.ts          ── token → cost mapping; recorded on every artifact
```

- **Structured outputs:** `runStructured(schema, …)` derives the OpenAI JSON schema from the Zod schema, calls the API in structured-output mode, then re-validates the response with the _same_ Zod schema before persisting. Guaranteed-parseable; no regex-on-prose.
- **Model tiering:** extraction tools (JD Analyzer, Interview Prep, Match Score) use the cheaper model; generation tools (Cover Letter, Optimization) use the higher-quality model. One map, swappable per tool/env.
- **Caching:** `inputHash = sha256(kind + normalized input)`. A hit returns the existing artifact instantly with zero cost.
- **Streaming:** Cover Letter streams tokens to the client (Route Handler returns a stream) for perceived speed; the final text is still persisted as an artifact.
- **Cost/quota:** every run records `tokensIn/Out` + `costCents`; quota is checked before enqueue and decremented on success only.

### AI pipeline end-to-end (sequence)

```
client → POST /api/ai/<tool>
  → quota OK? → cache miss?
  → create AiArtifact(status=PENDING) → enqueue ai-runs → 202
worker (ai-runs):
  → load artifact → status=RUNNING
  → build prompt (input + sourceRefs: resume text, JD) → runStructured()
  → validate result → persist (status=COMPLETE, result, tokens, cost, inputHash)
  → quotaService.consume(userId, 1)
  → eventService.emit('AI_GENERATED') → notificationService.create('ready')
client (polling):
  → GET /api/ai/artifacts/:id → COMPLETE → render result, stop polling
on failure:
  → status=FAILED, message set, quota NOT consumed, retry offered
```

---

## 7. Authentication & sessions

- **Auth.js v5** with the Prisma adapter. **Credentials provider** for email + password (MVP). Google OAuth provider is wired in config behind a flag but disabled — enabling later needs no migration (the `Account` table already exists).
- **Passwords:** hashed with `argon2id` (preferred) or `bcrypt`. Never stored or logged in plaintext.
- **Sessions:** database sessions via the adapter; secure, httpOnly, sameSite cookies.
- **Password reset:** request → generate single-use token (hashed in DB) with ≤60 min expiry → email link (Resend/Mailpit) → set new password → invalidate token + existing sessions.
- **Route protection:** `middleware.ts` guards `/app/**` (redirect to `/login?next=…`); additionally every service/handler re-checks session server-side (defense in depth — middleware is not a security boundary on its own).

---

## 8. Authorization & multi-tenant isolation

- Single-user-per-account model; isolation is **per `userId`**.
- **Pattern:** every query in a service includes `where: { userId }`. Fetch-by-id is `findFirst({ where: { id, userId } })` — a row owned by someone else returns `null` → handler responds **404** (not 403, to avoid leaking existence).
- No raw SQL with interpolation anywhere; Prisma parameterizes everything.

---

## 9. Security model (PRD §9 → implementation)

| Threat                         | Mitigation                                                                                                                                                            |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Invalid/malicious input**    | Zod at every boundary (body, query, params); reject with structured field errors.                                                                                     |
| **AuthN**                      | Argon2id hashing, secure cookies, single-use expiring reset tokens, session invalidation on password change.                                                          |
| **AuthZ / IDOR**               | `userId`-scoped queries; cross-tenant → 404.                                                                                                                          |
| **Rate abuse**                 | Per-user + per-IP limits on mutations and especially AI routes (sliding window in Redis; in-memory fallback in dev). Quota is a second, business-level limiter on AI. |
| **SQL injection**              | Prisma parameterized queries only.                                                                                                                                    |
| **XSS**                        | React auto-escaping; user markdown (notes, AI output) rendered through a sanitizer (e.g. `rehype-sanitize`); strict **CSP** header.                                   |
| **Clickjacking / sniffing**    | Security headers via middleware: CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, HSTS in prod.                                             |
| **File upload abuse**          | Validate MIME + size (≤5 MB) + extension; store outside web root (R2); parse in a sandboxed job; never execute.                                                       |
| **Secret leakage**             | All secrets server-only; **env validated by a Zod schema at boot** (app refuses to start if misconfigured); nothing secret imported into client components.           |
| **Webhook spoofing**           | Stripe webhook signature verified with the signing secret before processing.                                                                                          |
| **Error leakage / monitoring** | Generic messages to client; full detail to Sentry + structured logs.                                                                                                  |

---

## 10. Billing (Stripe, test-mode)

```
Pricing page → POST /api/billing/checkout
  → create Stripe Checkout Session (price = plan) → redirect to Stripe (test cards)
Stripe → POST /api/stripe/webhook (signature-verified)
  → checkout.session.completed / customer.subscription.updated|deleted
  → billingService syncs Subscription + User.plan + quota limits
Quota:
  → quotaService.assertWithinLimit() gates AI routes; FREE=10/mo (reset monthly via
    aiCreditsReset); over-limit → 402-style response → UI shows upgrade prompt.
```

Test-mode proves the full integration (Checkout + webhook + plan sync + quota) without real charges. Live-mode is a key swap later.

---

## 11. File storage

- Abstraction `lib/storage` with one interface (`put`, `get`, `getSignedUrl`, `delete`); **local disk volume in dev**, **Cloudflare R2 (S3-compatible) in prod** — same code path.
- Resume upload: handler validates → stores to storage → creates `Resume` row → enqueues `resume-parse`. Parsed text is what AI consumes (PDF/DOCX text extraction in the worker, not the request).

---

## 12. Observability & ops

- **Sentry** in `web` and `worker` for exceptions (incl. failed jobs).
- **Structured logging** (request id, userId, job id) — JSON in prod.
- **Health checks:** `/api/health` (DB + Redis ping) for container orchestration.
- **Job visibility:** AI job status is user-visible; failed jobs are logged + surfaced.

---

## 13. Configuration & environments

- **`lib/env.ts`** validates `process.env` against a Zod schema at startup (DATABASE_URL, REDIS_URL, NEXTAUTH_SECRET, OPENAI_API_KEY, STRIPE__, R2__, RESEND_API_KEY, SENTRY_DSN, …). Missing/invalid → crash with a clear message. No `process.env.X` reads scattered through the code.
- **`.env.example`** documents every variable. Dev defaults point at compose services (postgres, redis, mailpit) so `docker compose up` works out of the box.

---

## 14. Error handling & API contract

- **REST envelope:** `{ error: { code, message, fields? } }`; success returns the resource or `{ items, total, page }`.
- **Status codes:** 200/201/204 success; 400 validation; 401 unauth; 404 not-found/cross-tenant; 402-style for quota; 429 rate limit; 500 unexpected (logged to Sentry, generic message out).
- **Client:** TanStack Query surfaces errors to toast/inline; Server Actions return typed `{ ok, error }` for RHF.

---

## 15. Testing strategy (detail in `05`)

- **Unit (Vitest):** services (with a test DB or mocked Prisma), Zod schemas, AI schema parsing, quota logic, event emission.
- **Integration:** key Route Handlers (auth guard, AI enqueue, Stripe webhook signature).
- **E2E (Playwright, a few flows):** register → create application → move on board → run an AI tool.
- CI runs lint + typecheck + unit on every push.

---

## 16. Scalability & future notes

- The `web`/`worker`/`service-layer` split is the seam for growth: scale `worker` independently, add queues, or lift the API out behind the same services.
- Post-MVP (schema-ready): URL job import (a `fetch+parse` job), AI Chat (`AiArtifact` kind=CHAT with message history), Chrome extension (hits existing Route Handlers), email notifications (existing `email` queue), live billing, team workspaces (would introduce an `Organization` tenant above `User`).

---

_Approve to proceed — next is `03-database-design.md` (final Prisma schema + ERD)._
