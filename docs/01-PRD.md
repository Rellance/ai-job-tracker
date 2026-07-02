# AI Job Tracker — Product Requirements Document (PRD)

|                  |                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| **Document**     | 01 — Product Requirements                                                                             |
| **Status**       | Draft for approval                                                                                    |
| **Version**      | 1.0                                                                                                   |
| **Owner**        | Illia                                                                                                 |
| **Last updated** | 2026-06-30                                                                                            |
| **Related docs** | `02-system-design.md`, `03-database-design.md`, `04-frontend-ui-spec.md`, `05-implementation-plan.md` |

> This is the source of truth for **what** we build and **why**. The **how** lives in System Design (02) and Database Design (03). If a feature is not described here, it is not in scope.

---

## 1. Vision

> **AI Job Tracker turns a chaotic, spreadsheet-driven job search into a structured, AI-assisted pipeline — so a job seeker always knows where they stand and never has to write a cover letter or analyze a job description from scratch.**

The product is two things fused together:

1. A **pipeline tool** (applications, Kanban, calendar, reminders, analytics) that replaces the personal tracking spreadsheet.
2. An **AI workspace** that analyzes job descriptions, finds resume gaps, generates cover letters, prepares interviews, and scores fit — _in the context of the role the user is looking at._

The differentiator is that AI is not a separate chatbot tab; it is woven into the workflow and its outputs are saved, attached to applications, and reusable.

---

## 2. Problem statement

Job seekers today face three compounding problems:

1. **Lost state.** Across 20–60 applications they forget where they applied, what status each is in, who the recruiter was, and when to follow up. Spreadsheets rot and don't remind anyone of anything.
2. **Repetitive high-effort writing.** Every application "should" have a tailored cover letter and a resume aligned to the JD. In practice people skip this because it's slow — and their conversion suffers.
3. **No feedback loop.** They can't see their own funnel: what's their interview rate, how often are they ghosted, which skills keep coming up that they're missing. Without data they can't improve.

**Why now / why AI:** LLMs make per-application tailoring (cover letters, gap analysis, interview prep) cheap and instant. The bottleneck shifts from "writing" to "organizing + deciding", which is exactly what a good tracker provides.

---

## 3. Goals & non-goals

### 3.1 Goals

- **G1.** Let a user capture and organize every application with near-zero friction.
- **G2.** Give AI leverage on the slow parts (JD analysis, resume gap, cover letters, interview prep, ATS optimization) with **structured, savable, reusable** outputs.
- **G3.** Give the user a feedback loop: dashboard + real funnel analytics (interview rate, offer rate, ghosted rate, response time).
- **G4.** Look and feel like a premium SaaS (Linear/Vercel/Stripe tier) — good enough to show employers and to charge for.
- **G5.** Be a credible **Senior+ portfolio artifact**: clean architecture, background jobs, billing, audit trail, observability.

### 3.2 Non-goals (deliberately not building)

- **N1.** Team / multi-tenant workspaces (this is single-user-per-account).
- **N2.** A job board / scraping aggregator. We help track jobs the user finds, not source them.
- **N3.** Native mobile apps (web is responsive + mobile-first; no iOS/Android).
- **N4.** Automated application submission to employer ATSes.
- **N5.** Anything that requires scraping LinkedIn in violation of their ToS (see §10 for the compliant URL-import alternative, which is Post-MVP).

---

## 4. Success metrics

**North Star Metric — Activated Users:**

> A user who, within their first 7 days, has logged **≥5 applications** AND run **≥1 AI action**.

This captures both halves of the value prop (organizing + AI). Optimizing it forces good onboarding and a fast first AI win.

| Tier         | Metric                                                     | MVP target signal              |
| ------------ | ---------------------------------------------------------- | ------------------------------ |
| Acquisition  | Sign-up → activated rate                                   | ≥ 35%                          |
| Engagement   | AI actions per active user / week                          | ≥ 3                            |
| Retention    | D7 / D30 retention                                         | D7 ≥ 30%                       |
| Quality      | AI action success rate (valid structured output, no error) | ≥ 98%                          |
| Monetization | Free → Pro conversion (test-mode proxy)                    | track only (no target for MVP) |
| Reliability  | p95 page TTI (broadband)                                   | < 2.5s                         |

