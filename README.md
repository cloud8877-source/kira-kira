# Kira-Kira

> _Split bills without the awkward chase._

A kopitiam-themed split bill + payment tracker.
Organizer creates a bill, shares one link in WhatsApp, members tap their name and mark paid, organizer verifies.
No accounts, no friction — just settle.

Built for the [Krackeddevs split bill bounty](https://krackeddevs.com/code/bounty/split-bill-payment-tracker-web-app).

## Status

🚧 In active build — see [`HANDOFF.md`](./HANDOFF.md) for the current milestone and [`docs/superpowers/specs/2026-05-25-kira-kira-design.md`](./docs/superpowers/specs/2026-05-25-kira-kira-design.md) for the full design.

## Stack

- **Next.js 16** (App Router, React 19, Server Actions)
- **`@opennextjs/cloudflare`** → Cloudflare **Workers**
- **Cloudflare D1** (serverless SQLite) + **Drizzle ORM**
- **Tailwind** + **shadcn/ui** + **Zod** + **SWR**

## Local development

```bash
npm install
npm run dev    # wraps `wrangler dev` with local D1 emulation
```

Visit `http://localhost:8787`.

## Deploy

```bash
npm run deploy  # opennextjs-cloudflare build && wrangler deploy
```

## Demo

> Live URL coming after M6 → `https://kira-kira.<account>.workers.dev`

## License

MIT
