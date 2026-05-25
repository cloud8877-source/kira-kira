# Kira-Kira — Codex Build Handoff

## Mission

Build a Malaysian-kopitiam-themed split bill tracker. Organizer creates a bill,
gets an admin link + a public WhatsApp-shareable link; members tap their name
and mark paid; organizer verifies. Stack is locked: Next.js 16 (App Router) +
`@opennextjs/cloudflare` on Cloudflare Workers + D1 + Drizzle + shadcn/ui +
Tailwind.

**Read this first:** `docs/superpowers/specs/2026-05-25-kira-kira-design.md` —
full design, schema, security model, file layout, and per-milestone acceptance
criteria. Do not start coding without reading it.

## Operating rules (non-negotiable)

- **One milestone per session.** Do not advance past your assigned milestone.
- **Acceptance criteria are tests, not vibes** — run them and paste output in
  your final message before stopping.
- **Money is always integer cents** in DB and in transit. Never use floats.
- **Admin secret comparison must be timing-safe** (`crypto.subtle.timingSafeEqual`).
  Never `===` on secret-like strings.
- **No new dependencies** without listing them in your final message with a
  one-line justification each.
- **Follow the file layout in the spec exactly.** Do not invent new directories.
- **Do not run `wrangler deploy`** until M6.
- **If blocked, stop and write what you tried + what you need.** Do not
  improvise around acceptance criteria.

## Supply chain hygiene (M1 install boundary — non-negotiable)

The Mini Shai-Hulud npm/PyPI worm is actively propagating (May 2026), compromising 160+ packages including @antv, TanStack, and Mistral. It exfiltrates `GH_TOKEN`, `CLOUDFLARE_API_TOKEN`, AWS keys, and `~/.npmrc` via malicious postinstall scripts. Before any `npm install`:

- **Pin EXACT versions** in `package.json` — no `^`, no `~`. Every dep has a literal version.
- **Commit `package-lock.json`** on first install. Subsequent runs use `npm ci`, never `npm install`.
- **First install uses `npm ci --ignore-scripts`**, then run any required postinstall manually after reviewing it.
- **Run `npm audit signatures`** after install to verify package provenance (npm ≥ 9.5).
- **Never put tokens in `~/.npmrc`.** Wrangler/gh/AWS tokens should be short-lived and shell-env-only.
- **Approved dep list for M1** (verify each is NOT on current public IOC feeds before installing):
  `next`, `react`, `react-dom`, `@opennextjs/cloudflare`, `wrangler`, `drizzle-orm`, `drizzle-kit`, `@cloudflare/workers-types`, `tailwindcss`, `postcss`, `autoprefixer`, `zod`, `swr`, `nanoid`, `vitest`, `@types/node`, `typescript`, `eslint`, `eslint-config-next`. shadcn components are copied via the shadcn CLI, not installed as a package.
- If a dep request falls outside this list, STOP and flag it.

## Current milestone

**M4 — Public bill page + member confirm flow**

Goal: `/b/[id]` "prints in" as a kopitiam receipt showing the bill + participant list. Member taps their name (remembered via `localStorage`), goes to `/b/[id]/me/[pid]`, marks themselves paid (with optional payment-reference note), status flips to amber **"Pending"**.

## Voice (UPDATED) — all in-app copy in ENGLISH
Brand name "Kira-Kira" stays. KOPI-SUSU theme badge stays as a visual accent. Everything user-facing is plain, friendly English — no Malay phrases. Tone matches M3: warm, casual, never corporate. Reference M3 wording for consistency:
- Copy buttons: "Copy link" / toast "Copied!"
- Status name: "Pending" (amber), "Paid" (green), "Unpaid" (grey)
- Forms: short labels, decisive verbs ("Create bill", "Mark as paid")

## Definition of done for the current milestone

**Acceptance criteria (all must pass):**
1. First visit to `/b/[id]` shows the receipt + a **"Pick your name"** picker; tapping a name stores `{ billId, participantId }` in `localStorage[kira-kira:<billId>]` and routes to `/b/[id]/me/[pid]`
2. Subsequent visits read the saved pick from `localStorage` and route straight to the confirm view — but show a small **"Not you?"** link that clears the entry and returns to `/b/[id]`
3. The confirm view shows: bill title, the participant's name, their amount owed (RM X.YZ via `formatRm`), optional note textarea (placeholder: "Payment reference — e.g. Maybank TXN 12345", max 200 chars), **"Mark as paid"** button
4. Submitting calls `markPaid` server action → status flips to `pending` → amber **"Pending"** stamp animation appears, button becomes disabled with copy **"Waiting for organizer to confirm…"**
5. The receipt has a `PrintInAnimation` reveal on load (CSS-only mask animation — no JS animation libraries)
6. **No-JS fallback**: `/b/[id]` read view renders fully with JS disabled (RSC). The confirm form shows a `<noscript>` message: **"Enable JavaScript to mark this paid."**
7. `npm run typecheck` clean
8. M2 vitest suite still passes (no regressions)
9. Mobile-first: 390 × 844 viewport renders cleanly, all tap targets ≥ 44 px

