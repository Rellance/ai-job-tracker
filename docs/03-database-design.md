# AI Job Tracker — Database Design

|                  |                                    |
| ---------------- | ---------------------------------- |
| **Document**     | 03 — Database Design               |
| **Status**       | Draft for approval                 |
| **Version**      | 1.0                                |
| **Owner**        | Illia                              |
| **Last updated** | 2026-06-30                         |
| **Depends on**   | `01-PRD.md`, `02-system-design.md` |
| **Engine**       | PostgreSQL 16 · Prisma ORM         |

> This is the canonical data model. The Prisma schema below is intended to be near-final — code in Phase 6 starts from it.

---

## 1. Design principles

1. **Tenant isolation by `userId`.** Every app-owned row carries `userId`; all queries scope by it. Cross-tenant access returns 404 (System Design §8).
2. **`cuid()` primary keys.** Collision-resistant, non-enumerable (no IDOR by guessing sequential ids), URL-safe.
3. **Timestamps everywhere.** `createdAt @default(now())` + `updatedAt @updatedAt` on mutable entities.
4. **`jsonb` for AI payloads.** AI inputs/outputs are heterogeneous and evolving — stored as `Json`, validated by a Zod schema per `kind` in app code. Avoids a migration per prompt tweak.
5. **Append-only `ActivityEvent`.** One immutable stream powers Audit Log + Activity Feed + analytics timing (System Design, PRD E8).
6. **Hard deletes with cascades** for MVP simplicity (`onDelete: Cascade` from `User` and `Application`). Soft delete is a Post-MVP concern; the `ActivityEvent` log preserves history regardless.
7. **Indexes follow access paths**, not guesses (see §4).

---

## 2. Final Prisma schema

