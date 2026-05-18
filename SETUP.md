# Stax — Setup Guide

This file walks you through everything that has to happen outside the codebase
to get Phase 0 running locally and on Vercel. Plan on ~30–45 minutes.

You only do this once.

---

## 1. Move the project somewhere permanent

Right now the project lives inside this conversation's outputs folder. Move it
to your normal dev folder, for example:

```bash
mv "/Users/kimberlyvillalta/Library/Application Support/Claude/local-agent-mode-sessions/.../outputs/stax" ~/Code/stax
cd ~/Code/stax
```

Adjust the destination to wherever you keep code (`~/Documents/Code`, `~/dev`, etc.).

---

## 2. Install Node.js (if you don't have it)

Stax targets Node 20+.

```bash
node -v   # Should print v20.x or v22.x
```

If you don't have Node, the easiest path on macOS is via Homebrew:

```bash
brew install node@20
```

---

## 3. Install the project dependencies

```bash
cd ~/Code/stax
npm install
```

This installs Next.js, Tailwind, the Supabase SDKs, the Anthropic SDK, etc.

---

## 4. Create accounts (free tiers, takes ~10 minutes total)

You'll need four free accounts. Use the same email for all of them so it's easy
to keep track.

### a. GitHub — for version control
- Go to https://github.com/signup if you don't already have one.
- Once logged in, create a new **private** repository named `stax`. Don't
  initialize it with anything — we'll push the existing folder up.

### b. Supabase — database, auth, storage
- Go to https://supabase.com → "Start your project" → sign in with GitHub.
- Create a new project:
  - Name: `stax`
  - Database password: generate a strong one and **save it** in your password
    manager. You will need it later.
  - Region: pick whatever's closest to you (West US 2 if you're in California).
- Wait ~2 minutes for the project to provision.

### c. Vercel — hosting
- Go to https://vercel.com → "Sign Up" → sign in with GitHub.
- We'll connect Vercel to the GitHub repo in step 6.

### d. Anthropic — Claude API
- Go to https://console.anthropic.com → sign up.
- Add a payment method (you can set a $20/month spend cap in Settings →
  Limits to be safe). At 5–10 users, real cost should be well under that.
- Settings → API Keys → Create Key → name it `stax-dev` → copy and save it.
  **You won't be able to see it again.**

---

## 5. Configure environment variables locally

In the Stax folder, copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Now fill in the values:

### Supabase URL + anon key
- In Supabase, open your project → **Project Settings** → **API**.
- Copy **Project URL** → paste as `NEXT_PUBLIC_SUPABASE_URL`.
- Copy **anon / public** key → paste as `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Copy **service_role** key → paste as `SUPABASE_SERVICE_ROLE_KEY`.
  > This one is server-only. Treat it like a password.

### Anthropic key
- Paste the key from step 4d as `ANTHROPIC_API_KEY`.

### Site URL
- Leave `NEXT_PUBLIC_SITE_URL=http://localhost:3000` for local dev.

---

## 6. Run the first migration

In Supabase, go to **SQL Editor** → **New query** → open the file
`supabase/migrations/0001_init_auth_roles.sql` from this project, paste the
entire contents, and click **Run**.

You should see "Success. No rows returned." It creates:

- `app_users`, `profiles`, `user_equipment`, `user_preferences`
- `coach_assignments`, `invites`, `audit_log`
- The `is_admin()` and `is_my_coachee()` helper functions
- Row-Level Security policies on everything

---

## 7. Bootstrap your admin account

Stax has no public sign-up — but for Phase 0 we'll temporarily allow direct
sign-up so you can create the first account. Once you're admin, all future
users will only be able to join through invites.

1. **Enable email signups temporarily** (Supabase → Authentication →
   Providers → Email → make sure "Enable Email provider" is on; you can leave
   "Confirm email" off for now).
2. **Sign yourself up via Supabase Studio** to skip needing the auth UI:
   - Supabase → Authentication → Users → "Add user" → "Create new user"
   - Email: `kimberjam@gmail.com`
   - Auto-confirm: yes
   - Set a password
3. **Promote yourself to admin**:
   - Supabase → SQL Editor → run:
     ```sql
     update public.app_users
     set role = 'admin', display_name = 'Kim'
     where email = 'kimberjam@gmail.com';
     ```

---

## 8. Start the app locally

```bash
npm run dev
```

Open http://localhost:3000 — you should see the Stax Phase 0 landing page
with the logo and a ready/pending checklist.

---

## 9. Push to GitHub

```bash
git init
git add .
git commit -m "Stax: Phase 0 scaffold"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/stax.git
git push -u origin main
```

---

## 10. Deploy to Vercel

- Vercel dashboard → "Add New" → "Project" → import the `stax` repo from GitHub.
- Framework preset: Next.js (auto-detected).
- Environment variables: paste in the same four values you put in `.env.local`,
  plus update `NEXT_PUBLIC_SITE_URL` to your eventual Vercel URL
  (e.g., `https://stax.vercel.app`).
- Click **Deploy**.

Two minutes later you'll have an HTTPS URL you can open on your phone. Add it
to your home screen to see it as a PWA-style app.

---

## 11. Configure Supabase for the deployed app

Once deployed, go back to Supabase → **Authentication** → **URL Configuration**:

- **Site URL**: `https://YOUR-DEPLOY.vercel.app`
- **Redirect URLs**: add `https://YOUR-DEPLOY.vercel.app/**` and
  `http://localhost:3000/**`.

This is required for password reset emails and invite redemption later.

---

## You're done with setup. What's next?

When you're ready, ping me and I'll start **Phase 1: auth + invites +
onboarding screens**. That phase will:

1. Add a sign-in page and password-reset flow.
2. Add the invite-acceptance page so non-admins can join.
3. Build the onboarding wizard (profile → goal → schedule → equipment →
   preferences).
4. Lock down the Supabase email-signup toggle so only invites work.

---

## Troubleshooting

- **`npm install` fails** → make sure Node 20+ is installed (`node -v`).
- **"Invalid API key" from Supabase** → double-check you copied the
  `anon` key (not the `service_role` key) into `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Page is blank** → open the browser console; most issues at this stage are
  env vars missing or typo'd.
- **Anthropic 401** → confirm the key has no trailing whitespace.
