# Kira-Kira

> _Split bills without the awkward chase._

<p align="center">
  <img src="./docs/screenshots/landing.png" alt="Kira-Kira landing page on iPhone — kopi-paper background, Fraunces serif headline, branded create-bill form" width="320">
</p>

A kopitiam-themed split bill + payment tracker built for the [Krackeddevs Split Bill bounty](https://krackeddevs.com/code/bounty/split-bill-payment-tracker-web-app).

Organizer creates a bill → shares one link in WhatsApp → members tap their name and mark themselves paid → organizer verifies. No accounts, no friction.

## Live demo

**👉 [kira-kira.cloud8877.workers.dev](https://kira-kira.cloud8877.workers.dev)**

<p align="center">
  <img src="./docs/screenshots/created.png" alt="Success page — two copyable links (admin + public) and a WhatsApp share button" width="320">
  &nbsp;
  <img src="./docs/screenshots/dashboard.png" alt="Organizer dashboard — 25% progress ring, three-column board with Unpaid / Pending verification / Paid, Nudge buttons on unpaid, Confirm/Reject on pending" width="320">
</p>

## Stack

- **Next.js 16** App Router (React 19, Server Actions)
- **Cloudflare Workers** via `@opennextjs/cloudflare` adapter (edge-deployed, global)
- **Cloudflare D1** (serverless SQLite) + **Drizzle ORM**
- **Tailwind v4** + **shadcn/ui** + **Zod** + **SWR**
- **canvas-confetti** (because every settled bill deserves celebration)

## Features

- 🧾 Create bills with title, total, due date, description, and dynamic participant list (1–50 people)
- 📷 **Snap a receipt** and autofill the title + total via Cloudflare Workers AI vision (free tier, runs at the edge)
- 🔗 Two-link sharing model: admin link to track, public link to share — secret in URL fragment, never server logs
- 📱 Mobile-first, designed for WhatsApp opens
- ⚡ Live dashboard via SWR polling (4-second refresh)
- 💬 Nudge unpaid people with one tap — auto-opens WhatsApp with the right text
- 🎉 Confetti when fully settled
- 🎨 Custom OG share card so WhatsApp previews look beautiful

### Receipt OCR + preview (bonus)

Tap **Snap receipt** at the top of the create-bill form to capture or upload a photo of a restaurant receipt. The image is stored to Cloudflare R2 *and* parsed in parallel through Workers AI (`@cf/mistralai/mistral-small-3.1-24b-instruct` primary, `@cf/meta/llama-3.2-11b-vision-instruct` fallback). The OCR result autofills the title + total non-destructively; the photo itself shows as a thumbnail and is included on both the public bill page (`/b/[id]`) and the organizer dashboard for everyone in the WhatsApp group to verify.

### Payment methods + transfer proofs (bonus)

When creating a bill, the organizer can attach a **payment QR code** (TNG / Boost / DuitNow / Maybank QR) and/or type **bank info** (e.g. "Maybank 1234567890 · Aisyah binti Ahmad"). Members see both on the bill page right above the "Mark as paid" form — no more group-chat scrambles for the account number.

When a member marks themselves paid, they can attach the actual **transfer screenshot** alongside the existing payment-reference note. The organizer's dashboard shows the screenshot thumbnail on the Pending row so they can verify before tapping Confirm. **Transfer proofs are admin-only** (sensitive bank info shouldn't leak between members) — the `/api/transfers/[billId]/[pid]` route requires the admin secret.

### Settlement + PDF report + lifecycle delete (bonus)

Once every participant is paid, a green **"Mark bill as settled"** button appears on the dashboard. Tapping it opens a settlement modal with three actions:

1. **Download PDF report** — client-side generation via `jspdf` produces a multi-page PDF with bill metadata, participants table, the receipt image, the payment QR, and every transfer proof. One tap, downloads to the device.
2. **Delete everything now** — full nuke: bill row + cascade participants + R2 cascade across `receipts/<billId>/`, `payments/<billId>/`, and `transfers/<billId>/`. The bill URL returns 404 after.
3. **Auto-delete in 7 days** — sets `expires_at`. On the next read after the TTL passes, a lazy hook in `lib/bills/read.ts` runs the same cascade.

**R2 lifecycle rule** (active on `receipts/` + `payments/` + `transfers/` prefixes) hard-expires all images after 7 days regardless of whether the bill is explicitly deleted, so sensitive payment screenshots never linger past the retention window.

Free Workers AI tier allows ~10,000 neurons/day; a vision pass typically costs 500–2,000 neurons. R2 free tier (10 GB storage, zero egress) covers any reasonable bounty/demo traffic.

## Bounty requirements coverage

| # | Requirement | Where it lives | Status |
|---|-------------|----------------|--------|
| 1 | Bill Creation | `components/CreateBillForm.tsx` + `app/actions/bills.ts` | ✅ |
| 2 | Shareable Bill Page | `app/b/[id]/page.tsx` + branded OG card at `/og.png` | ✅ |
| 3 | Member Payment Confirmation | `app/b/[id]/me/[pid]/page.tsx` + `app/actions/payments.ts` | ✅ |
| 4 | Organizer Dashboard | `app/b/[id]/admin/page.tsx` + `components/DashboardClient.tsx` | ✅ |
| 5 | Payment Progress Display | `components/ProgressRing.tsx` + 3-column board | ✅ |
| 6 | Mobile-Friendly Design | Tailwind mobile-first, all components verified at 390×844 | ✅ |
| 7 | Creative Theme / Branding | Kira-Kira / Kopi-Susu visual system | ✅ |
| 8 | GitHub Repository | https://github.com/cloud8877-source/kira-kira (public) | ✅ |
| 9 | Short Project Description | This README | ✅ |
| 10 | Optional Bonus Features | OG share card, live polling, nudge-on-WhatsApp, confetti, animated receipt, **receipt OCR via Workers AI** | ✅ Bonus |
| 11 | Minimum Acceptance Criteria | `scripts/e2e-check.sh` passes against deployed URL | ✅ |

## Running locally

```bash
nvm use # node 22
npm ci --ignore-scripts
npx wrangler d1 create kira-kira-db  # one time; copy the database_id into wrangler.jsonc
npm run db:generate
npm run db:apply:local
npm run dev      # next dev on port 8787 with local D1 emulation
```

Open http://localhost:8787.

## Deploying

```bash
npm run db:apply:remote  # apply migrations to production D1
npm run deploy           # opennextjs-cloudflare build + wrangler deploy
```

## Testing

```bash
npm test            # vitest, ~ 23 unit tests
npm run typecheck   # tsc --noEmit
./scripts/e2e-check.sh https://kira-kira.cloud8877.workers.dev
```

## Architecture

- **Database**: 2 tables (`bills`, `participants`) — see [`db/schema.ts`](./db/schema.ts)
- **Server actions** in `app/actions/` are thin wrappers around pure-function impls in `lib/{bills,payments}/`
- **Admin secret**: 16 random bytes, base64url, stored SHA-256 hashed, verified with `crypto.subtle.timingSafeEqual`
- **Money**: always integer cents in DB and in transit
- **Status flow**: `unpaid` → `pending` (member self-marked) → `paid` (organizer verified)

## License

MIT

---

Built with Claude Code + Codex.
