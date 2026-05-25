# Kira-Kira — Split Bill & Payment Tracker (Bounty Submission Plan)

**Bounty:** https://krackeddevs.com/code/bounty/split-bill-payment-tracker-web-app
**Build model:** Codex implements milestone-by-milestone, Claude reviews each diff before dispatching the next.
**Plan owner:** Claude (this session, plan mode) — execution begins after `ExitPlanMode`.

---

## Context

The bounty asks for a Split Bill + Payment Tracker that lets an organizer create a bill, share a link, and track who has paid. Real payment gateway integration is not required. Judging weights **creative theming, polished mobile-first UI, and a frictionless WhatsApp-share flow** — the bounty explicitly highlights "kopitiam payment tracker" as a valid creative direction and notes "most users will open links from WhatsApp."

This plan builds **Kira-Kira**, a Malaysian kopitiam-themed tracker. Decisions were locked through brainstorming:

- **Theme:** Kopitiam / Makan vibes (warm paper + amber, receipt-as-bill metaphor)
- **Auth:** No accounts. Two token-bearing URLs per bill (admin + public)
- **Payment flow:** Three-state — `unpaid` → `pending` (member self-marked) → `paid` (organizer verified)
- **Split:** Equal-only for MVP (covers 80 % of real cases; preserves polish budget)
- **Stack:** Next.js 15 (App Router) + `@opennextjs/cloudflare` → Cloudflare **Workers** + D1 + Drizzle + shadcn/ui + Tailwind
- **Bonuses committed:** WhatsApp-optimized OG share card, animated kopitiam receipt, nudge-on-WhatsApp button, live-polling dashboard (free), single Kopi-Susu light theme (no dark mode)

---

## Brand: Kira-Kira

"Kira-kira" is what you literally say at a kopitiam to ask for the bill total. "Kira" means count / calculate. Double meaning, instantly familiar to Malaysians.

**Voice:** warm Malaysian-English with Malay sprinkles. Reads like a kopitiam auntie texting the bill — never like a bank.

**Visual system (single light theme "Kopi Susu"):**

| Token | Hex | Use |
|---|---|---|
| `--paper` | `#F7EFE2` | Background |
| `--ink` | `#3B2A1E` | Primary text |
| `--teh` | `#D88A3F` | Primary actions, amber pending |
| `--lime` | `#5C8A4A` | Paid / success |
| `--sambal` | `#C24B3A` | Overdue / reject |
| `--paper-soft` | `#EFE5D3` | Card surfaces |

- **Type:** Fraunces (display) · Inter (body) · JetBrains Mono (receipt amounts)
- **Texture:** subtle paper grain on bill cards, dashed-line dividers like real receipts, slightly rotated "PAID" / "PENDING" stamps
- **Motion:** receipt "prints in" from top on bill page load · confetti at 100 % settled · soft row-slide highlight on newly-confirmed payments

---

## User flows

**A · Organizer creates a bill**
`/` → "Buat bil baru" → form (title, total RM, due date, description, participants with name + optional phone) → submit → `/created/[id]` with two copyable links and a WhatsApp share button.

**B · Member confirms payment**
Opens public link in WhatsApp → bill receipt "prints in" → taps own name from list (remembered in `localStorage`) → sees their share (total ÷ N) → "Saya dah bayar" + optional note ("Maybank ref 12345") → status flips to **Pending (amber)** with stamp animation.

**C · Organizer verifies and tracks**
Admin link → dashboard: progress ring, three columns (Belum bayar / Tengok dulu / Sudah settle), per-row Confirm/Reject for pending, Nudge-on-WhatsApp for unpaid. Polling every 4 s keeps it live.

---

## Screens (6 routes)

| Route | Purpose |
|---|---|
| `/` | Landing + `CreateBillForm` |
| `/created/[id]` | Post-create: copy links, WhatsApp share, "Open dashboard" |
| `/b/[id]` | Public bill page (the receipt experience) |
| `/b/[id]/me/[pid]` | Member's confirm view after tapping name |
| `/b/[id]/admin?k=<secret>` | Organizer dashboard |
| `/api/og/[id]` | Dynamic OG image for WhatsApp share card |

---

## Stack & runtime

