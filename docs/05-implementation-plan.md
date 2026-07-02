# AI Job Tracker — Implementation Plan

|                  |                          |
| ---------------- | ------------------------ |
| **Document**     | 05 — Implementation Plan |
| **Status**       | Draft for approval       |
| **Version**      | 1.0                      |
| **Owner**        | Illia                    |
| **Last updated** | 2026-06-30               |
| **Depends on**   | `01`–`04`                |

> Translates the design into actionable, ordered work. Each milestone has tasks (checklists) and a **Definition of Done**. Phase 6 (code) executes this top-to-bottom. Estimate: **~3.5 focused weeks** for MVP (M0–M5 essentials).

---

## Global Definition of Done (applies to every task)

- TypeScript strict passes; ESLint + Prettier clean.
- Server-side Zod validation on every new input boundary.
- All queries scoped by `userId`; cross-tenant → 404.
- Loading / empty / error states present for any new async UI.
- Significant mutations emit an `ActivityEvent`.
- Unit tests for new service logic; no failing tests in CI.

---

## M0 — Foundation `(~1.5 days)`

- [ ] `create-next-app` (App Router, TS, Tailwind, ESLint); enable TS **strict** + `noUncheckedIndexedAccess`.
- [ ] Prettier + ESLint config (import order, tailwind plugin); editorconfig.
- [ ] Init shadcn/ui; install base components; set up design tokens + dark mode (`next-themes`).
- [ ] `lib/env.ts` — Zod env validation; `.env.example`.
- [ ] Prisma init; paste schema from `03`; first migration; `lib/db.ts` singleton.
- [ ] `prisma/seed.ts` (demo dataset).
- [ ] **docker-compose**: `web`, `worker`, `postgres`, `redis`, `mailpit`; app `Dockerfile` (multi-stage); single image, two entrypoints.
- [ ] App shell skeleton: `(app)` layout, sidebar, topbar, theme toggle.
- [ ] CI (GitHub Actions): install → lint → typecheck → unit.

**DoD:** `docker compose up` boots web+worker+db+redis; migrations + seed run; shell renders in light/dark; CI green.

---

## M1 — Authentication `(~2 days)`

- [ ] Auth.js v5 config (Prisma adapter, Credentials provider; Google provider wired-but-disabled).
- [ ] Argon2id hashing; register Server Action + Route Handler; login/logout.
- [ ] `middleware.ts`: protect `/app/**` (redirect `?next=`), security headers (CSP, X-Frame-Options, etc.).
- [ ] Password reset: request → `PasswordResetToken` (hashed, ≤60m) → email (Mailpit) → set-new → invalidate token + sessions.
- [ ] Auth UI (login/register/reset) with RHF+Zod.
- [ ] `email` queue + Resend/Mailpit sender; `USER_LOGIN` event.

**DoD:** full register→login→logout→reset cycle works; protected routes enforced; reset email lands in Mailpit; passwords hashed.

---

## M2 — Applications & Notes `(~3 days)`

- [ ] `lib/validations` (application, note schemas); `lib/services/application`, `note`, `contact`.
- [ ] `lib/events` emitter (single chokepoint).
- [ ] Applications: create/edit/delete (Server Actions); detail page with tabs.
- [ ] List: `ApplicationsTable` + `FilterBar` (search/filter/sort/paginate), URL-synced state.
- [ ] Notes: typed, pinnable, sanitized markdown; included in search.
- [ ] Contacts (recruiter) on application.
- [ ] Unit tests: application service (CRUD, scoping), filters, event emission.

**DoD:** full CRUD + search/filter/sort/paginate; notes & contacts work; events recorded; tests pass.

---

## M3 — Board, Calendar, Dashboard `(~3.5 days)`

- [ ] Kanban (dnd-kit): 5 columns, status mapping, `move` Server Action, optimistic TanStack mutation + rollback, keyboard a11y + live region.
- [ ] `lib/services/interview`; Calendar (month + agenda), schedule from day/detail, color by type.
- [ ] Reminders: BullMQ repeatable scan → `Notification`; `NotificationBell` (unread, popover, poll).
- [ ] `lib/services/analytics`: stat cards + over-time/donut/funnel; advanced metrics (response time, interview/offer/ghosted rate, by weekday/month, top tech) from `ActivityEvent`.
- [ ] Dashboard page (StatCards, ChartCards, Upcoming, **ActivityFeed**); empty/insufficient-data states.

