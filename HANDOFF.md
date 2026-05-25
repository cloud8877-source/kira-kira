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

**M1 — Project skeleton + D1 + Drizzle + healthcheck**

Goal: An empty Next.js 16 app boots under `wrangler dev` with a live D1 binding, and a `GET /api/health` route returns `{"ok":true,"result":2}` by running `SELECT 1+1` against D1.

## Definition of done for the current milestone

**Acceptance criteria (all must pass):**
1. `npm run dev` (which wraps `wrangler dev`) starts without error and serves on `localhost:8787`
2. `curl -fsS localhost:8787/api/health` returns `{"ok":true,"result":2}`
3. `drizzle-kit generate` produces a migration SQL file under `drizzle/`
4. `wrangler d1 execute kira-kira-db --local --file=drizzle/0000_*.sql` succeeds
5. `package-lock.json` is committed; `package.json` has exact-pinned versions (no `^`/`~`)
6. `npm audit signatures` passes (no missing/invalid signatures)
7. Repository builds cleanly: `npm run build` (OpenNext build) succeeds

**Verification command:**
```bash
npm run dev &
sleep 5
curl -fsS localhost:8787/api/health | grep -q '"ok":true' && echo "M1 PASS" || echo "M1 FAIL"
kill %1
```

**Install protocol (mandatory — see Supply chain hygiene section):**
```bash
# First install only (no lockfile yet):
npm install --ignore-scripts --package-lock-only   # generate lockfile only
# Inspect package-lock.json for the EXACT versions resolved
# Cross-check resolved package URLs/integrities against current Shai-Hulud IOC lists
npm ci --ignore-scripts                             # actual install, no postinstall
npm audit signatures                                # verify provenance
# Only then run any required postinstall manually after review
```

## Files you may create or modify

```
package.json                     # exact-pinned versions only
package-lock.json                # committed
next.config.ts                   # withOpenNext() wrapped
wrangler.jsonc                   # name, compatibility_date, d1_databases binding "DB", assets binding
drizzle.config.ts                # dialect: sqlite, driver: d1-http (or local equivalent)
tsconfig.json
.dev.vars.example                # if any local-only env needed
db/schema.ts                     # minimal schema for healthcheck — can be empty exports
db/index.ts                      # getDb() with getCloudflareContext, React cache
app/layout.tsx                   # bare html/body, Inter font, light theme stub
app/page.tsx                     # placeholder "Kira-Kira coming soon"
app/api/health/route.ts          # returns {ok, result} from SELECT 1+1
app/globals.css                  # Tailwind directives only at M1
tailwind.config.ts
postcss.config.mjs
.env.example
README.md                        # add "npm run dev" / "npm run deploy" sections
```

Do NOT touch: anything under `app/b/`, `app/created/`, `app/actions/`, `components/`, `lib/`, `tests/`, `scripts/` — those belong to later milestones.

## What was built in previous milestones

> _Running log. Claude updates this between dispatches._

| Milestone | Status | Notes |
|---|---|---|
| M0 — Repo bootstrap | ✅ | Repo at `~/git/gx/kira-kira/`, pushed to https://github.com/cloud8877-source/kira-kira (public). HANDOFF + design spec committed. |
| M1 | 📋 | Briefed above. Ready for Codex dispatch. |
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