- **Next.js 15** (App Router, React 19, Server Actions)
- **`@opennextjs/cloudflare`** adapter → builds for **Cloudflare Workers** (Workers with static-asset binding is the 2026 model; classic Pages is legacy)
- **`wrangler.jsonc`** with bindings: `DB` (D1), env `APP_URL`
- **Local dev:** `wrangler dev` (full Workers runtime + local D1 emulation) — used as `npm run dev`
- **Deploy:** `opennextjs-cloudflare build && wrangler deploy` → `kira-kira.<account>.workers.dev`
- **DB:** Cloudflare D1 (serverless SQLite), accessed via Drizzle's `drizzle-orm/d1` and cached `getDb()` per OpenNext docs
- **Migrations:** `drizzle-kit generate` → `wrangler d1 execute kira-kira-db --local|--remote --file=...`
- **UI:** Tailwind + shadcn/ui primitives (Button, Input, Label, Textarea, Card, Toast)
- **Polling:** SWR with `refreshInterval: 4000` on dashboard
- **Validation:** Zod (shared between client + server actions)

---

## Data model (Drizzle, code-level)

```ts
// db/schema.ts
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const bills = sqliteTable("bills", {
  id: text("id").primaryKey(),                    // nanoid(10)
  title: text("title").notNull(),
  totalCents: integer("total_cents").notNull(),   // integer cents, never float
  currency: text("currency").notNull().default("MYR"),
  dueDate: integer("due_date", { mode: "timestamp" }),
  description: text("description"),
  adminSecretHash: text("admin_secret_hash").notNull(),  // sha256(secret)
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
});

export const participants = sqliteTable("participants", {
  id: text("id").primaryKey(),                    // nanoid(8)
  billId: text("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone"),                           // E.164-ish, optional
  amountCents: integer("amount_cents").notNull(),
  status: text("status", { enum: ["unpaid", "pending", "paid"] }).notNull().default("unpaid"),
  note: text("note"),
  paidAt: integer("paid_at", { mode: "timestamp" }),
  confirmedAt: integer("confirmed_at", { mode: "timestamp" }),
}, (t) => ({
  billIdx: index("participants_bill_idx").on(t.billId),
}));
```

---

## Server actions (all in `app/actions/`)

| Action | Inputs | Auth | Effect |
|---|---|---|---|
| `createBill` | title, totalCents, dueDate?, description?, participants[] | none | Insert bill + participants. Returns `{ id, adminSecret }` (one-time). |
| `markPaid` | billId, participantId, note? | public | Status → `pending`, stamp `paidAt`. Idempotent. |
| `confirmPayment` | billId, participantId, adminSecret | verified | Status → `paid`, stamp `confirmedAt`. |
| `rejectPayment` | billId, participantId, adminSecret | verified | Status → `unpaid`, clear `note`/`paidAt`. |

Reads (RSC): `getBillPublic(billId)`, `getBillAdmin(billId, secret)`.

---

## Security model

- **Admin secret:** 16 random bytes via `crypto.getRandomValues`, base64url-encoded. Stored as **SHA-256 hash** in `bills.admin_secret_hash`.
- **Verification:** hash incoming `?k=` and compare with **`crypto.subtle.timingSafeEqual`** — never `===`.
- **Bill id:** `nanoid(10)` (~58 bits entropy). Public bill view is intentionally readable by anyone with the link (matches WhatsApp-group sharing).
- **Wrong / missing admin token on admin routes:** return **404** (not 401) — avoids confirming bill existence to scanners.
- **Input validation:** Zod on every action. Constraints: total > 0, 1–50 participants, name ≤ 64 chars, phone matches E.164-ish regex.
- **Money:** always integer cents in DB and in transit. Conversion to float only at display.
- **Admin secret in URL fragment** on the success page (`#k=...`, not `?k=...`) so it doesn't appear in server logs / referrers. Only the eventual stored bookmark uses `?k=...` (Workers logs are within the same trust boundary).
- **Rate limiting on `createBill`:** small KV namespace, 5/min per IP. Defer to M2 follow-up if it adds friction; mention in spec but not blocking.

---

## Supply chain hygiene (M1 install boundary)

The Mini Shai-Hulud npm/PyPI worm is actively propagating (May 2026), compromising 160+ packages including @antv, TanStack, and Mistral. It exfiltrates `GH_TOKEN`, `CLOUDFLARE_API_TOKEN`, AWS keys, and `~/.npmrc` via malicious postinstall scripts. Hard rules for any package-manager work in this repo:

