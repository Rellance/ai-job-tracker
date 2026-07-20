# AI Job Tracker — Deployment Guide

|                |                       |
| -------------- | --------------------- |
| **Document**   | 06 — Deployment       |
| **Status**     | Final                 |
| **Depends on** | `02-system-design.md` |

The app is two processes from one codebase: **`web`** (Next.js standalone) and **`worker`** (BullMQ consumers). Because the worker must be always-on, the target is a container host (VPS with Docker, Railway, Render, Fly.io) — plain serverless is not enough (System Design §2).

---

## 1. What you need

| Dependency                        | Purpose                     | Free-tier option  |
| --------------------------------- | --------------------------- | ----------------- |
| PostgreSQL                        | primary DB                  | Supabase          |
| Redis                             | BullMQ broker + rate limits | Upstash           |
| OpenAI API key                    | AI tools                    | — (pay-as-you-go) |
| Stripe keys (test-mode)           | billing                     | Stripe sandbox    |
| S3-compatible bucket _(optional)_ | resume files in prod        | Cloudflare R2     |
| Resend key _(optional)_           | password-reset email        | Resend            |
| Sentry DSN _(optional)_           | error tracking              | Sentry            |

**Supabase note:** use the _transaction pooler_ URL (port 6543, `?pgbouncer=true`) as `DATABASE_URL` and the _session pooler_ URL (port 5432) as `DIRECT_URL`. The direct `db.<ref>.supabase.co` host is IPv6-only, and the free tier pauses inactive projects — restore from the dashboard if `/api/health` reports `db: fail`.

## 2. Environment variables

Copy [`.env.example`](../.env.example) and fill in. Required at boot (validated by `src/lib/env.ts`, the app refuses to start otherwise): `DATABASE_URL`, `NEXTAUTH_SECRET`/`AUTH_SECRET`, `APP_URL`. Feature-gated: `REDIS_URL` (jobs + rate limits), `OPENAI_API_KEY` (AI), `STRIPE_SECRET_KEY` + `STRIPE_PRICE_PRO` + `STRIPE_PRICE_ENTERPRISE` (billing), `STRIPE_WEBHOOK_SECRET` (prod billing sync), `RESEND_API_KEY` (email; dev logs to console).

Generate secrets: `openssl rand -base64 32`.

## 3. Docker Compose (single VPS)

```bash
cp .env.example .env   # fill in real values
docker compose up --build -d
```

Compose brings up `postgres`, `redis`, `mailpit`, runs **`migrate`** (one-shot `prisma migrate deploy`), then starts **`web`** (standalone, port 3000) and **`worker`**. For managed Postgres/Redis, override `DATABASE_URL`/`REDIS_URL` in `.env` and drop the local `postgres`/`redis` services.

Seed demo data (optional): `docker compose run --rm migrate npx prisma db seed`.

> Compose has been reviewed against the standalone build output but not CI-built in this repo (the dev machine has no Docker). If a stage fails for you, check that `.next/standalone` exists in the builder stage first.

## 4. Managed container hosts (Railway / Render / Fly)

Two services from the same repo:

|              | web                                  | worker                     |
| ------------ | ------------------------------------ | -------------------------- |
| Build        | Dockerfile target `runner` (default) | Dockerfile target `worker` |
| Start        | `node server.js`                     | `npx tsx src/worker.ts`    |
| Port         | 3000                                 | —                          |
| Release step | `npx prisma migrate deploy`          | —                          |

Point both at the same env vars. Health check: `GET /api/health` (200 = db+redis ok).

## 5. Stripe in production

1. Create products/prices in your Stripe account, put the ids in `STRIPE_PRICE_*`.
2. Add a webhook endpoint → `https://<domain>/api/stripe/webhook`, events: `checkout.session.completed`, `customer.subscription.created/updated/deleted`; put the signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Locally webhooks are optional — the app also syncs on checkout return (`/settings?session_id=…`).

## 6. Post-deploy checklist

- [ ] `GET /api/health` → `{"status":"ok","checks":{"db":"ok","redis":"ok"}}`
- [ ] Register → login → create an application
- [ ] Worker logs show `Worker up — consuming: ai-runs, resume-parse, reminders`
- [ ] AI tool run completes (needs OpenAI credits)
- [ ] Test-card upgrade flips the plan badge to PRO
- [ ] `APP_URL` matches the public domain (used in emails + Stripe return URLs)
