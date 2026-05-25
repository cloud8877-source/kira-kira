# Kira-Kira — Codex Build Handoff

## Mission

Build a Malaysian-kopitiam-themed split bill tracker. Organizer creates a bill,
gets an admin link + a public WhatsApp-shareable link; members tap their name
and mark paid; organizer verifies. Stack is locked: Next.js 15 (App Router) +
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

## Current milestone

> _Set per dispatch._ Initial value: **M1 — Project skeleton + D1 + Drizzle + healthcheck**

## Definition of done for the current milestone

> _Inlined per dispatch from the spec's acceptance criteria + verification command._

## Files you may create or modify

> _Inlined per dispatch from the spec's file list._

## What was built in previous milestones

> _Running log. Claude updates this between dispatches._

| Milestone | Status | Notes |
|---|---|---|
| M0 — Repo bootstrap | ✅ | Repo at `~/git/gx/kira-kira/`, pushed to GitHub. |
| M1 | ⏳ | Pending Codex dispatch. |
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