```prisma
// ──────────────────────────────────────────────────────────────
//  datasource & generator
// ──────────────────────────────────────────────────────────────
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ──────────────────────────────────────────────────────────────
//  ENUMS
// ──────────────────────────────────────────────────────────────
enum Plan {
  FREE
  PRO
  ENTERPRISE
}

enum ApplicationStatus {
  WISHLIST
  APPLIED
  SCREENING
  INTERVIEW
  TECHNICAL_INTERVIEW
  FINAL_INTERVIEW
  OFFER
  ACCEPTED
  REJECTED
}

enum ApplicationPriority {
  LOW
  MEDIUM
  HIGH
}

enum InterviewType {
  PHONE_SCREEN
  TECHNICAL
  BEHAVIORAL
  FINAL
  FOLLOW_UP
}

enum InterviewStatus {
  SCHEDULED
  COMPLETED
  CANCELLED
  NO_SHOW
}

enum NoteType {
  GENERAL
  INTERVIEW
  FOLLOW_UP
}

enum AiArtifactKind {
  JD_ANALYSIS
  RESUME_GAP
  MATCH_SCORE
  COVER_LETTER
  INTERVIEW_PREP
  RESUME_OPTIMIZE
  CHAT            // Post-MVP, schema-ready
}

enum AiArtifactStatus {
  PENDING
  RUNNING
  COMPLETE
  FAILED
}

enum CoverLetterTone {
  PROFESSIONAL
  ENTHUSIASTIC
  CONCISE
  FORMAL
}

enum ActivityType {
  APPLICATION_CREATED
  APPLICATION_UPDATED
  APPLICATION_DELETED
  STATUS_CHANGED
  INTERVIEW_SCHEDULED
  INTERVIEW_UPDATED
  NOTE_ADDED
  RESUME_UPLOADED
  AI_GENERATED
  COVER_LETTER_SAVED
  USER_LOGIN
  PLAN_CHANGED
}

enum NotificationType {
  REMINDER
  INTERVIEW
  DEADLINE
  AI_READY
  SYSTEM
}

enum SubscriptionStatus {
  ACTIVE
  TRIALING
  PAST_DUE
  CANCELED
  INCOMPLETE
}

// ──────────────────────────────────────────────────────────────
//  AUTH (Auth.js v5 Prisma adapter + custom fields)
// ──────────────────────────────────────────────────────────────
model User {
  id             String    @id @default(cuid())
  name           String?
  email          String    @unique
  emailVerified  DateTime?
  image          String?
  hashedPassword String?   // null when only OAuth is used (future)

  // plan & AI metering
  plan           Plan      @default(FREE)
  aiCreditsUsed  Int       @default(0)
  aiCreditsReset DateTime  @default(now())   // monthly reset anchor

  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  // relations
  accounts            Account[]
  sessions            Session[]
  passwordResetTokens PasswordResetToken[]
  applications        Application[]
  contacts            Contact[]
  interviews          Interview[]
  notes               Note[]
  resumes             Resume[]
  coverLetters        CoverLetter[]
  jobDescriptions     JobDescription[]
  aiArtifacts         AiArtifact[]
  activityEvents      ActivityEvent[]
  notifications       Notification[]
  subscription        Subscription?
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique           // store hash, never the raw token
  expires   DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

// ──────────────────────────────────────────────────────────────
//  CORE: Applications & related
// ──────────────────────────────────────────────────────────────
model Application {
  id             String              @id @default(cuid())
  userId         String

  company        String
  title          String
  location       String?
  salaryMin      Int?
  salaryMax      Int?
  currency       String              @default("USD")
  jobUrl         String?
  jobDescription String?             @db.Text   // raw pasted JD (quick path)
  status         ApplicationStatus   @default(WISHLIST)
  priority       ApplicationPriority @default(MEDIUM)
  source         String?                          // LinkedIn, referral, …
  appliedAt      DateTime?
  boardOrder     Int                 @default(0)   // Kanban position within column

  // optional links to chosen artifacts
  resumeId       String?
  coverLetterId  String?

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  resume      Resume?      @relation(fields: [resumeId], references: [id], onDelete: SetNull)
  coverLetter CoverLetter? @relation("AppCoverLetter", fields: [coverLetterId], references: [id], onDelete: SetNull)

  interviews  Interview[]
  notes       Note[]
  contacts    Contact[]
  aiArtifacts AiArtifact[]

  @@index([userId, status])
  @@index([userId, createdAt])
  @@index([userId, status, boardOrder])
}

model Contact {
  id            String   @id @default(cuid())
  userId        String
  applicationId String?

  name          String
  role          String?            // "Recruiter", "Hiring Manager"
  email         String?
  phone         String?
  linkedinUrl   String?
  notes         String?  @db.Text

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  application Application? @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([applicationId])
}

model Interview {
  id            String          @id @default(cuid())
  userId        String
  applicationId String

  type          InterviewType
  status        InterviewStatus @default(SCHEDULED)
  scheduledAt   DateTime
  durationMin   Int?
  location      String?         // physical or "Remote"
  meetingUrl    String?
  reminderAt    DateTime?       // drives a reminder Notification job
  outcome       String?         @db.Text

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@index([userId, scheduledAt])
  @@index([applicationId])
  @@index([reminderAt])
}

model Note {
  id            String   @id @default(cuid())
  userId        String
  applicationId String

  type          NoteType @default(GENERAL)
  body          String   @db.Text
  pinned        Boolean  @default(false)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@index([applicationId, pinned])
  @@index([userId])
}

// ──────────────────────────────────────────────────────────────
//  AI Workspace: reusable inputs + artifacts
// ──────────────────────────────────────────────────────────────
model Resume {
  id         String   @id @default(cuid())
  userId     String

  label      String                 // "Backend v3"
  fileKey    String                 // storage key (R2 / local)
  mimeType   String
  sizeBytes  Int
  parsedText String?  @db.Text      // filled by resume-parse job
  isDefault  Boolean  @default(false)

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  applications Application[]                 // "used in N applications"
  aiArtifacts  AiArtifact[]

  @@index([userId])
}

model JobDescription {
  id        String   @id @default(cuid())
  userId    String

  title     String?
  company   String?
  rawText   String   @db.Text
  parsed    Json?                    // structured JD_ANALYSIS result, if run

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  aiArtifacts AiArtifact[]

  @@index([userId])
}

model CoverLetter {
  id            String          @id @default(cuid())
  userId        String

  title         String
  content       String          @db.Text
  tone          CoverLetterTone @default(PROFESSIONAL)
  aiGenerated   Boolean         @default(true)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user             User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  linkedToApps     Application[] @relation("AppCoverLetter")

  @@index([userId])
}

model AiArtifact {
  id             String           @id @default(cuid())
  userId         String

  kind           AiArtifactKind
  status         AiArtifactStatus @default(PENDING)

  // optional attachment to an application (null = lives in Workspace)
  applicationId  String?
  // source inputs (denormalized refs; full inputs also in `input`)
  resumeId       String?
  jobDescriptionId String?

  input          Json                              // what we sent
  result         Json?                             // structured output (schema per kind)
  errorMessage   String?

  inputHash      String                            // sha256 for cache/dedupe
  model          String?
  tokensIn       Int?
  tokensOut      Int?
  costCents      Int?

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  application    Application?    @relation(fields: [applicationId], references: [id], onDelete: SetNull)
  resume         Resume?         @relation(fields: [resumeId], references: [id], onDelete: SetNull)
  jobDescription JobDescription? @relation(fields: [jobDescriptionId], references: [id], onDelete: SetNull)

  @@unique([userId, inputHash])     // cache hit: same user + same input
  @@index([userId, kind])
  @@index([applicationId])
  @@index([status])
}

// ──────────────────────────────────────────────────────────────
//  Activity (audit + feed + analytics timing)
// ──────────────────────────────────────────────────────────────
model ActivityEvent {
  id         String       @id @default(cuid())
  userId     String

  type       ActivityType
  entityType String?      // "Application" | "Interview" | "AiArtifact" | …
  entityId   String?
  metadata   Json?        // { from, to } status; model; artifactKind; …

  createdAt  DateTime     @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([userId, type])
}

// ──────────────────────────────────────────────────────────────
//  Notifications
// ──────────────────────────────────────────────────────────────
model Notification {
  id           String           @id @default(cuid())
  userId       String

  type         NotificationType
  title        String
  body         String?
  entityType   String?
  entityId     String?
  scheduledFor DateTime?        // for reminders generated ahead of time
  readAt       DateTime?

  createdAt    DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, readAt])
  @@index([userId, createdAt])
  @@index([scheduledFor])
}

// ──────────────────────────────────────────────────────────────
//  Billing (Stripe, test-mode)
// ──────────────────────────────────────────────────────────────
model Subscription {
  id                   String             @id @default(cuid())
  userId               String             @unique

  stripeCustomerId     String?            @unique
  stripeSubscriptionId String?            @unique
  stripePriceId        String?
  plan                 Plan               @default(FREE)
  status               SubscriptionStatus @default(ACTIVE)
  currentPeriodEnd     DateTime?
  cancelAtPeriodEnd    Boolean            @default(false)

  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([stripeCustomerId])
}
```

