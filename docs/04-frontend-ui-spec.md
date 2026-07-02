# AI Job Tracker — Frontend / UI Specification

|                  |                                                             |
| ---------------- | ----------------------------------------------------------- |
| **Document**     | 04 — Frontend / UI Spec                                     |
| **Status**       | Draft for approval                                          |
| **Version**      | 1.0                                                         |
| **Owner**        | Illia                                                       |
| **Last updated** | 2026-06-30                                                  |
| **Depends on**   | `01-PRD.md`, `02-system-design.md`, `03-database-design.md` |

> Defines the visual system, component inventory, screen-by-screen layouts, universal states, responsive rules, accessibility, and core flows. Implementation in Phase 6 builds against this.

---

## 1. Design language

Inspiration: **Linear · Vercel · Stripe · Notion.** Translated into concrete principles:

- **Calm & dense, not flashy.** Information-rich dashboards with generous whitespace; one accent color, restrained.
- **Borders over shadows.** Subtle 1px borders and soft elevation; avoid heavy drop shadows.
- **Content-first.** Chrome (nav, headers) is quiet; data and actions are the focus.
- **Motion with meaning.** Micro-interactions on hover, drag, and state transitions (150–200ms ease); never decorative animation that delays interaction.
- **Dark mode is first-class**, designed in parallel with light — not an afterthought.

---

## 2. Design tokens

Implemented as CSS variables in the shadcn/ui token system (HSL), consumed by Tailwind. `next-themes` toggles `.dark` on `<html>`.

**Color (semantic, both themes)**

```
--background / --foreground          page surface & text
--card / --card-foreground           panels, cards
--muted / --muted-foreground         secondary surfaces & text
--border / --input / --ring          lines, inputs, focus ring
--primary (accent: indigo/violet)    primary actions, active nav
--secondary / --accent               subtle fills
--destructive                        delete, errors
Status palette (custom): wishlist=slate, applied=blue, interview=amber,
                         offer=green, rejected=rose   (used for pills & charts)
```

**Typography** — `Inter` (or `Geist`). Scale: `xs 12 / sm 14 / base 15 / lg 18 / xl 20 / 2xl 24 / 3xl 30`. Body 15px, tight line-height on headings, `tabular-nums` for stats/numbers.

**Spacing & shape** — 4px base grid; radius `md=8px` default, `lg=12px` cards, `full` for pills/avatars. Shadows: `sm` for cards, `md` for popovers/menus only.

**Motion** — `duration-150/200`, `ease-out`; drag uses spring-ish transform; respect `prefers-reduced-motion`.

---

## 3. Component inventory

**shadcn/ui primitives used:** Button, Input, Textarea, Select, Checkbox, Switch, Label, Form (RHF), Dialog, Sheet, Drawer, DropdownMenu, Popover, Tooltip, Tabs, Card, Badge, Avatar, Table, Skeleton, Toast (Sonner), Command (⌘K), Calendar, Separator, ScrollArea, Progress, Alert.

**Custom composites**

| Component                                                                          | Used in                   |
| ---------------------------------------------------------------------------------- | ------------------------- |
| `StatCard` (label, value, delta, icon, count-up)                                   | Dashboard                 |
| `StatusPill` / `PriorityBadge`                                                     | lists, board, detail      |
| `ApplicationCard` (company, title, status, next-interview chip, match-score badge) | Kanban                    |
| `KanbanColumn` / `KanbanBoard` (dnd-kit)                                           | Board                     |
| `ApplicationsTable` (TanStack Table: sortable, selectable)                         | Applications              |
| `FilterBar` (search + status/priority/source/date, URL-synced)                     | Applications              |
| `AiToolCard` / `AiResultPanel` (per-tool result renderer)                          | AI Workspace              |
| `JobStatusIndicator` (pending→running→ready/failed)                                | AI runs                   |
| `MatchScoreRing` (0–100 radial)                                                    | detail, board, gap result |
| `ActivityFeed` / `AuditTable`                                                      | Dashboard, Settings       |
| `NotificationBell` (unread badge, popover list)                                    | Topbar                    |
| `EmptyState` (icon, title, copy, CTA)                                              | everywhere                |
| `ChartCard` wrappers (Recharts)                                                    | Dashboard                 |

**Charts:** Recharts — area (applications over time), donut (status distribution), funnel/bar (Applied→Interview→Offer), bar (by weekday/month, top technologies).

---

## 4. Layout & information architecture

```
┌──────────────────────────────────────────────────────────────┐
│ Topbar:  ⌘K search · page title · NotificationBell · Theme · Avatar │
├───────────┬──────────────────────────────────────────────────┤
│ Sidebar   │                                                    │
│ (collapse)│              Content area (max-w, padded)          │
│  Dashboard│                                                    │
│  Applications                                                  │
│  Board    │                                                    │
│  Calendar │                                                    │
│  AI Tools │                                                    │
│  Resumes  │                                                    │
│ ───────── │                                                    │
│  Settings │                                                    │
└───────────┴──────────────────────────────────────────────────┘
```

- **Route groups:** `(marketing)` public landing + pricing; `(auth)` login/register/reset (centered card, no shell); `(app)` everything behind the shell (layout enforces session).
- Sidebar collapses to icons on `md`, becomes a Sheet drawer on mobile. Active item uses `--primary`.

---

## 5. Screen-by-screen

### 5.1 Auth (`/login`, `/register`, `/reset-password`)

Centered card on a subtle gradient/grid background. RHF + Zod inline validation, show/hide password, loading button state, error alert. Register has password-strength hint. Reset is a two-step flow (request email → set new password from tokened link). Links between login/register/forgot.