Metrics are _instrumented_ via the `ActivityEvent` table (see Database Design) — we are not adding a third-party product-analytics SDK for MVP.

---

## 5. Personas

### Persona A — "Maya", the Active Applicant (primary)

- Applying to 30–60 roles over 2–3 months; mid-level engineer.
- **Pain:** loses track of statuses and follow-ups; misses recruiter replies.
- **Needs most:** pipeline, Kanban, calendar/reminders, fast capture.
- **Success looks like:** opens the app daily, moves cards, never misses a follow-up.

### Persona B — "Dan", the Career Switcher (primary for AI)

- Moving from QA → backend; unsure how his resume maps to target roles.
- **Pain:** doesn't know what skills/keywords he's missing; cover letters are agony.
- **Needs most:** Resume Gap analysis, Match Score, Cover Letter generator, Interview Prep.
- **Success looks like:** runs gap analysis on every serious role, applies more confidently.

### Persona C — "Priya", the Passive Watcher (secondary)

- Employed, casually exploring; collects interesting roles.
- **Pain:** roles pile up in browser tabs and get forgotten.
- **Needs most:** Wishlist column, JD Analyzer to quickly judge "is this worth it?".
- **Success looks like:** a curated Wishlist she revisits; converts a few to Applied.

---

## 6. Jobs-to-be-done (representative user stories)

- As a job seeker, **when** I find a role, **I want to** save it in one place with its JD and link, **so that** I don't lose it.
- As a job seeker, **when** I'm deciding whether to apply, **I want** AI to extract the real requirements from a long JD, **so that** I can judge fit fast.
- As a career switcher, **when** I have a target JD and my resume, **I want** a gap analysis and a match score, **so that** I know what to fix before applying.
- As an applicant, **when** I'm applying, **I want** a tailored cover letter draft, **so that** I don't start from a blank page.
- As an applicant, **when** I have an interview scheduled, **I want** likely questions for this role, **so that** I can prepare.
- As an applicant, **when** I log in, **I want** to see my funnel and what changed recently, **so that** I feel in control and can improve.
- As an applicant, **when** an interview or follow-up is due, **I want** a reminder, **so that** I don't drop the ball.

---

## 7. Feature requirements

Priority uses **MoSCoW**: **M**ust (MVP), **S**hould (MVP if time), **C**ould (Post-MVP), **W**on't (out of scope now). Every Must has acceptance criteria (AC).

### Epic E1 — Authentication & Account `[Must]`

Register, login, logout, password reset; protected routes; account/profile settings.

**AC**

- Registration: email + password; password ≥ 8 chars with at least one letter and one number; duplicate email rejected with a clear error.
- Login/logout via Auth.js session (secure, httpOnly cookie).
- Password reset: request → emailed single-use token, expires ≤ 60 min → set new password → tokens invalidated after use.
- Any unauthenticated request to an in-app route (`/app/**`) redirects to `/login`; after login the user returns to the originally requested URL.
- Settings page: edit name/avatar, change password, see current plan.

### Epic E2 — Application Management `[Must]`

Full CRUD for applications with all spec fields, plus list with search / filter / sort.

**Fields:** company, title, location, salaryMin/Max + currency, jobUrl, jobDescription, status (9 values), priority, appliedAt, source, linked resume version, linked cover letter, recruiter/contact, notes (via E5).

**Statuses:** `WISHLIST · APPLIED · SCREENING · INTERVIEW · TECHNICAL_INTERVIEW · FINAL_INTERVIEW · OFFER · ACCEPTED · REJECTED`.

**AC**

