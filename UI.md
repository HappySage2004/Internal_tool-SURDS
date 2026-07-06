# UI.md — Internal Work & Communication Tool

> **For:** Claude Design. Build a clickable demo from this brief.
> **Companion:** `internal-tool-design.md` holds the full data model and v1 scope. This file is self-contained for building the UI — read the companion only if you need to settle a data question.
> **Mock everything.** No real auth, git, or persistence. Static demo data (provided in §9) is fine.

---

## 1. What you're building

One fast, minimal internal tool for a startup under 10 people. It unifies three things that are normally scattered across separate apps: task tracking, live documents, and lightweight asynchronous communication. Engineering teams run **projects** (git-linked); operations, sales, and finance run **workstreams**. Both are the same underlying object — a **Space** — in one of two modes, and both ladder up to shared company **Goals**. Each person works mostly from a personal **My work** screen that aggregates their tasks, docs, and notifications across everything.

**The feel to hit:** the speed and calm of Linear, not the sprawl of Notion. The interface should recede; the work is the content. If a choice makes the tool faster or quieter, it's right. If it adds an option or a click, justify it.

## 2. Who uses it

A founder, a few engineers, and a handful of ops/sales/finance people. Used many times a day, primarily on desktop (must hold up on tablet). These are power users — favor density and keyboard speed over hand-holding and big friendly empty canvases.

## 3. Design principles

- **Speed is the aesthetic.** Everything should feel instant: optimistic updates, no spinners for local actions, no full-page reloads. Build the demo to *feel* this way (instant state changes, snappy transitions).
- **Minimal options.** Exactly five task statuses, three priorities, two space modes. Don't invent more. Resist settings.
- **Everything optional except a title.** Creating a task is one input + Enter. Every other field is opt-in.
- **Calm density.** Information-dense but never noisy. Hairline borders and whitespace do the structuring, not boxes-in-boxes or heavy fills.
- **Communication lives on the work.** No chat app. Coordination happens as comments on tasks/docs, a conversation **thread** per space, one company-wide General thread, and a single personal inbox. Threads stay asynchronous — no presence or typing indicators.
- **Keyboard-first.** Command palette (⌘K), quick-create (C), arrow-key navigation, status changes without the mouse. Show shortcut hints subtly.
- **Privacy is legible.** Personal/private tasks are clearly marked and never bleed into shared views.
- **Honest empty and error states.** An empty screen is an invitation to act ("No tasks yet — press C to add one"), not decoration.

## 4. Visual language

This is the point of view to execute. Spend the personality budget in **one** place — the monospace signature below — and keep everything else quiet and precise. Minimal directions live or die on spacing, type, and alignment, so be exact.

### Signature
**Monospaced metadata.** Task keys (`AUTH-214`), goal key-result numbers, timestamps, and counts are set in a monospace face. This single move signals the tool's engineering DNA, makes scannable data line up, and gives the product a recognizable character without resorting to a decorative display font. Everything else is a clean UI sans. Don't add a second flourish.

### Color
Light mode is primary; ship dark mode too. One accent hue only — no rainbow. Status colors are semantic and appear *only* as small pills and dots, never as large fills.

| Token | Light | Dark | Use |
|---|---|---|---|
| `canvas` | `#F6F6F7` | `#0E0E11` | App background |
| `surface` | `#FFFFFF` | `#17171B` | Cards, panels, rows |
| `border` | `rgba(18,18,28,0.10)` | `rgba(255,255,255,0.12)` | Hairlines (1px) |
| `text` | `#18181B` | `#ECECEE` | Primary text |
| `text-muted` | `#71717A` | `#9A9AA2` | Secondary text |
| `text-faint` | `#A1A1AA` | `#6C6C74` | Metadata, hints |
| `accent` | `#5B57E0` | `#7C78F0` | Primary actions, links, active nav, focus ring |
| `accent-soft` | `#EEEDFC` | `#262338` | Accent fills (selected nav, badges) |

Status / health palette (used as pills and dots):