## Architectural notes (mandatory)

- `/b/[id]/page.tsx` is a **server component**. Reads bill via `getBillPublic(getDb(), id)`. Renders `<Receipt>` (server-renderable) + `<ParticipantPicker>` (client island).
- `<ParticipantPicker>` is a client component that on mount:
  1. Reads `localStorage[\`kira-kira:${billId}\`]` for the participant id
  2. If present, routes `router.replace('/b/' + billId + '/me/' + savedPid)` immediately
  3. If absent, renders the tap-list
- `/b/[id]/me/[pid]/page.tsx` is also a server component. Reads bill + verifies pid exists. Renders `<Receipt>` + `<MarkPaidForm>` (client).
- `<MarkPaidForm>` is a client component using `useTransition`; calls the `markPaid` server action; on success, optimistic state shows the pending stamp.
- `<Receipt>` is purely presentational; takes `bill: BillView` as a prop. Server-renderable. Used by both `/b/[id]` and `/b/[id]/me/[pid]`.
- `<PrintInAnimation>` is a tiny client wrapper (`useEffect` adds a class for the CSS keyframes after mount). Pure CSS animation — no framer-motion / no animation library.
- "Not you?" link: clears the `localStorage` entry and routes back to `/b/[id]`.

## Files you may create or modify

```
app/b/[id]/page.tsx                  # server: bill load + Receipt + ParticipantPicker
app/b/[id]/me/[pid]/page.tsx         # server: bill+participant load + Receipt + MarkPaidForm
components/Receipt.tsx               # server-renderable presentational receipt
components/ParticipantPicker.tsx     # client: localStorage + tap-list
components/MarkPaidForm.tsx          # client: form + useTransition + markPaid action
components/PrintInAnimation.tsx      # client: CSS keyframe trigger
components/PendingStamp.tsx          # tiny client/server stamp visual (amber, slightly rotated)
app/globals.css                      # MAY append @keyframes for the receipt print-in mask
```

**Do NOT touch in M4:**
- `app/page.tsx`, `app/created/[id]/page.tsx`, `components/CreateBillForm.tsx`, `components/CopyLinkButton.tsx`, `components/WhatsAppShareButton.tsx` (M3)
- `lib/**`, `app/actions/**`, `db/**` (M2 settled — only USE these)
- `wrangler.jsonc`, `next.config.ts`, `open-next.config.ts`, `drizzle.config.ts`, `tsconfig.json`, `vitest.config.ts` (M1)
- `tests/**` (Optionally extend if you write a new pure helper — otherwise leave)
- `app/b/[id]/admin/` and `app/api/og/` — those are M5/M6

**No new dependencies allowed.** Everything needed is already installed (Next.js + React + Tailwind + shadcn primitives + lucide-react).

---

## Previous milestone (M3) — UI shell + landing + create flow

**M3 — UI shell + landing + create flow**

Goal: Branded shell (Kopi-Susu palette, fonts, paper texture), `/` landing with a working `CreateBillForm`, and `/created/[id]` success page with two copyable links + a WhatsApp share button. Mobile-first. No bill viewing yet (M4 owns that).

## Definition of done for the current milestone

**Acceptance criteria (all must pass):**
1. Creating a bill via `/`'s form redirects to `/created/[id]` with the admin secret in the **URL fragment** (`#k=...`), not the query string
2. The success page shows two distinct copyable links: admin (`/b/[id]/admin?k=<secret>`) and public (`/b/[id]`)
3. WhatsApp share button opens `https://wa.me/?text=<encoded message with public link>`
4. Form validates client-side via the SAME Zod schema in `lib/validation.ts` (no schema duplication)
5. iPhone-14 viewport (390 × 844) renders without horizontal scroll — verify via `chrome-devtools-mcp` resize + screenshot
6. Participant rows are add/remove dynamic (min 1, max 50)
7. All shadcn primitives sourced via `npx shadcn add` (NOT hand-written) and pinned exact in package.json
8. `npm run typecheck` clean, `npm run lint` clean
9. The receipt-print + paper-grain feel applied — landing has paper texture, copy uses warm Malaysian-English voice (e.g., "Buat bil baru", "Salin link", "Hantar kat WhatsApp")
10. App loads visibly in `npm run dev` on port 8787 (manual visual check via chrome-devtools-mcp)

