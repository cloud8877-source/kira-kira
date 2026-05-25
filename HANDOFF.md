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

**M6 — OG share card + README + deploy + e2e verification**

Goal: WhatsApp-ready share card via `next/og` `ImageResponse` (the visible preview when the public link is pasted in WhatsApp), polished README with screenshots + demo URL + bounty submission text, scripted end-to-end smoke test against the deployed Cloudflare Worker. Production deploy lives at `kira-kira.<account>.workers.dev`.

## Voice — all in-app copy in ENGLISH
Same English voice. README is professional-but-warm, suitable for bounty judges. No marketing fluff.

## Definition of done for the current milestone

This milestone is split: **Codex does the codegen, Claude does the deploy + screenshots.**

### Codex's slice (no network needed)
1. `app/api/og/[id]/route.tsx` — exports `GET` using `ImageResponse` from `next/og`. Renders a kopitiam-receipt-styled JSX card (1200×630, the WhatsApp-friendly OG aspect): bill title (Fraunces serif), RM total, paid/total participants count, "Kira-Kira" wordmark, paper-tan background (`#F7EFE2`) with espresso ink (`#3B2A1E`) and teh-amber accent (`#D88A3F`). Reads bill via `getBillPublic(getDb(), id)`. Returns a fallback minimal image if bill missing (no 404 — OG should always return an image).
2. `app/b/[id]/page.tsx` — add `generateMetadata({ params })` that fetches the bill, returns `{ title, description, openGraph: { images: [{ url: '/api/og/' + id }] }, twitter: { ... } }`.
3. `scripts/e2e-check.sh` — bash script. Takes the deployed base URL as `$1`. Curls `/api/og/<a-known-test-bill-id>` and asserts 200 + `content-type: image/png`. Curls `/b/<test-bill-id>` and asserts 200. Curls `/b/<test-bill-id>/admin?k=fake` and asserts 404. Curls `/b/<test-bill-id>/admin/poll?k=fake` and asserts 404. Each assertion uses `set -e` + `[ "$status" = "200" ]` patterns. The TEST_BILL_ID is taken from env var or `$2` arg — script does NOT create a bill (it's a smoke check on routes, not a full create-confirm loop).
4. `README.md` — full rewrite: project description, screenshots (Codex inserts `<!-- SCREENSHOT: ... -->` placeholders Claude fills), live demo URL placeholder `https://kira-kira.<account>.workers.dev`, "Built for the Krackeddevs bounty", stack section, run-locally section, deploy section, "Bounty requirements coverage" table mapping each of the 11 bounty items to where it's satisfied, license. Suitable for the bounty submission text box.

### Claude's slice (network — done after Codex returns)
5. `wrangler d1 migrations apply kira-kira-db --remote` — apply M1 migration to production D1.
6. `npm run deploy` (which runs `opennextjs-cloudflare build && wrangler deploy`).
7. Capture the live URL and update `README.md` + commit.
8. Create a real demo bill on the live URL via chrome-devtools-mcp, take 3+ screenshots (landing, success page, dashboard), save under a workspace-writable path, paste paths into README.
9. Run `scripts/e2e-check.sh <live-url>` against production, paste output into a commit.
10. Final commit + push.

## Acceptance criteria (all must pass)
1. `GET /api/og/<id>` returns `200` with `content-type: image/png` and a visually correct kopitiam-receipt OG card
2. Pasting the public bill URL in WhatsApp Web preview shows the custom OG card (visual check)
3. README has ≥ 3 screenshots, project description, demo URL, run-locally + deploy instructions, and the bounty-requirements table
4. `scripts/e2e-check.sh <deployed-url>` exits 0
5. `wrangler deploy` succeeds, app responds at `kira-kira.<account>.workers.dev`
6. Public landing page on the live URL renders identically to local
7. Creating a bill on the live URL works end-to-end (form → success page → admin link → poll route)
8. `npm run typecheck` clean, all tests still pass
9. No regressions in M1–M5 functionality
10. README's bounty coverage table accurately lists all 11 bounty requirements + where each lives

## Architectural notes (Codex's slice)

- **OG image route** is a Next.js route handler using `next/og` `ImageResponse`. The JSX inside must be inline-styled (no Tailwind classes — `ImageResponse` runs in a Workers context that doesn't have the CSS pipeline). Use `style={{ ... }}` everywhere. Fonts: pass Fraunces + JetBrains Mono via the `fonts` option of `ImageResponse` (load from `next/font/google` weight files via fetch from CDN at build time — or use the system serif/mono fallback if loading proves brittle).
- **`generateMetadata`** must be `async` and `await params`. Return `{ openGraph: { type: 'website', title, description, images: [{ url: '/api/og/' + id, width: 1200, height: 630 }] }, twitter: { card: 'summary_large_image', images: ['/api/og/' + id] } }`.
- **OG missing-bill fallback:** if `getBillPublic` returns null, render a generic "Kira-Kira — Split bills without the awkward chase." card. Never 404 on OG (social crawlers will cache the 404).
- **e2e-check.sh** uses bash + curl. No new deps. Stops at first failure (`set -e`). Prints colored ✅/❌ per check.
- **README** bounty-coverage table: rows for each of the 11 requirements from the bounty page, columns: `#`, `Requirement`, `Where it lives (file:line or route)`, `Status (✅ / Bonus)`.

## Files Codex may create or modify

```
app/api/og/[id]/route.tsx           # NEW: ImageResponse OG card
app/b/[id]/page.tsx                 # MODIFY: add generateMetadata
README.md                           # FULL REWRITE: description, screenshots placeholders, demo URL, bounty table
scripts/e2e-check.sh                # NEW: bash + curl smoke test
```

**Claude appends after Codex (deploy + verify):**
- Updates README.md to fill the `<!-- SCREENSHOT: ... -->` placeholders with real captured screenshots
- Commits screenshots (paths TBD — likely `docs/screenshots/*.png` under the repo)
- Updates README with the actual live URL
- Runs `wrangler deploy` and `scripts/e2e-check.sh`

**No new dependencies allowed.** `next/og` is part of Next.js. Bash + curl already installed.

**Do NOT touch in M6:**
- Anything under `app/page.tsx`, `app/created/`, `app/b/[id]/me/`, `app/b/[id]/admin/`, all M3/M4/M5 components
- `lib/**`, `db/**`, `app/actions/**`
- M1 config files

---

## Future milestone (after M6) — M7: Receipt OCR (snap → autofill)

**Status:** briefed, not started. Runs only AFTER M6 has shipped and verified. Adds a differentiator on top of the bountable MVP.

**Goal:** Organizer taps **"Snap receipt"** in the `CreateBillForm`, picks an image or captures via phone camera. App pipes the image through a Cloudflare Workers AI vision model, extracts `{ title, totalCents }`, and autofills the form. User reviews and submits. Graceful fallback to manual entry if extraction fails.

### Why this is M7, not M3.5
- M4 (member confirm), M5 (organizer dashboard), and M6 (OG image + README + deploy) are the bountable core. Ship those first.
- OCR is "delight scope" — it makes the demo wow-able but doesn't unblock the bounty's stated requirements (1–11). Adding it before the core is shipped risks the whole submission.
- Workers AI bindings change occasionally; better to lock against the same workerd that's been running M1–M6 for weeks before adding a new binding.

### Architecture

- **Cloudflare Workers AI binding** added to `wrangler.jsonc` (`"ai": { "binding": "AI" }`). Re-run `npx wrangler types --env-interface CloudflareEnv` to regenerate `worker-configuration.d.ts` with the `AI: Ai` type.
- **No new npm dependencies.** The `env.AI.run(...)` API is part of the runtime.
- **Recommended model:** `@cf/meta/llama-3.2-11b-vision-instruct` (multimodal, returns text/JSON) — Codex/Claude should verify exact identifier when M7 starts (Cloudflare Workers AI catalog updates). Fallback model: `@cf/llava-hf/llava-1.5-7b-hf`.
- **Pure-impl pattern (same as M2):**
  ```
  lib/receipt/extract.ts       # extractReceiptImpl(ai: Ai, imageBytes: Uint8Array) → { title?, totalCents?, confidence }
  lib/receipt/prompts.ts       # buildVisionPrompt(), parseVisionResponse() — pure functions, unit-testable
  app/actions/receipt.ts       # "use server" wrapper around extractReceiptImpl(getCloudflareContext().env.AI, ...)
  components/SnapReceiptButton.tsx  # client: <input type="file" accept="image/*" capture="environment">, calls action, calls onExtract(parsed) callback
  components/CreateBillForm.tsx     # MODIFY: add <SnapReceiptButton onExtract={fillFromOcr} /> above the title field; fillFromOcr merges into form state non-destructively
  ```
- **Prompt strategy:** Strict JSON output. Prompt instructs the model: "You are reading a restaurant receipt. Return ONLY valid JSON of shape `{\"restaurantName\": string|null, \"totalCents\": integer|null, \"currency\": \"MYR\"|null, \"confidence\": \"high\"|\"medium\"|\"low\"}`. Convert RM amounts to cents (RM 12.50 → 1250). If you cannot read a field, return null for it." Parse defensively — anything malformed → confidence "low" + nulls.
- **Image size limit:** 5 MB. Validate before sending to AI. MIME guard: `image/jpeg`, `image/png`, `image/webp`, `image/heic`.
- **Latency:** vision models take 2–8 s. SnapReceiptButton shows a loading state ("Reading receipt…") with the spinner pattern already in `CreateBillForm` (Loader2 from lucide-react).

### Acceptance criteria

1. `"Snap receipt"` button visible at the top of the create form (before title field)
2. Tapping opens the file picker; on mobile, `capture="environment"` opens the rear camera
3. After selection, button enters loading state, shows "Reading receipt…"
4. On success, form fields autofill with non-null values from the OCR result. User can still edit before submit.
5. On failure (low confidence OR no fields extracted OR model error), shows a toast: "Couldn't read the receipt — fill it in manually." Form remains usable.
6. Image rejected before upload if > 5 MB or wrong MIME, with a clear error
7. `lib/receipt/prompts.ts` is unit-tested (test the prompt builder + the JSON parser against several fixture responses — happy path, malformed JSON, partial fields)
8. Coverage on `lib/receipt/**` ≥ 80% statements
9. `npm run typecheck` clean, `npm test -- --run` clean, no regressions in M1–M6 tests
10. Cloudflare free tier respected: each call uses ~500–2000 neurons (limit 10,000/day) — README documents the limit

### Pre-stage required by Claude before dispatching Codex M7

1. Add `"ai": { "binding": "AI" }` to `wrangler.jsonc`
2. Run `npx wrangler types --env-interface CloudflareEnv` to regenerate runtime types
3. Verify the Cloudflare account has Workers AI enabled (run `npx wrangler ai models` to list — confirms the binding works)
4. Confirm the chosen vision model identifier is still current (Workers AI catalog drifts)
5. Commit pre-stage as `chore(m7-prep): wrangler AI binding + regenerated types`

### Files Codex may create or modify (M7)

```
wrangler.jsonc                            # Claude pre-stages the AI binding
worker-configuration.d.ts                 # auto-regenerated, Claude pre-stages
lib/receipt/extract.ts                    # NEW
lib/receipt/prompts.ts                    # NEW
app/actions/receipt.ts                    # NEW
components/SnapReceiptButton.tsx          # NEW
components/CreateBillForm.tsx             # MODIFY: add the button + autofill callback
tests/receipt-prompts.test.ts             # NEW
README.md                                 # MODIFY: document the OCR feature + Workers AI usage limits
```

### Out of scope for M7
- Itemized line-item extraction (still equal-split MVP overall)
- Multi-receipt handling (one receipt → one bill)
- Saving the receipt image (no R2/storage — just transient parsing)
- OCR for non-receipts

### Risk register

- **Model accuracy on faded/tiny kopitiam receipts is variable.** Mitigation: graceful manual-entry fallback, confidence threshold.
- **Workers AI free tier (10K neurons/day)** could throttle in heavy demo use. Mitigation: README documents the limit; future paid plan if traffic warrants.
- **Vision LLM latency (2–8s)** could feel slow. Mitigation: clear loading state, optimistic UI showing "Reading receipt…" with the bill icon.
- **Prompt-injection risk** (an attacker submits a "receipt" image containing instructions). Mitigation: we only consume `restaurantName` (string max 120 chars), `totalCents` (integer), `currency` (enum). Even a successful prompt injection has nowhere to go — the JSON parser ignores unexpected fields.

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
| M4 — Public bill + member confirm | ✅ | Codex built it in 8 commits. Receipt + PrintInAnimation + PendingStamp + ParticipantPicker (localStorage with try/catch) + public bill page + MarkPaidForm (optimistic) + member confirm with `<noscript>` fallback. Typecheck clean, 19 tests pass. CSS-only keyframes. Pushed through d9dd9fd. |
| M5 — Dashboard + polling + nudge | ✅ | Codex single commit 7b1134a. DashboardClient with SWR (4s refresh), poll route w/ getBillAdmin (404 on wrong k), 3 columns (Unpaid/Pending/Paid), optimistic Confirm/Reject, NudgeButton with wa.me + clipboard fallback, ConfettiOnSettled with sessionStorage gate, ProgressRing SVG. 23 tests pass (lib/whatsapp 100% coverage). |
| M6 — OG image + README + deploy | ✅ | Deployed to https://kira-kira.cloud8877.workers.dev. Dynamic OG hit CF error 1102 (Worker CPU limit) → swapped to static `public/og.png` (kopi-paper card, 1200×630, 211KB). e2e-check.sh: 6/6 green on prod. 4 real screenshots committed. |
| M7 — Receipt OCR (delight scope) | ✅ | Codex blocked by sandbox writable-roots issue; Claude implemented instead (same pure-impl pattern). SnapReceiptButton with mobile-camera capture, @cf/meta/llama-3.2-11b-vision-instruct, defensive JSON parser, non-destructive autofill. 13 new tests (36 total). Deployed with env.AI binding active. |
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