### 5.2 Dashboard (`/dashboard`)

- **Row 1 — 6 StatCards:** Total · This month · Interviews scheduled · Rejections · Offers · Success rate (count-up, subtle delta vs last month).
- **Row 2 — charts:** applications-over-time (area, span 2) + status distribution (donut).
- **Row 3:** funnel (Applied→Interview→Offer) + **Upcoming** (next interviews/deadlines).
- **Row 4:** **Activity Feed** ("5 min ago · Added Microsoft", "2h ago · Moved Google → Interview").
- Empty state (0 applications): friendly hero + "Add your first application" + "Paste a job description to analyze" CTAs.

### 5.3 Applications (`/applications`)

- Sticky **FilterBar** (debounced search, status, priority, source, date range, sort) — all URL-synced.
- **ApplicationsTable**: company+title, status pill, priority, salary, source, applied date, next interview; row → detail. Bulk select (delete). Server pagination. "New Application" opens a Dialog/Sheet form.
- Mobile: table collapses to stacked cards.

### 5.4 Application detail (`/applications/[id]`)

- Header: company · title · status pill · priority · match-score ring · quick actions (edit, move status, delete).
- **Tabs:** Overview (all fields, links, contacts) · Notes (typed, pinnable, markdown) · Interviews (list + schedule) · **AI Insights** (attached artifacts + "Run a tool" launcher).

### 5.5 Kanban Board (`/board`)

- 5 columns: Wishlist · Applied · Interview · Offer · Rejected; column header shows count.
- `ApplicationCard`: company, title, status sub-label, next-interview chip, match badge.
- dnd-kit drag between/within columns → optimistic move (rollback on error); keyboard-draggable; live-region announces moves. Empty column shows dashed placeholder.

### 5.6 Calendar (`/calendar`)

- Month grid + right-side agenda of upcoming. Events = interviews + follow-ups + deadlines, color-coded by type; click day → quick-add; click event → linked application. Reminders show a bell marker.

### 5.7 AI Workspace (`/ai`)

- **Hub:** grid of `AiToolCard`s (JD Analyzer, Resume Gap, Match Score, Cover Letter, Interview Prep, Resume Optimization) + recent artifacts.
- **Tool workspace** (split): left = inputs (paste JD or pick saved JD; pick resume where relevant; tone for cover letter), right = `AiResultPanel`. On submit: `JobStatusIndicator` shows pending→running→ready (polling); Cover Letter streams. Result actions: **Save**, **Attach to application**, **Copy**, **Re-run**. Over-quota → upgrade prompt instead of error.

### 5.8 Resumes (`/resumes`)

- List of versions: label, default badge, "used in N applications", uploaded date, parse status. Upload (drag-drop, ≤5 MB PDF/DOCX) → parsing indicator. Set default, rename, delete.

### 5.9 Settings (`/settings`)

- **Profile** (name, avatar), **Security** (change password), **Billing** (current plan, usage vs AI quota with Progress bar, "Upgrade" → Stripe Checkout test-mode, manage/cancel), **Audit Log** (full `AuditTable`), **Appearance** (theme).

---

## 6. Universal states

Every async surface ships all four:

- **Loading:** Skeletons matching final layout (cards, table rows, chart blocks) — no spinners-on-blank.
- **Empty:** `EmptyState` with icon + one-line value + primary CTA.
- **Error:** inline alert with retry; never a white screen.
- **Insufficient data** (analytics): "Not enough data yet — log more applications" instead of misleading empty charts.

---

## 7. Responsive & breakpoints

Mobile-first. `sm 640 · md 768 · lg 1024 · xl 1280`.

- `< md`: sidebar → drawer; tables → stacked cards; board → horizontal scroll-snap columns; dashboard → single column.
- Touch targets ≥ 44px; drag works with touch.

## 8. Accessibility checklist (WCAG 2.1 AA)

- Full keyboard nav; visible `:focus-visible` ring (`--ring`).
- Kanban: keyboard drag + `aria-live` move announcements.
- All form fields labeled; errors linked via `aria-describedby`.
- Contrast ≥ 4.5:1 (text) / 3:1 (UI) in both themes — status colors tuned for dark mode.
- Dialogs/sheets trap focus and restore on close; ESC closes.
- `prefers-reduced-motion` disables non-essential animation.
- Semantic landmarks (`nav`, `main`, `header`); charts have text/table fallbacks for key numbers.

## 9. Microcopy & feedback

- Toasts (Sonner) for mutation success/failure; optimistic UI for board moves.
- Destructive actions confirm in a Dialog.
- AI: clearly label outputs as "AI-generated draft"; show token/credit usage subtly.
- Errors are human ("Couldn't reach the AI service — retry?"), never raw stack traces.

---

## 10. Core user flows

```
Onboarding:  register → empty dashboard → "Add first application" (Dialog)
             → optionally "Paste JD → Analyze" → first AI result → activated.

Track:       New Application → Wishlist → drag to Applied on Board
             → schedule Interview (Calendar/detail) → reminder Notification
             → log outcome → status → Offer/Rejected.

AI loop:     Application → AI Insights → "Resume Gap" (pick resume)
             → pending→ready → review missingSkills + matchScore
             → "Generate Cover Letter" (streams) → Save → Attach.

Billing:     Settings → Billing → hit quota → Upgrade → Stripe Checkout (test)
             → webhook → plan=PRO → quota lifts.

Reset pw:    /reset-password → email (Mailpit/Resend) → tokened link
             → set new → sessions invalidated → login.
```

---

_Approve to proceed — next is `05-implementation-plan.md` (epics → tasks, milestones, DoD), the last doc before code._