## Architectural notes (mandatory)

- Use `next/font` for **Fraunces** (serif headings) + **Inter** (body) + **JetBrains Mono** (receipt amounts). No CDN font links.
- shadcn style: **"new-york"** (more refined shadows match the polished kopitiam feel)
- Server action `createBill` returns `{ id, adminSecret }` — adminSecret goes in the URL fragment via `router.replace('/created/' + id + '#k=' + secret)` so it never appears in server logs
- Success page reads the bill via a public read (no secret needed for the basic fields); admin secret stays client-side as fragment, then displayed for copy
- Paper-grain: subtle CSS background pattern (SVG or noise gradient) on `body`. Keep CSS-only — no image dependencies.

## Files you may create or modify

```
app/layout.tsx                       # next/font setup + global metadata
app/page.tsx                         # landing layout + <CreateBillForm />
app/created/[id]/page.tsx            # success: <CopyLinkButton /> x 2 + <WhatsAppShareButton />
app/globals.css                      # finalize Kopi-Susu tokens, paper-grain background
components/ui/button.tsx             # shadcn add
components/ui/input.tsx              # shadcn add
components/ui/label.tsx              # shadcn add
components/ui/textarea.tsx           # shadcn add
components/ui/card.tsx               # shadcn add
components/ui/sonner.tsx             # shadcn add (toast for "Copied!" feedback)
components/CreateBillForm.tsx        # client form, dynamic participants, Zod-validated
components/CopyLinkButton.tsx        # client, navigator.clipboard.writeText, toast on success
components/WhatsAppShareButton.tsx   # builds wa.me/?text=... link, anchor with target="_blank"
lib/utils.ts                         # shadcn cn() helper (created by shadcn init)
components.json                      # shadcn config (created by shadcn init)
```