- **Pin EXACT versions** in `package.json` — no `^`, no `~`. Every dep has a literal version.
- **Commit `package-lock.json`** on first install. Subsequent installs use `npm ci`, never `npm install`.
- **First install uses `npm ci --ignore-scripts`**, then run required postinstall scripts manually after reviewing them.
- **Run `npm audit signatures`** after install to verify package provenance (npm ≥ 9.5).
- **Never put tokens in `~/.npmrc`.** Wrangler/gh/AWS tokens stay shell-env-only and short-lived.
- **Approved dep list for M1** (verify each is not on current public IOC feeds before installing):
  - Runtime: `next`, `react`, `react-dom`, `@opennextjs/cloudflare`, `drizzle-orm`, `@cloudflare/workers-types`, `zod`, `swr`, `nanoid`
  - Dev: `wrangler`, `drizzle-kit`, `tailwindcss`, `postcss`, `autoprefixer`, `vitest`, `@types/node`, `typescript`, `eslint`, `eslint-config-next`
  - shadcn primitives are copied via the shadcn CLI (not installed as a package)
- Any dep request outside this list requires a STOP-and-flag.

---

## Project layout

```
kira-kira/
  app/
    page.tsx                        # landing + CreateBillForm
    created/[id]/page.tsx           # success/share links
    b/[id]/page.tsx                 # public bill (receipt)
    b/[id]/me/[pid]/page.tsx        # member confirm
    b/[id]/admin/page.tsx           # organizer dashboard
    b/[id]/admin/poll/route.ts      # SWR read endpoint
    api/og/[id]/route.tsx           # dynamic OG image
    api/health/route.ts             # D1 healthcheck
    actions/
      bills.ts                      # createBill
      payments.ts                   # markPaid, confirmPayment, rejectPayment
    layout.tsx, globals.css
  db/
    index.ts                        # getDb()
    schema.ts
  lib/
    auth.ts                         # token generate / hash / timing-safe verify
    money.ts                        # cents <-> RM
    validation.ts                   # Zod schemas (shared client+server)
    whatsapp.ts                     # buildNudgeLink
  components/
    ui/                             # shadcn primitives
    CreateBillForm.tsx
    Receipt.tsx
    ParticipantPicker.tsx
    MarkPaidForm.tsx
    Dashboard.tsx
    ProgressRing.tsx
    StatusColumn.tsx
    NudgeButton.tsx
    ConfettiOnSettled.tsx
    CopyLinkButton.tsx
    WhatsAppShareButton.tsx
    PrintInAnimation.tsx
  drizzle/                          # generated migration SQL
  scripts/
    e2e-check.sh                    # end-to-end smoke against any URL
  tests/
    actions.test.ts                 # vitest unit tests
  wrangler.jsonc
  drizzle.config.ts
  next.config.ts                    # OpenNext-wrapped
  tailwind.config.ts
  package.json
  README.md
  HANDOFF.md                        # Codex briefing
  .gitignore, .env.example
```

---

## Bounty requirements coverage

| # | Requirement | Satisfied by | Milestone |
|---|---|---|---|
| 1 | Bill Creation | `CreateBillForm` + `createBill` action | M3 |
| 2 | Shareable Bill Page | `/b/[id]` + OG image `/api/og/[id]` | M4, M6 |
| 3 | Member Payment Confirmation | `/b/[id]/me/[pid]` + `markPaid` | M4 |
| 4 | Organizer Dashboard | `/b/[id]/admin?k=...` | M5 |
| 5 | Payment Progress Display | `ProgressRing` + 3-column board | M5 |
| 6 | Mobile-Friendly Design | Tailwind mobile-first, tested at 390 px | M3, M4, M5 |
| 7 | Creative Theme / Branding | Kira-Kira / Kopitiam visual system | M3 |
| 8 | GitHub Repository | Public repo `kira-kira` on user's GitHub | M0 |
| 9 | Short Project Description | README + bounty form text | M6 |
| 10 | Optional Bonus Features | OG share card, animated receipt, nudge, live polling | M4, M5, M6 |
| 11 | Minimum Acceptance Criteria | `scripts/e2e-check.sh` passes against deployed URL | M6 |

---

## Build milestones

Each milestone is one Codex session. Codex implements; Claude reviews the diff before dispatching the next.

### M0 — Repo bootstrap (executed by Claude, not Codex)

- Create clean-named directory: `~/git/gx/kira-kira/` (alongside the bounty-named directory; the spaces and `&` in the current path break wrangler, npm scripts, and CI)
- `git init` and create `.gitignore` (Node + Next + Wrangler + macOS):
  ```
  node_modules/
  .next/
  .wrangler/
  .open-next/
  .env
  .env.local
  .dev.vars
  .DS_Store
  *.log
  drizzle/meta/
  coverage/
  ```
