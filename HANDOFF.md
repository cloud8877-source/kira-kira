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
| M1 — Skeleton + D1 + healthcheck | ✅ | Claude executed (Codex sandbox has no npm/wrangler network). Next.js 16.2.6 + OpenNext 1.19.11 + D1 (id 23866d8c-...) + Drizzle 0.45.2 + Tailwind v4.3.0. `/api/health` returns `{ok:true, result:2}`. `npm run build` and `opennextjs-cloudflare build` both green. 672 packages, all with verified registry signatures. Spec deviation: dev script is `next dev` (OpenNext-recommended) not `wrangler dev` — `wrangler dev` is now `npm run preview` against the built worker. |
| M2 — Server actions + tests | 📋 | Briefed above. Ready for Codex dispatch (this one IS Codex-friendly — pure code transforms, no install/network needed). |
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