**Pre-staged by Claude before Codex dispatch:**
- `npx shadcn init` (creates components.json + lib/utils.ts + installs cva + clsx + tailwind-merge + lucide-react)
- `npx shadcn add button input label textarea card sonner` (creates components/ui/*.tsx + installs @radix-ui/* primitives)
- Exact-pin any newly-added deps in package.json (override shadcn's `^` defaults)
- Run `npm audit signatures` after

**Do NOT touch in M3:**
- `app/b/`, `app/api/og/` (M4, M6)
- `lib/auth.ts`, `lib/money.ts`, `lib/validation.ts` (M2 settled, except: extend validation if a form-specific schema needs splitting)
- `db/schema.ts`, drizzle/, wrangler.jsonc, next.config.ts (M1)
- `app/actions/` (M2 implemented — only USE them, don't modify)

---

## Previous milestone (M2) — server actions + tests

**M2 — Server actions + Zod validation + unit tests**

Goal: All four server actions (`createBill`, `markPaid`, `confirmPayment`, `rejectPayment`) implemented with Zod-validated boundaries, timing-safe admin token verification, and ≥ 80 % unit test coverage on `lib/` and `actions/`. Headless — no UI work yet.

## Definition of done for the current milestone

**Acceptance criteria (all must pass):**
1. `vitest --run` exits 0 with coverage report
2. Happy-path covered: create bill → mark participant paid → organizer confirms → status flows `unpaid → pending → paid`
3. Invalid inputs rejected at the action boundary with clear Zod errors (total ≤ 0, > 50 participants, name > 64 chars, malformed phone)
4. Wrong admin token returns the 404-equivalent (server action throws / returns error that the future page layer will turn into 404)
5. Token comparison uses `crypto.subtle.timingSafeEqual` — grep for `===` against any secret-shaped variable should return zero hits
6. Money is integer cents everywhere: `lib/money.ts` is the only place that converts. Grep for `\.toFixed\(2\)|/\s*100|\* 100` outside `lib/money.ts` → zero hits
7. Coverage ≥ 80 % on `lib/**` and `app/actions/**` (run `vitest --run --coverage`)
8. `npm run typecheck` clean

**Architectural pattern (mandatory):**

Server actions are thin wrappers around pure-function "impl" modules. Pure impls take a Drizzle DB as a parameter so they're trivially testable without Cloudflare runtime.

```ts
// lib/bills/create.ts — pure, testable
export async function createBillImpl(db: Db, input: CreateBillInput): Promise<{ id: string; adminSecret: string }> { ... }

// app/actions/bills.ts — thin server-action wrapper
"use server";
export async function createBill(input: CreateBillInput) {
  const parsed = createBillSchema.parse(input);
  return createBillImpl(getDb(), parsed);
}
```

Tests target the `*Impl` functions with a fresh in-memory libsql DB seeded from `drizzle/0000_init.sql`.

**Test setup:**
- `vitest.config.ts` with `globals: true`, coverage via `@vitest/coverage-v8`
- Test helper `tests/_helpers/db.ts` exports `makeTestDb()` which creates a fresh `:memory:` libsql client, applies the migration SQL, and returns a Drizzle instance
- Each test gets its own DB (no shared state)

## Files you may create or modify

```
lib/auth.ts                      # generateAdminSecret(), hashSecret(), verifySecret() — timing-safe
lib/money.ts                     # toCents(rm), toRm(cents), formatRm(cents)
lib/validation.ts                # Zod schemas: createBillSchema, markPaidSchema, confirmPaymentSchema, rejectPaymentSchema
lib/bills/create.ts              # createBillImpl(db, input)
lib/bills/read.ts                # getBillPublic(db, id), getBillAdmin(db, id, secret)
lib/payments/mark.ts             # markPaidImpl(db, billId, participantId, note?)
lib/payments/confirm.ts          # confirmPaymentImpl(db, billId, participantId, secret)
lib/payments/reject.ts           # rejectPaymentImpl(db, billId, participantId, secret)
app/actions/bills.ts             # "use server" wrappers
app/actions/payments.ts          # "use server" wrappers
tests/_helpers/db.ts             # makeTestDb() with in-memory libsql + migration
tests/auth.test.ts
tests/money.test.ts
tests/validation.test.ts
tests/bills.test.ts
tests/payments.test.ts
vitest.config.ts
```

**Approved new dependencies for M2** (Claude pre-installs these BEFORE Codex starts):
- `@libsql/client` — in-memory SQLite for tests (Drizzle d1 driver works with the same SQL dialect)
- `@vitest/coverage-v8` — coverage reporter

Anything else outside this list = STOP-and-flag.

**Do NOT touch in M2:**
- `app/page.tsx` (M3)
- `app/b/`, `app/created/` (M3, M4, M5)
- `components/` (M3+)
- `next.config.ts`, `wrangler.jsonc`, `drizzle.config.ts`, `open-next.config.ts` (M1 settled these)
- `db/schema.ts` (final at M1)
- Database migrations (no schema changes in M2)

## What was built in previous milestones

> _Running log. Claude updates this between dispatches._

| Milestone | Status | Notes |
|---|---|---|
| M0 — Repo bootstrap | ✅ | Repo at `~/git/gx/kira-kira/`, pushed to https://github.com/cloud8877-source/kira-kira (public). |
| M1 — Skeleton + D1 + healthcheck | ✅ | Claude executed (Codex sandbox has no npm/wrangler network). Next.js 16.2.6 + OpenNext 1.19.11 + D1 (id 23866d8c-...) + Drizzle 0.45.2 + Tailwind v4.3.0. `/api/health` returns `{ok:true, result:2}`. 672 packages, all with verified registry signatures. Spec deviation: dev script is `next dev` (OpenNext-recommended), `wrangler dev` is now `npm run preview` against the built worker. |
| M2 — Server actions + tests | ✅ | Codex (GPT-5.5 xhigh) built it in 7 commits. 19 vitest tests pass, 94.4% stmt / 94.24% line coverage, timing-safe compare verified (lib/auth.ts:93), integer cents enforced, typecheck clean. Pure-impl/thin-wrapper pattern. |
| M3 — UI shell + create flow | ✅ | Codex (GPT-5.5 xhigh) built it in 5 commits. CreateBillForm (436 lines, reuses lib/validation.ts schema — zero duplication), CopyLinkButton + CreatedClient, WhatsAppShareButton, success page, branded layout with Fraunces/Inter/JetBrains Mono. Claude end-to-end tested: form submits → secret in URL fragment → success page renders both copyable links → wa.me deep link correct. 19 tests still pass. Mobile-first verified at 390px (no horizontal scroll, kopi paper bg `#F7EFE2` / espresso ink `#3B2A1E` confirmed in DOM). |
| M4 — Public bill + member confirm | 📋 | Briefed above. Pure codegen — no install/network needed. Codex's lane. |
| M2 | ⏳ | |
| M3 | ⏳ | |
| M4 | ⏳ | |
| M5 | ⏳ | |
| M6 | ⏳ | |

## Review checklist (Claude runs this on your diff)

- [ ] All milestone acceptance criteria pass (paste verification output)
- [ ] No floats for money anywhere in code or DB
- [ ] No `===` comparison on secrets — `crypto.subtle.timingSafeEqual` only
- [ ] No files created outside the listed paths for this milestone
- [ ] No new dependencies without justification
- [ ] Mobile viewport (390 × 844) renders without horizontal scroll (M3 onwards)
- [ ] All server actions Zod-validated at boundary
- [ ] Wrong/missing admin token returns 404 (not 401)