| Meaning | Color | Applies to |
|---|---|---|
| Neutral | gray (`text-muted` on `canvas`) | `backlog`, `todo` |
| In progress | blue `#2F6FED` | task `in_progress` |
| In review / at risk | amber `#C77700` | task `in_review`, health `at_risk` |
| Done / on track | green `#157F4B` | task `done`, health `on_track` |
| Over / off track | red `#C53434` | health `off_track`, a KR over budget |
| Canceled | `text-faint` + strikethrough | task `canceled` |

### Typography
- **UI / body:** Inter (fallback `system-ui`). Two weights only: 400 and 500. Never 600+.
- **Signature mono:** JetBrains Mono (fallback `ui-monospace, SFMono-Regular`). For task keys, KR numbers, timestamps, counts.
- **Scale:** page title 21px/500 · section header 15px/500 · body & rows 14px/400 · metadata 12–13px · mono 12–13px.
- **Sentence case everywhere.** Never Title Case, never ALL CAPS — including labels and buttons.

### Form & detail
- Flat. No gradients, no drop shadows. The only shadow allowed is a focus ring (`0 0 0 2px accent`).
- 1px hairline borders; corner radius 6–8px on controls and cards; pills fully rounded.
- Task rows ~38px tall. Internal gaps 8/12/16px; section rhythm 16–24px.
- Icons: outline line icons (Lucide/Tabler style), 16–18px, inheriting text color.
- Motion: 120–160ms ease on hovers and inserts; subtle. Respect `prefers-reduced-motion`.
- **Use the width.** Content is left-aligned against the sidebar, never floated in a narrow centered column with dead margins on both sides. The spaces hub and space detail use a **multi-column** layout — primary content on the left, then two right columns that are always visible: a **Docs column** (~280–300px) and a **Thread column** (~340px, resizable) — so the horizontal space is never wasted. Columns collapse progressively on narrower screens (Docs hides first, then the thread).

### Avoid (these read as AI-default — don't reach for them)
Warm cream background + high-contrast serif + terracotta accent. Near-black + acid-green/neon. Broadsheet hairline-newspaper columns. None fit a fast internal tool.

## 5. Navigation & information architecture

A **slim left sidebar** (scannable, always visible on desktop; collapsible on tablet):

- Workspace name + a prominent **New task** affordance (also ⌘K / C).
- **My work** — the default landing screen.
- **Goals**
- **Spaces** — opens the **org hub**, a single three-column screen (Spaces · Docs · General thread — see §6.B). Below this nav item, the individual spaces are listed, grouped into *Engineering* and *Workstreams* with a small health dot each, for direct navigation.
- **Meetings** — its own top-level area, a sibling of Spaces (see §6.I).
- Bottom: user avatar → settings.

There is no separate Docs nav item — documents live in the Docs column of the Spaces hub (and each Space), and ⌘K jumps to any doc instantly, so the consolidation costs power users nothing.

A **command palette (⌘K)** overlays everything: jump to a space/task/doc, create things, change a status — all keyboard-driven.

## 6. Screens to build

### A. My work (landing)
The daily driver. A lens over everything, in three stacked sections:

1. **Inbox** (top, collapsible, shows unread count). Rows: icon + plain-language line + source link + mono timestamp. Four types — mentioned, assigned, review requested, replied. Empty: "You're all caught up."
2. **My tasks** — a pinned inline "add task" input at the top (type + Enter → creates a *personal* task by default here). Below it, tasks grouped by **Today / This week / Later / No date**. Each row: status dot, title, then either a **space tag** (shared task) or a **private badge** (personal task) — a personal task may also show a muted optional tag like `· Payments`. Show a priority flag only if set. Shared and personal tasks live in the same list, visually distinguished only by the tag/badge.
3. **Recent docs** — compact list: title + edited timestamp.