**DoD:** drag works with persistence + a11y; calendar shows events; reminders fire via worker; dashboard numbers reconcile with list.

---

## M4 — AI Workspace + Background jobs `(~4 days)`

- [ ] `lib/ai`: `client`, `models` (tiering), `runStructured` (Zod→JSON-schema→validate), `cost`, prompts + schemas per tool.
- [ ] `lib/queue` (BullMQ queues + producers); `src/worker.ts` (ai-runs, resume-parse processors).
- [ ] `lib/services/aiArtifact` + `quotaService` (FREE=10/mo, reset); `inputHash` cache.
- [ ] AI Route Handlers: analyze-jd, resume-gap, match-score, cover-letter (**streaming**), interview-prep, optimize; `GET /api/ai/artifacts/:id` for polling.
- [ ] Resumes: upload (`lib/storage`), validate, `resume-parse` job → `parsedText`; resumes UI.
- [ ] AI Workspace UI: hub, tool workspaces, `JobStatusIndicator`, `AiResultPanel`, Save / Attach-to-application, MatchScoreRing on board/detail.
- [ ] AI Insights tab on application detail.
- [ ] Unit tests: schema parsing, quota, cache, cost.

**DoD:** all MVP tools run as jobs (pending→ready), validated outputs persisted + attachable; quota + cache enforced; cover letter streams; failed runs don't consume quota.

---

## M5 — Billing & Hardening `(~2.5 days)`

- [ ] `lib/billing`: Stripe client, Checkout, **webhook (signature-verified)**, `Subscription` sync, plan→quota.
- [ ] Pricing page; Settings → Billing (usage Progress, upgrade/cancel); over-quota → upgrade prompt.
- [ ] Rate limiting (Redis sliding window; in-memory dev) on mutations + AI; 429 handling.
- [ ] Sentry (web + worker); `/api/health`; structured logs.
- [ ] A11y pass, dark-mode polish, all empty/loading/error states audited; Settings → Audit Log.
- [ ] Playwright smoke E2E: register → add application → move on board → run a tool → upgrade (test card).

**DoD:** test-mode upgrade lifts quota via webhook; limits enforced; Sentry captures; E2E green; a11y checklist passes.

---

## M6 — Ship `(~1.5 days)`

- [ ] Production Dockerfile finalized; `migrate deploy` release step; env management for prod.
- [ ] README: local dev (`docker compose up`), env matrix, prod deploy guide, architecture overview linking `docs/`.
- [ ] Final pass: lighthouse/perf, seed for demo, screenshots.

**DoD:** clean clone → documented steps → running app; deploy guide complete.

---

## Environment / config matrix

| Var                                                       | Dev                 | Prod          | Used by       |
| --------------------------------------------------------- | ------------------- | ------------- | ------------- |
| `DATABASE_URL`                                            | compose postgres    | managed PG    | Prisma        |
| `REDIS_URL`                                               | compose redis       | managed Redis | BullMQ        |
| `NEXTAUTH_SECRET` / `NEXTAUTH_URL`                        | local               | prod domain   | Auth.js       |
| `OPENAI_API_KEY`                                          | real key            | real key      | AI            |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / price ids | test                | test (MVP)    | billing       |
| `R2_*` (endpoint/keys/bucket)                             | local disk fallback | R2            | storage       |
| `RESEND_API_KEY`                                          | — (Mailpit)         | Resend        | email         |
| `SENTRY_DSN`                                              | optional            | set           | observability |

`lib/env.ts` validates all of these at boot; missing required → fail fast.

## Test strategy

- **Vitest unit:** services (scoping, CRUD), Zod schemas, AI structured parsing, quota/cache, analytics math, event emission.
- **Integration:** auth guard, AI enqueue → status, Stripe webhook signature.
- **Playwright E2E (smoke):** the 4 critical flows in M5.
- **CI:** lint + typecheck + unit on every push; E2E on demand/pre-release.

## Sequencing notes / critical path

`M0 → M1 → M2 → M3` is the spine. M4 (AI) depends on M2 data and M0 worker infra but its tools can be built one-by-one. M5 billing depends on M1 users + M4 quota. Cut order if time-constrained: Resume Optimization, advanced analytics, email notifications, Playwright breadth — all `[Should]`, droppable without breaking the core demo.

---

_This completes the planning set (Docs 01–05). Approve to begin **Phase 6 — code at M0**._