- Create initial `README.md` (placeholder + project description from bounty)
- Create empty `HANDOFF.md` skeleton (filled per-milestone before each Codex dispatch)
- Initial commit: `chore: scaffold repo`
- `gh repo create kira-kira --public --source=. --remote=origin --description="Malaysian kopitiam-themed split bill tracker for the Krackeddevs bounty"` and `git push -u origin main`
- Verify: `gh repo view --web` opens the new repo
- **Confirm before push:** Claude pauses and shows user the dir name + remote URL before `gh repo create` runs

### M1 — Project skeleton + D1 + Drizzle + healthcheck (Codex)

- *Goal:* Empty Next.js 15 app running on `wrangler dev` with D1 binding live and `GET /api/health` returning `{ok:true, result:2}` from a `SELECT 1+1` against D1.
- *Files:* `package.json`, `next.config.ts`, `wrangler.jsonc`, `drizzle.config.ts`, `db/{schema,index}.ts`, `app/api/health/route.ts`, `app/layout.tsx`, `app/page.tsx` (placeholder), `tailwind.config.ts`, `app/globals.css`, `.env.example`
- *Acceptance:*
  - `npm run dev` (wraps `wrangler dev`) boots clean
  - `curl localhost:8787/api/health` → `{"ok":true,"result":2}`
  - `drizzle-kit generate` produces migration SQL
  - `wrangler d1 execute kira-kira-db --local --file=drizzle/0000_*.sql` succeeds
- *Verification:* `npm run dev` in background → `curl -fsS localhost:8787/api/health | grep -q '"ok":true'`

### M2 — Schema + server actions + Zod + tests (Codex)

- *Goal:* All four actions implemented + Zod-validated + unit-tested against local D1.
- *Files:* `db/schema.ts` (final), `app/actions/{bills,payments}.ts`, `lib/{auth,money,validation}.ts`, `tests/actions.test.ts`
- *Acceptance:*
  - Vitest covers: happy-path create → mark → confirm; invalid inputs rejected; wrong admin token rejected (returns 404-equivalent); timing-safe compare used
  - Coverage ≥ 80 % on `lib/` and `actions/`
- *Verification:* `npm test -- --run` exits 0

### M3 — UI shell + landing + create flow (Codex)

- *Goal:* Branded shell (fonts, colors, paper texture), `/` with `CreateBillForm`, `/created/[id]` success with copy-links + WhatsApp share. No bill viewing yet.
- *Files:* `app/layout.tsx`, `app/globals.css` (Kopi-Susu tokens), `components/ui/*`, `components/{CreateBillForm,CopyLinkButton,WhatsAppShareButton}.tsx`, `app/page.tsx`, `app/created/[id]/page.tsx`
- *Acceptance:*
  - Create-bill form on `/` → redirects to `/created/[id]#k=...` (secret in fragment) with two copyable links
  - Same Zod schema validates client + server
  - iPhone-14 viewport (390 × 844) renders without horizontal scroll
- *Verification:* `chrome-devtools-mcp` snapshot at 390 px width + manual flow

### M4 — Public bill page + member confirm (Codex)

- *Goal:* `/b/[id]` "prints in" receipt + participant picker + `/b/[id]/me/[pid]` confirm flow with note field.
- *Files:* `app/b/[id]/page.tsx`, `app/b/[id]/me/[pid]/page.tsx`, `components/{Receipt,ParticipantPicker,MarkPaidForm,PrintInAnimation}.tsx`
- *Acceptance:*
  - First visit prompts "Pilih nama anda"; tap → `localStorage` remembers; subsequent visits skip the picker
  - Marking paid moves status to `pending`, shows amber "Tengok dulu" stamp, disables the button, saves optional note
  - Read view works without JS (RSC); confirm form requires JS, shows fallback message if disabled
- *Verification:* Playwright headless smoke + manual

### M5 — Dashboard + live polling + nudge (Codex)

- *Goal:* Organizer dashboard with progress ring, three columns, SWR polling, Confirm/Reject per pending, Nudge-on-WhatsApp per unpaid.
- *Files:* `app/b/[id]/admin/page.tsx` (RSC initial), `app/b/[id]/admin/poll/route.ts` (SWR poll endpoint, validates `?k=`), `components/{Dashboard,ProgressRing,StatusColumn,NudgeButton,ConfettiOnSettled}.tsx`, `lib/whatsapp.ts`
- *Acceptance:*
  - Confirming a pending row updates UI optimistically and rolls back on error
  - Newly-confirmed rows from another tab appear within ~4 s with slide-in highlight
  - Nudge with phone → opens `https://wa.me/<phone>?text=<encoded>`; without phone → copies same text + toast
  - Wrong/missing `?k=` → 404 (not 401)
  - 100 % paid triggers confetti once per session