- Create / edit via validated form (React Hook Form + Zod); server re-validates.
- Delete with confirmation; cascade-removes the application's notes/interviews/links.
- List: server-side pagination; debounced text search over company/title/notes; filter by status, priority, source, date range; sort by appliedAt / company / status / updatedAt.
- All list state (search, filters, sort, page) is encoded in the URL (shareable, back-button safe).
- Detail view with tabs: Overview · Notes · Interviews · AI Insights.

### Epic E3 — Kanban Pipeline `[Must]`

Drag-and-drop board with 5 columns: **Wishlist · Applied · Interview · Offer · Rejected**.

**AC**

- The 9 detailed statuses map onto 5 columns (Screening/Technical/Final → "Interview"); moving a card sets a sensible status for that column.
- Drag a card between columns → status + order persist; optimistic update with rollback on server error.
- Reordering within a column persists (`boardOrder`).
- Keyboard-accessible drag (move via keyboard) and screen-reader announcements of moves.

### Epic E4 — Calendar & Reminders `[Must]`

Manage interviews, follow-ups, deadlines, reminders on a calendar.

**AC**

- Month and agenda/week views; events sourced from interviews + follow-ups + deadlines.
- Create an interview/event from a day cell or from an application's Interviews tab.
- Each event links back to its application.
- A reminder (`reminderAt`) generates a Notification (E9); the dispatch is handled by a background job (see System Design), not a blocking request.

### Epic E5 — Notes `[Must]`

Typed notes per application: General · Interview · Follow-up.

**AC**

- Add/edit/delete notes on an application; notes render markdown (sanitized).
- Notes are pinnable; pinned notes sort first.
- Notes are searchable from the application list (E2 search includes note bodies).

### Epic E6 — AI Workspace `[Must]`

AI artifacts are **first-class, user-owned** entities that can be created standalone in the Workspace and then **attached** to an application. Reusable saved inputs: **Job Descriptions** and **Resumes**.

**Tools (each persists an `AiArtifact` with structured, schema-validated output):**

| Tool                                            | Input                  | Structured output                                                                |
| ----------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------- |
| **JD Analyzer** `[Must]`                        | job description text   | skills[], technologies[], requirements[], responsibilities[], seniority, summary |
| **Resume Gap Analysis** `[Must]`                | resume + JD            | matchingSkills[], missingSkills[], suggestions[], matchScore                     |
| **Match Score** `[Must]`                        | resume + JD            | 0–100 score + rationale (surfaced as a badge on the application card)            |
| **Cover Letter Generator** `[Must]`             | resume + JD + tone     | letter content (streamed), wordCount                                             |
| **Interview Prep** `[Must]`                     | JD                     | technical[], behavioral[], roleSpecific[] — each `{question, hint}`              |
| **Resume Optimization** `[Should]`              | resume (+ optional JD) | weakAreas[], missingKeywords[], atsImprovements[]                                |
| **AI Chat in application** `[Could / Post-MVP]` | JD + resume + question | conversational answers (kind=CHAT)                                               |

**AC (MVP tools)**

- AI runs are processed as **background jobs** (BullMQ): the UI shows pending → running → ready, the user is not blocked on a 10–30s OpenAI call. Cover Letter additionally supports streaming for perceived speed.
- Output is validated against a Zod schema per tool; on validation/model failure the job is marked FAILED with a user-friendly message and does **not** consume a credit.
- Every run is persisted as an `AiArtifact` (input, result, model, token counts, cost) and counts against the user's AI quota (E10).
- Identical inputs are de-duplicated via `inputHash` (cache hit returns instantly, no new charge).
- An artifact created in the Workspace can be attached to an application; attaching surfaces it in that application's AI Insights tab.

### Epic E7 — Dashboard & Analytics `[Must]`

A professional dashboard with stat cards, charts, and real funnel analytics.

**Stat cards (Must):** Total applications · This month · Interviews scheduled · Rejections · Offers · **Success rate** (offers ÷ non-wishlist applications).

**Charts (Must):** applications over time (area/line) · status distribution (donut) · funnel (Applied → Interview → Offer).

**Advanced analytics (Should — powered by `ActivityEvent` timing):**

