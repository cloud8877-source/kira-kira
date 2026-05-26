# Kira-Kira

> _Split bills without the awkward chase._

<p align="center">
  <img src="./docs/screenshots/landing.png" alt="Kira-Kira landing page on iPhone — kopi-paper background, Fraunces serif headline, branded create-bill form" width="320">
</p>

A kopitiam-themed split bill + payment tracker built for the [Krackeddevs Split Bill bounty](https://krackeddevs.com/code/bounty/split-bill-payment-tracker-web-app).

Organizer creates a bill → shares one link in WhatsApp → members tap their name and mark themselves paid → organizer verifies → bill auto-cleans up. No accounts, no friction.

## Live demo

**👉 [kira-kira.cloud8877.workers.dev](https://kira-kira.cloud8877.workers.dev)**

<p align="center">
  <img src="./docs/screenshots/created.png" alt="Success page — two copyable links (admin + public) and a WhatsApp share button" width="320">
  &nbsp;
  <img src="./docs/screenshots/dashboard.png" alt="Organizer dashboard — 25% progress ring, three-column board with Unpaid / Pending verification / Paid, Nudge buttons on unpaid, Confirm/Reject on pending" width="320">
</p>

## What's special

- **Full kopitiam visual system** — Fraunces serif, kopi-tan paper background, animated steam wisps on the hero, brand-consistent from the landing page through to the PDF cover.
- **AI-vision receipt OCR** — snap a photo, the title and total autofill. Cloudflare Workers AI (Mistral Small 3.1 24B vision, Llama 3.2 Vision fallback). Runs at the edge, free tier.
- **End-to-end payment loop** — organizer attaches their QR / bank info up front; members attach a transfer screenshot when paying; admin verifies before confirming. Closes the loop the bounty spec leaves open.
- **7-day lifecycle delete** — settle the bill, download the PDF report, then nuke (or auto-nuke after 7 days). R2 lifecycle rules guarantee no payment screenshot lingers past the retention window.
- **View Transitions API + micro-interactions** — same-origin morphs between routes, staggered pop-in on participant cards, settle-glow on confirmation, all gated by `prefers-reduced-motion`.

## Stack

- **Next.js 16** App Router (React 19, Server Actions)
- **Cloudflare Workers** via `@opennextjs/cloudflare` adapter (edge-deployed, global)
- **Cloudflare D1** (serverless SQLite) + **Drizzle ORM**
- **Cloudflare R2** for receipts, payment QRs, and transfer proofs (7-day lifecycle rules)
- **Cloudflare Workers AI** for receipt OCR (Mistral Small 3.1 24B + Llama 3.2 Vision fallback)
- **Tailwind v4** + **shadcn/ui** + **Zod** + **SWR** + **jspdf** + **canvas-confetti**

## Features

**Core**

- 🧾 Create bills with title, total, due date, description, dynamic participants (1–50)
- 🔗 Two-link sharing model — admin URL to track, public URL to share; secrets stay out of server logs
- 📱 Mobile-first, designed for WhatsApp opens (390×844 first)
- ⚡ Live dashboard via SWR polling (~4-second refresh)
- 💬 Nudge unpaid people — one tap opens WhatsApp pre-filled
- 🎉 Confetti when the bill fully settles

**Bonus**

- 📷 **Receipt OCR** — snap or upload, AI vision autofills title + total
- 💳 **Payment QR / bank info** — organizer-attached, visible to every member on the bill page
- 🧾 **Transfer proofs** — members attach a screenshot when paying; admin-only viewing (`/api/transfers/[billId]/[pid]` requires admin secret)
- 📄 **PDF settlement report** — client-side `jspdf`, multi-page, cover + participants table + receipt + QR + every transfer proof
- 🗑️ **Lifecycle delete** — nuke now, or auto-delete after 7 days; R2 cascade across all three image prefixes
- ✨ **View Transitions API** — same-origin morphs between routes
- ☕ **Animated steam-rising hero** — three staggered wisps over an inline-SVG kopi cup
- 🎨 **Custom OG share card** so WhatsApp previews look beautiful
- 🪅 **Micro-interactions** — staggered participant pop-ins, settle-glow on confirm, all `prefers-reduced-motion`-aware

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
| 10 | Optional Bonus Features | Receipt OCR (Workers AI), payment QR + bank info, transfer proofs, PDF report, 7-day lifecycle delete, View Transitions API, animated steam hero, micro-interactions, OG card, confetti, live polling, nudge-on-WhatsApp | ✅ Bonus |
| 11 | Minimum Acceptance Criteria | `scripts/e2e-check.sh` passes against deployed URL | ✅ |

## Headline flows

### Receipt OCR

Tap **Snap receipt** at the top of the create-bill form. The image is stored to R2 and parsed in parallel through Workers AI. The OCR result autofills the title + total non-destructively. The photo also shows as a thumbnail on the public bill and admin dashboard so the WhatsApp group can verify.

Primary model: `@cf/mistralai/mistral-small-3.1-24b-instruct`. Fallback on a vision error: `@cf/meta/llama-3.2-11b-vision-instruct`.

### Payment methods + transfer proofs

The organizer attaches a payment QR (TNG, Boost, DuitNow, Maybank QR) and/or bank info on the create-bill form. Members see both above the "Mark as paid" form — no more group-chat scrambles for the account number.

When a member marks themselves paid, they attach the transfer screenshot. The organizer sees the thumbnail on the Pending row and can verify before tapping Confirm. **Transfer proofs are admin-only** — sensitive bank info doesn't leak between members.

### Settlement → PDF → delete

Once everyone is paid, a green **"Mark bill as settled"** button appears on the dashboard. The settlement modal has three actions:

1. **Download PDF report** — client-side `jspdf`, multi-page: branded cover, participants table, receipt image, payment QR, every transfer proof.
2. **Delete everything now** — bill row + cascade participants + R2 cascade across `receipts/<billId>/`, `payments/<billId>/`, `transfers/<billId>/`. The bill URL returns 404 after.
3. **Auto-delete in 7 days** — sets `expires_at`. A lazy hook in `lib/bills/read.ts` runs the same cascade on the next read after the TTL.

R2 lifecycle rules on all three prefixes hard-expire images after 7 days regardless, so payment screenshots never linger.

## Running locally

```bash
nvm use # node 22
npm ci --ignore-scripts
npx wrangler d1 create kira-kira-db  # one time; copy database_id into wrangler.jsonc
npx wrangler r2 bucket create kira-kira-uploads  # one time
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
npm test            # vitest, 57 unit tests across 10 files
npm run typecheck   # tsc --noEmit, zero errors
./scripts/e2e-check.sh https://kira-kira.cloud8877.workers.dev
```

## Architecture

- **Database**: 2 tables (`bills`, `participants`) — see [`db/schema.ts`](./db/schema.ts)
- **R2 layout**: 3 prefixes (`receipts/<billId>/`, `payments/<billId>/`, `transfers/<billId>/<participantId>/`), each with a 7-day lifecycle rule
- **Server actions** in `app/actions/` are thin wrappers around pure-function impls in `lib/{bills,payments,r2,ai}/` — keeps the impls unit-testable without a Workers runtime
- **Admin secret**: 16 random bytes, base64url, stored SHA-256 hashed, verified with `crypto.subtle.timingSafeEqual` (no `===` on secrets, no timing leaks)
- **Money**: always integer cents in DB and in transit
- **Status flow**: `unpaid` → `pending` (member self-marked, optional transfer proof) → `paid` (organizer verified)
- **Lifecycle delete**: lazy on read via `lib/bills/read.ts`'s TTL hook, plus explicit "delete now" from the settlement modal, plus R2 lifecycle rules as the final backstop
- **View transitions**: `lib/view-transitions.ts` wraps `document.startViewTransition` for same-origin morphs, with graceful fallback when the API is unsupported

## License

MIT

---

Built with Claude Code + Codex.