### B. Spaces hub (three columns: Spaces · Docs · General thread)
The **Spaces** nav item opens an org-level hub. There are **no tabs** — the screen is three always-visible columns, mirroring the Space-detail layout so the hub reads as the "company space." (Meetings is **not** here — it's its own top-level area; see §6.I.)

- **Main column — Spaces:** every space under *Engineering* and *Workstreams* section headers (no filter tabs — the list is already grouped by mode). Rows are **info-rich cards**, not thin lines, so the short list (≤10 spaces) fills the height with signal: health dot + name + mode chip, a one-line **latest status-post excerpt** (or "No updates yet"), the Goal chips it ladders into, a mono **doc count**, owner avatar, and a mono "updated 2d". A **New space** action.
- **Docs column (~300px):** all documents the user can see, grouped by space with a **Personal** group (`space_id IS NULL` docs). Each row: type icon (note / spec / decision log) — or a **provider icon** for external links (see screen G) — title, and edited timestamp. A **New doc** action opens the New document modal — markdown or PDF/image upload, with a **Space** picker (Personal by default; see screen G). Selecting a markdown or file doc opens the document view; an external-link doc opens its URL in a new tab.
- **General thread column (~340px, resizable):** the one company-wide conversation (announcements, cross-team discussion, wins). Feed-plus-composer, async only, a single thread — deliberately not a channel system.

### C. Space detail
A **multi-column layout** that fills the width — no tabs, nothing hidden behind a click.
- **Header:** space name, mode chip, owner, Goal chips. Workstreams also show their cadence (e.g., "Weekly update"). *(The **Post update** action lives in the Thread column header, not here — see below.)*
- **Main column (left, aligned next to the sidebar):** the **task list**, grouped by the five statuses.
  - *Engineering variant:* rows show a mono **task key** (`AUTH-214`) and, where relevant, a **git badge** (branch / PR open / merged). Merged PRs render the task as done.
  - *Workstream variant:* same list, no task keys or git badges; recurring tasks carry a small repeat icon. Simpler and calmer.
- **Docs column (~280px):** the space's documents — title + edited timestamp, or a **provider icon** + title for external links. Clicking a file-doc opens the full document view (screen G); an external-link doc opens its URL in a new tab. Footer actions: **+ New doc** (markdown or PDF/image upload, locked to this space — see screen G) and **+ New link** (paste a URL — Google Sheets/Docs, Figma, Notion, …; only the link is stored, no bytes).
- **Thread column (~340px, resizable — the space's conversation, formerly "Updates"):** a reverse-chron feed with a composer at the bottom. Its header carries the **+ Update** action (this is what was formerly the header's "Post update" button). Two post kinds — a plain **message** (composer at the bottom), and a **status post** (created by **+ Update**) which carries a **health pill**. The latest status post is what the Goals rollup reads, so renaming to Thread does not break the founder view. Posts show author, mono timestamp, and markdown body; messages support short replies.
- **Interactions:** opening a task slides the **task detail panel** in over the columns — task-level comments live there, separate from the space Thread. On tablet the Docs column hides first, then the thread collapses to an overlay toggle.

### D. Goals rollup
The founder view; the screen that replaces a status meeting. A list of objectives. Each objective card:
- Title.
- One or more **key results**, each a thin progress bar with mono `current / target` (e.g., `$420k / $600k`, `4 / 6`).
- **From your spaces:** the latest **status post** from each Space attached to this goal (pulled from the space thread) — a health dot, the space name, a one-line summary, and a mono timestamp. Engineering and non-engineering posts sit side by side here.

### E. Task detail (right-side panel)
Slides in over any list; doesn't navigate away. Contents: editable title; **status** selector (the five states); assignee; priority; due date; space (or **private + optional tag**); markdown description; linked docs; git links (engineering); and a **comment thread** at the bottom. Optional fields that are unset appear as subtle "+ add" affordances, not empty rows.
- Include a **Make shared / Make private** action. Promoting a personal task to a space is deliberate (it becomes visible to the team) — show a one-line confirm hint, not a silent field edit.

### F. Quick-create (⌘K → create, or C)
Centered modal. A large **title** input is the only required field. A context chip shows where it lands: **Personal** when opened from My work, or the current space when opened inside one. Status defaults to **Backlog**. Optional chips below: assignee, priority, due date, and (engineering) link branch. Enter creates and closes.

### G. Document view / editor
A large modal (~55% width, ~85vh, tall aspect) that opens over the current screen. A document is one of three kinds:
- **Markdown doc** — **View mode** renders the body properly (headings, lists, code blocks, tables, links — GFM), styled with the token system (flat, hairline, mono for code). An **Edit** toggle swaps the body for a plain-markdown textarea (and an editable title); **Save** persists and returns to the rendered view. A newly created markdown doc opens straight into edit mode. Bodies are stored one markdown file per doc (`Documents_Stage/<id>.md`), never rendered HTML.
- **Uploaded file** — a **PDF** (embedded in an inline viewer) or an **image** (shown fit-to-frame). Only these two upload types are accepted; reject anything else in the UI (and server-side). No text editing for these.
- **External link bookmark** (see below) — opens its URL in a new tab rather than the modal.

A **linked tasks** section and inline comments apply to markdown docs. An optional doc-type label (note / spec / decision log) and a scope indicator (personal vs a space).

**Creating a doc.** The **New doc** action opens a small **New document** modal: choose **Markdown doc** or **Upload PDF/image**, an optional title (defaults to "Untitled" or the file's name), and — when created from the Spaces hub or the Docs screen — a **Space** picker (Personal by default, or any space). Inside a Space, the doc is locked to that space (no picker).

**External link bookmarks.** A document may instead be a bookmark to an external file (Google Sheets / Docs / Slides, Figma, Notion, …): it stores only a `url`, no bytes. These render in doc lists with a **provider icon** derived from the URL (Sheets = green grid, Docs = blue doc, Slides = amber, Figma, Notion, else a generic link glyph) and a hover ↗; clicking opens the URL in a new tab rather than the editor. Created via **+ New link** (paste URL + optional title; title defaults to the domain).

### H. Command palette (⌘K)
Overlay with a single input and grouped results: **Navigate** (spaces, docs, tasks), **Create** (task, doc, space), **Actions** (change status, assign). Fully operable by keyboard.

### I. Meetings (its own top-level area)
A standalone area in the sidebar, separate from the Spaces hub. A lightweight, durable record of meetings — built simple now, but designed to grow (calendar sync, auto-attendees, transcripts via external APIs come later, not in this demo).
- **List view:** meetings in reverse-chron order. Each row: title, mono date/time, a stack of attendee avatars, and a one-line outcome summary. A **New meeting** action. Empty: "No meetings logged yet."
- **Meeting detail (right-side panel, same pattern as a task):**
  - **Title** (required) and **date/time** (mono).
  - **Attendees** — people chips added from the team.
  - **Outcomes** — a markdown notes field; this is the durable artifact the meeting leaves behind.
  - **Action items** — a short checklist where each item can become a real task (assignable to a space and person), so a meeting feeds the work system instead of dying in notes.
  - Optional links to related spaces or goals.
- **Scope for the demo:** manual entry of title, date, attendees, and outcomes, plus action-items-to-tasks. Everything else (calendar/video/transcription integrations) is explicitly future — leave hooks, don't build it.

## 7. Component library

Build these as reusable pieces with hover / focus / selected / disabled states:

- **Status pill** (5 states) and **health dot/pill** (3 states) — colors per §4.
- **Priority flag** (low / medium / high, plus none).
- **Space tag** chip · **Private badge** (lock icon) · **Task key** (mono).
- **Git badge** (branch / PR open / merged).
- **Task row** — states: default, hover, keyboard-selected, done (muted + strikethrough).
- **Inbox item** · **Goal card** with **KR progress bar**.
- **Doc list row** — title, type icon, owning space or private badge, owner avatar, edited timestamp. **External-link variant:** a provider icon (Sheets / Docs / Slides / Figma / Notion / generic) + title + hover ↗; opens the URL in a new tab.
- **Document viewer/editor modal** — renders GFM markdown in view mode; Edit toggle → markdown textarea + Save.
- **Meeting row** and **meeting detail** (attendee chips, outcomes notes, action-item checklist where an item converts to a task).
- **Thread post** — two variants: a plain **message**, and a **status post** with a **health pill**. Author, mono timestamp, markdown body, optional short replies.
- **Thread feed + composer** — shared by a space thread and the company General thread.
- **Avatar / initials** circle.
- **Optional-field chip** ("+ assignee", "+ due date").
- **kbd chip** for showing shortcuts (e.g., a small `C`).
- **Buttons:** primary (accent fill), secondary (hairline outline), ghost.
- **Empty states** for each list.

## 8. Voice & microcopy

Plain, active, sentence case. Name things by what people do, not how the system works. Buttons say what happens ("Post update", "Make shared", "Create task") and the resulting toast matches ("Update posted"). The thread composer's button is "Send"; a health-tagged status post is created by "Post update". Empty states direct: "No tasks yet — press C to add one", "No goals set for this quarter", "You're all caught up", "No posts yet — start the thread". Errors state what happened and how to fix it; they don't apologize or go vague.

## 9. Demo data

Populate the demo with this so it reads as a real, lived-in workspace.

**People:** Aaryan (founder), Mara (eng), Devon (eng), Priya (ops), Sam (sales), Lena (finance).

**Goals (Q3):**
- *Reach $1M ARR* — KRs: Pipeline created `$420k / $600k`; New logos `6 / 10`.
- *Ship v2 platform* — KR: Core modules done `4 / 6`.
- *Extend runway to 18 months* — KR: Monthly burn `$90k / $75k` (over — show red).

**Spaces:** Engineering → **Auth**, **Payments**, **Infra**. Workstreams → **Sales**, **Finance**, **Ops**.

**Latest status post in each space thread (these feed the Goals rollup):**
- Sales (at risk, 1d): "Two deals slipped to next month; rest of pipeline healthy."
- Payments (on track, 3h): "Checkout shipped; unblocks two enterprise trials."
- Auth (on track, 5h): "SSO in review, on track to merge this week."
- Infra (at risk, 2d): "Migration blocked on vendor; escalated."
- Finance (off track, 1d): "Burn above target; cost cuts proposed for review."

**Auth thread — a couple of plain messages above the status post (so it reads as a conversation, not a log):**
- Devon (6h): "Heads up — rotating the signing keys Thursday, expect a brief blip."
- Mara (5h): "Noted, I'll hold the SSO merge until after."

**Company General thread (General thread column of the Spaces hub):**
- Aaryan (2d): "Board meeting Friday — I'll share the deck Thursday for feedback."
- Priya (1d): "New laptops arrive next week; reply with your size preference."
- Sam (4h): "Closed the Northwind deal — biggest logo yet."

**Docs (Docs column):** "Payments spec" (spec · Payments), "Refund-flow RFC" (note · Payments), "Auth outage postmortem" (decision log · Infra), "Q3 board deck" (note · private). Plus a few **external-link** examples to exercise provider icons: "Payments budget FY25" (Google Sheets · Payments), "Login flow" (Figma · Auth), "Incident runbook" (Notion · Infra).

**Meetings (Meetings tab):**
- "Weekly eng sync" — Mon 10:00 — Mara, Devon, Aaryan — outcome: "Prioritized SSO; deferred the token-storage audit." Action item: "Hold SSO merge until key rotation" (→ Auth).
- "Board prep" — Thu 15:00 — Aaryan, Lena — outcome: "Aligned on the runway narrative and the proposed cost cuts."

**Aaryan's inbox:** mentioned in *Payments spec* ("can you confirm the refund flow?", 2h); assigned *Fix login redirect loop* (5h); review requested on *PR #214 · vendor API client* (1d).

**Aaryan's tasks (My work):**
- `AUTH-214` Fix login redirect loop — Auth — in progress — Today
- Review vendor contract — Finance — in review — Today
- Draft Q3 hiring plan — Ops — to do — This week
- `PAY-88` Write payments spec — Payments — to do — This week
- **Personal:** Prep board update slides — private — Today
- **Personal:** Read refund-flow RFC — private · tagged *Payments* — This week

**A sample engineering space (Auth) task list:** a few tasks across all five statuses, two with git badges (one PR open, one merged → done), keys `AUTH-2xx`.

## 10. Demo scope & priority

**P0 — build first (these tell the whole story):**
My work · Goals rollup · one engineering Space detail (tasks in the main column, right rail with docs + thread) · quick-create modal · task detail panel.

**P1:** Spaces hub — the three-column layout (Spaces list · Docs rail · company General thread) · the standalone Meetings area (list + detail panel) · workstream Space variant · command palette.

**P2:** Document editor · richer meetings (calendar / transcript integrations) · dark mode polish · settings.

**Out of scope for the demo:** real authentication, real git integration (mock the badges), data persistence (static/mock state is fine), and any permissions model.

**Quality floor (non-negotiable):** responsive down to tablet, visible keyboard focus on every interactive element, `prefers-reduced-motion` respected, sentence case throughout, no gradients or drop shadows.