- Average response time (appliedAt → first response).
- Interview rate, offer rate, **ghosted rate** (applied, no response within N days, no terminal status).
- Applications by weekday and by month.
- Top technologies / most-common required skills (aggregated from JD Analyzer outputs).

**AC**

- Stat-card numbers reconcile exactly with the filtered application list.
- Empty state (no applications) shows onboarding CTA instead of zeroed charts.
- Advanced analytics degrade gracefully when there isn't enough data yet ("Not enough data — log more applications").

### Epic E8 — Activity Feed & Audit Log `[Must]`

A single append-only `ActivityEvent` stream powers three things: a dashboard **Activity Feed**, an account **Audit Log**, and the **timing inputs** for analytics (E7).

**AC**

- Significant actions emit an event: application created/updated, status changed (with from→to), interview scheduled, AI artifact generated, cover letter saved, login.
- Dashboard shows a human-readable recent feed ("5 min ago · Added Microsoft", "2h ago · Moved Google → Interview").
- Settings → Audit Log shows the full chronological history for the account.
- Events are immutable (no edit/delete by the user).

### Epic E9 — Notifications `[Must]`

In-app notification bell with unread count; reminders for interviews/deadlines/follow-ups.

**AC**

- Bell shows unread count; opening marks as read; list of recent notifications.
- Reminder notifications are generated by a scheduled background job from `reminderAt`/`scheduledFor`.
- Notification links to the relevant application/interview.
- (Email notifications via Resend are `[Could]` — in-app is `[Must]`.)

### Epic E10 — Resume Management `[Must]`

Multiple resume versions per user; upload, parse, set default.

**AC**

- Upload PDF/DOCX up to 5 MB; stored in object storage (Cloudflare R2; local volume in dev).
- Server-side text extraction → `parsedText` used as AI input (parsing runs as a background job).
- Label each resume (e.g. "Backend v3"), mark one default, see "used in N applications".
- Delete removes both the file and the record.

### Epic E11 — Billing (Stripe, test-mode) `[Must]`

Plans **FREE · PRO · ENTERPRISE**; working checkout + webhook + plan changes in Stripe **test-mode**.

**AC**

- Pricing page lists plans and AI quotas.
- FREE users have a monthly AI-action quota (e.g. 10); PRO/ENTERPRISE raise/remove it.
- Stripe Checkout (test-mode) upgrades a user; webhook updates the `Subscription` + `User.plan`; downgrade/cancel handled.
- Quota enforcement blocks AI actions over the limit with an upgrade prompt (never a hard crash).

### Epic E12 — Background Jobs Infrastructure `[Must, cross-cutting]`

BullMQ + Redis + a dedicated `worker` service. Not a user-facing feature, but a hard requirement that shapes E6, E4, E9, E10.

**AC**

- A `worker` process consumes queues for: AI runs, resume parsing, reminder dispatch, email sending.
- Jobs are retryable with backoff; failures are recorded and surfaced (job status visible to the user for AI runs).
- Queue health is observable (logs + Sentry on failures).

---

## 8. AI behavior & guardrails

- **Structured outputs only.** Every tool uses OpenAI structured outputs with a JSON schema derived from the same Zod schema we validate against — no fragile JSON-from-prose parsing.
- **Model tiering.** Cheaper model for extraction (JD Analyzer, Interview Prep); higher-quality model for generation (Cover Letter, Optimization). Configurable per tool.
- **Cost & quota.** Every run records tokens + cost; quota checked _before_ dispatch; cache (`inputHash`) prevents paying twice for identical inputs.
- **Honesty.** Generated cover letters and analyses are clearly labeled AI-generated drafts for the user to edit, not final truth.
- **Failure handling.** A failed/invalid run does not consume quota and shows a retry option.

---

## 9. Non-functional requirements