- *Verification:* Playwright smoke + manual end-to-end

### M6 — OG image + README + deploy + verification script (Codex)

- *Goal:* WhatsApp-ready share card via `next/og` `ImageResponse`, polished README with screenshots, production deploy, scripted e2e check.
- *Files:* `app/api/og/[id]/route.tsx`, `generateMetadata` in `app/b/[id]/page.tsx`, `README.md`, `scripts/e2e-check.sh`
- *Acceptance:*
  - `/api/og/[id]` returns a kopitiam-receipt-styled image with title, RM total, paid/N count
  - `wrangler deploy` puts the app on `https://kira-kira.<account>.workers.dev`
  - `scripts/e2e-check.sh <url>` exits 0
  - README has ≥ 3 screenshots + project description suitable for bounty form
- *Verification:* Run the script against the deployed URL; paste WhatsApp preview screenshot in README

---

## `HANDOFF.md` (Codex's per-milestone briefing)

Committed at repo root, updated by Claude before each Codex dispatch:

```
# Kira-Kira — Codex Build Handoff

## Mission
Build a Malaysian-kopitiam-themed split bill tracker. Stack is locked:
Next.js 15 (App Router) + OpenNext on Cloudflare Workers + D1 + Drizzle +
shadcn/ui + Tailwind. Full design and acceptance criteria are in
`docs/superpowers/specs/2026-05-25-kira-kira-design.md` — read it before
touching code.

## Operating rules (non-negotiable)
- One milestone per session. Do not advance past your assigned milestone.
- Acceptance criteria are tests, not vibes — run them and paste output
  before stopping.
- Money is always integer cents in DB and in transit. Never use floats.
- Admin secret comparison must be timing-safe (crypto.subtle.timingSafeEqual).
- No new dependencies without listing them in your final message with
  one-line justifications.
- Follow the file layout in the spec exactly. Do not invent directories.
- Do not run `wrangler deploy` until M6.
- If blocked, stop and write what you tried + what you need — do not improvise.

## Current milestone
[M1 | M2 | M3 | M4 | M5 | M6]

## Definition of done for this milestone
[Inlined acceptance criteria + verification command from spec]

## Files you may create or modify
[Inlined file list from spec]

## What was built in previous milestones
[Running log Claude updates between dispatches]

## Review checklist (Claude runs this on your diff)
- [ ] All acceptance criteria pass (paste output)
- [ ] No floats for money, no `===` for secrets
- [ ] No files outside the listed paths
- [ ] No new deps without justification
- [ ] Mobile viewport renders without horizontal scroll (M3+)
- [ ] Server actions Zod-validated
```

---

## Review loop (Claude's job)

After Codex returns each milestone:

1. `git diff main...HEAD` — read every changed line
2. Run the milestone's verification command independently; do not trust Codex's claim
3. Spot-check security invariants (timing-safe compare, no floats, no PII in logs)
4. Dispatch `coderabbit:code-review` skill on the diff before approving M2 (actions) and M5 (auth-touching code)
5. If issues found: write them as TODOs in `HANDOFF.md` and re-dispatch Codex on the same milestone
6. If clean: append to "What was built in previous milestones", advance the milestone pointer, dispatch Codex on the next

---

## End-to-end verification (`scripts/e2e-check.sh`)

```
1. POST createBill (title="Test Makan", total=6000 cents, 3 participants)
2. Assert response has bill id + admin secret
3. GET /b/<id> returns 200 with all 3 participant names
4. POST markPaid for participant #1 → assert status="pending"
5. POST confirmPayment for #1 with secret → assert status="paid"
6. POST confirmPayment for #2 with WRONG secret → assert 404
7. GET admin poll endpoint with correct secret → assert paid count = 1
```

---

## Out of scope (explicit)

- Real payment gateway (Stripe, FPX, etc.)
- Dark mode (single polished theme instead)
- Multi-currency (MYR only)
- Custom-per-person amounts (equal split only)
- Itemized line items
- Recurring bills
- Email / SMS notifications (WhatsApp deep-link only)
- QR code generator (dropped — diverges from WhatsApp-share core)
- Organizer accounts / history

---

## Open items (resolve at execution time, not in plan)

- GitHub username / org for `gh repo create` (default: user's primary `gh auth status` account)
- Final tagline copy on landing (candidates: _"Bayar sama-sama, tanpa segan."_ · _"Bills, kira-kira siap."_)
- Custom domain on Cloudflare (optional, defaults to `*.workers.dev`)