---

## 3. ER diagram (text)

```
User 1───* Account                 (auth)
User 1───* Session                 (auth)
User 1───* PasswordResetToken
User 1───1 Subscription
User 1───* Application
User 1───* Resume
User 1───* JobDescription
User 1───* CoverLetter
User 1───* AiArtifact
User 1───* ActivityEvent
User 1───* Notification
User 1───* Contact
User 1───* Interview
User 1───* Note

Application 1───* Interview
Application 1───* Note
Application 1───* Contact            (recruiter/referral; Contact also standalone)
Application *───1 Resume      (optional: chosen resume version)   [SetNull]
Application *───1 CoverLetter (optional: chosen cover letter)     [SetNull]
Application 1───* AiArtifact         (attached artifacts; nullable FK)

AiArtifact *───1 Application?        (attach; null = Workspace)
AiArtifact *───1 Resume?             (source input)
AiArtifact *───1 JobDescription?     (source input)

ActivityEvent ──► (Audit Log view) + (Activity Feed view) + (Analytics timing)
```

**Cardinality notes**

- `Application ↔ AiArtifact` is **1:N via nullable FK** (one artifact attaches to ≤1 application). True M:N reuse across applications is via _clone_. If real M:N becomes necessary, add a join table `ApplicationArtifact(applicationId, artifactId)` — additive, no rewrite. (Tradeoff accepted in PRD review.)
- `Contact` can be standalone or attached to an application (`applicationId?`).

---

## 4. Indexing & query-path rationale

| Index                                      | Serves                                          |
| ------------------------------------------ | ----------------------------------------------- |
| `Application(userId, status)`              | board columns, status filters, stat cards       |
| `Application(userId, createdAt)`           | list default sort, "this month", activity       |
| `Application(userId, status, boardOrder)`  | Kanban column render in order                   |
| `Interview(userId, scheduledAt)`           | calendar/agenda queries                         |
| `Interview(reminderAt)`                    | reminder scan job (worker)                      |
| `Note(applicationId, pinned)`              | application detail (pinned first)               |
| `AiArtifact(userId, inputHash)` **unique** | cache/dedupe lookups                            |
| `AiArtifact(userId, kind)`                 | Workspace filtered by tool                      |
| `ActivityEvent(userId, createdAt)`         | feed + audit pagination; analytics window scans |
| `Notification(userId, readAt)`             | unread count + bell list                        |
| `Subscription(stripeCustomerId)`           | webhook → user resolution                       |

Analytics (response time, ghosted rate, time-in-stage) are computed from `ActivityEvent` (`STATUS_CHANGED` with `{from,to}` + timestamps) — which is why those events are first-class data, not logging.

---

## 5. Migrations strategy

- **`prisma migrate dev`** locally to author migrations; committed to `prisma/migrations`.
- **`prisma migrate deploy`** in prod (runs as a one-shot step before `web`/`worker` start; e.g. an init container or a release command).
- Never edit applied migrations; always add new ones. Schema and migrations are the single source of truth.

## 6. Seed strategy (`prisma/seed.ts`)

- One demo user (`demo@aijobtracker.dev`) with a hashed password.
- ~12 applications spread across all statuses/columns with realistic companies, salaries, sources, and `appliedAt` spread over ~8 weeks (so analytics + charts look real).
- A few interviews (some past, some upcoming with `reminderAt`), pinned + typed notes, 2 resume rows (with `parsedText`), 1–2 saved JDs, and a couple of COMPLETE `AiArtifact`s.
- A backfill of `ActivityEvent`s matching the above so the feed/audit/analytics aren't empty on first load.
- A FREE `Subscription` row.

Seed makes the app demo-ready instantly — important for a portfolio.

## 7. Data lifecycle

- **Cascade deletes:** removing a `User` removes all owned data; removing an `Application` removes its interviews/notes and detaches (`SetNull`) chosen resume/cover-letter and any attached artifacts.
- **Retention:** `ActivityEvent` is append-only and kept indefinitely (it's the audit trail). No PII beyond what the user enters.
- **Quota reset:** `aiCreditsUsed` resets when `now() > aiCreditsReset`; the reset anchor advances one month (handled in `quotaService`, optionally nudged by a daily worker job).

---

_Approve to proceed — next is `04-frontend-ui-spec.md` (screens, components, states, design tokens, flows)._