| Area              | Requirement                                                                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Responsive**    | Mobile-first; usable from 360px to wide desktop.                                                                                                                                                       |
| **Accessibility** | WCAG 2.1 AA: keyboard nav, focus-visible, ARIA on Kanban, ≥4.5:1 contrast in both themes.                                                                                                              |
| **Theming**       | First-class dark mode via design tokens (not a bolt-on).                                                                                                                                               |
| **Performance**   | p95 page TTI < 2.5s on broadband; AI never blocks page interactivity (jobs are async).                                                                                                                 |
| **Security**      | Zod validation at every trust boundary; hashed passwords; per-user data isolation (cross-tenant → 404); rate limiting on mutations + AI; strict CSP; secrets server-only. (Detailed in System Design.) |
| **Observability** | Sentry for errors; structured logs; job status visible.                                                                                                                                                |
| **i18n-ready**    | Copy centralized; English-only for MVP but no hard-coded strings scattered in logic.                                                                                                                   |

---

## 10. Scope: MVP vs Post-MVP

### In MVP (build now)

E1 Auth · E2 Applications · E3 Kanban · E4 Calendar/Reminders · E5 Notes · E6 AI Workspace (JD Analyzer, Resume Gap, Match Score, Cover Letter, Interview Prep; Resume Optimization if time) · E7 Dashboard + core charts (advanced analytics if time) · E8 Activity/Audit · E9 In-app Notifications · E10 Resume management · **E11 Stripe billing (test-mode)** · E12 Background jobs infra.

### Post-MVP (schema-ready, not built)

- **Import a job by URL** — server fetches the job page HTML and AI structures it into a JD; LinkedIn falls back to manual paste (LinkedIn scraping is against their ToS, so we never scrape it).
- **AI Chat inside an application** (`AiArtifact` kind=CHAT).
- **Chrome Extension** — one-click "save this job" (separate build target).
- **Email notifications** (Resend) beyond in-app.
- **Team workspaces**, real (live-mode) billing.

> Rationale for these cuts: each adds a meaningfully separate surface (a browser extension build, a conversational UI, fragile third-party fetching) that doesn't change the core demo. We design the data model so adding them later is additive, not a rewrite.

---

## 11. Monetization

| Plan           | Price (indicative) | AI quota             | Resumes   | Notes                                                      |
| -------------- | ------------------ | -------------------- | --------- | ---------------------------------------------------------- |
| **Free**       | $0                 | ~10 AI actions/mo    | 1         | Unlimited applications, Kanban, calendar, notes, analytics |
| **Pro**        | ~$12/mo            | Unlimited (fair-use) | Unlimited | Advanced analytics, priority AI                            |
| **Enterprise** | Custom             | Unlimited            | Unlimited | Reserved for future team features                          |

Billing ships in **test-mode** for MVP: real Stripe Checkout/webhook flow, test cards, no live charges. This proves the integration for portfolio purposes without taking real money.

---

## 12. Assumptions, risks, open questions

**Assumptions**

- Single developer; ~3.5 focused weeks for MVP (see Implementation Plan).
- OpenAI API key available; cost controlled via model tiering + caching + quotas.
- Self-hosted deploy target (Docker on a VPS) — chosen because BullMQ needs an always-on worker.

**Risks & mitigations**

- _AI cost runaway_ → quotas + `inputHash` caching + cheaper models for extraction.
- _OpenAI latency/instability_ → async jobs + retries + clear failed-state UX.
- _Resume parsing quality (PDF/DOCX variance)_ → robust extractor, fallback to manual paste of resume text.
- _Scope creep from "premium" extras_ → explicitly deferred in §10.

**Open questions (to revisit, non-blocking)**

- Exact monthly Free AI quota number (placeholder: 10).
- Ghosted-rate threshold N days (placeholder: 21).
- Whether to add Google OAuth login in MVP (schema supports it; currently credentials-only).

---

## 13. Milestones (summary — detail in `05-implementation-plan.md`)

M0 Foundation → M1 Auth → M2 Applications+Notes → M3 Kanban+Calendar+Dashboard → M4 AI Workspace + Background jobs → M5 Billing + Hardening → M6 Ship. Estimated **~3.5 focused weeks** for MVP.

---

_Approve this PRD to proceed to Document 02 — System Design._
