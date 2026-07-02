# AI Job Tracker

An AI-powered job application tracking platform: organize applications, run a Kanban pipeline, schedule interviews, and use AI to analyze job descriptions, find resume gaps, generate cover letters, and prep for interviews.

> Built as a production-quality SaaS portfolio project. Full design docs live in [`docs/`](./docs) (PRD → System Design → Database → UI → Implementation Plan).

## Tech stack

Next.js 15 (App Router) · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui · React Hook Form + Zod · TanStack Query · Prisma · PostgreSQL · Auth.js v5 · OpenAI · BullMQ + Redis · Stripe (test-mode) · Cloudflare R2 · Resend · Sentry · Docker.

## Architecture (short)

Two processes share one codebase: **`web`** (Next.js — UI, Route Handlers, Server Actions) and **`worker`** (BullMQ consumers for AI runs, resume parsing, reminders, email). Business logic lives in `src/lib/services`; AI artifacts are first-class and attach to applications; a single append-only `ActivityEvent` powers the audit log, activity feed, and analytics. See [`docs/02-system-design.md`](./docs/02-system-design.md).

## Local development

This project uses **managed services for local dev** (no Docker required): **Supabase** for Postgres and **Upstash** for Redis. A Docker Compose stack is also provided for full local parity.

### 1. Prerequisites

- Node.js 20+ (22 LTS recommended)
- A Supabase project (Postgres) and an Upstash Redis database
- API keys for OpenAI, Stripe (test-mode), Resend, Cloudflare R2 — added per milestone

### 2. Setup

```bash
npm install
cp .env.example .env     # then fill in values
npm run db:migrate       # create schema in your database
npm run db:seed          # load demo data
npm run dev              # http://localhost:3000
```

### 3. Background worker (from M4)

```bash
npm run worker           # consumes BullMQ queues
```

### Environment variables

See [`.env.example`](./.env.example). Core required: `DATABASE_URL`, `NEXTAUTH_SECRET`. Integration keys (`REDIS_URL`, `OPENAI_API_KEY`, `STRIPE_*`, `R2_*`, `RESEND_API_KEY`) are required at their respective milestones. Validated at boot by `src/lib/env.ts`.

## Useful scripts

| Script                                  | Purpose                       |
| --------------------------------------- | ----------------------------- |
| `npm run dev`                           | Start the dev server          |
| `npm run worker`                        | Start the BullMQ worker (M4+) |
| `npm run db:migrate`                    | Apply Prisma migrations (dev) |
| `npm run db:seed`                       | Seed demo data                |
| `npm run db:studio`                     | Open Prisma Studio            |
| `npm run lint` / `typecheck` / `format` | Code quality                  |

## Docker (full local parity)

```bash
docker compose up --build
```

Brings up `web`, `worker`, `postgres`, `redis`, and `mailpit` (catch dev email at http://localhost:8025).

## Deployment

The app builds to a Next.js standalone output (`Dockerfile`). Run database migrations with `npm run db:deploy` before starting. Production deploy guide is finalized in M6.

## License

Portfolio project — all rights reserved.
