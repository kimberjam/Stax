# Stax

Private, invite-only AI hypertrophy coaching for family and friends.

> **Status:** Phase 0 scaffold complete. Phase 1 (auth + onboarding) is next.

## Stack

- Next.js 14 (App Router, TypeScript)
- Tailwind CSS with Stax brand tokens
- Supabase (Postgres + Auth + Storage + RLS)
- Anthropic Claude API (program generation + coach chat)
- Vercel hosting + Vercel Cron for weekly progression

See `SETUP.md` for the one-time setup walkthrough.

## Project layout

```
stax/
├── public/                  Logo + static assets
├── src/
│   ├── app/                 Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx         Phase 0 landing page
│   │   └── globals.css
│   ├── components/          UI components
│   │   └── stax-logo.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts    Browser Supabase client
│   │   │   └── server.ts    Server + service-role clients
│   │   └── utils.ts         cn() helper
│   └── middleware.ts        Refreshes Supabase session on every request
├── supabase/
│   └── migrations/
│       └── 0001_init_auth_roles.sql
├── .env.example
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Day-to-day

```bash
npm install
npm run dev        # → http://localhost:3000
npm run typecheck
npm run lint
```

Refer to the full PRD (`Hypertrophy_Coach_PRD.docx` outside this folder) for
the build roadmap, schema decisions, and AI prompt design.
