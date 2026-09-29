# LIKHA Arts Club

A responsive public arts-club site with member accounts, a live community chat and a role-based administration area. The frontend is plain HTML, CSS and JavaScript modules; Supabase provides authentication, data, storage and realtime chat.

## Run locally

Use Node.js 18 or newer. No package installation is needed.

```powershell
node server.mjs
```

Open [http://localhost:5173](http://localhost:5173). If that port is busy:

```powershell
$env:PORT = 4173
node server.mjs
```

## Deploy to GitHub Pages

This is a static site and needs no build step. Put the contents of this folder in the repository root, so `index.html`, `assets/`, `src/` and `styles.css` are at the top level. In the repository, open **Settings > Pages**, choose **Deploy from a branch**, select `main` and `/(root)`, then save. The published project URL will include the repository name, for example `https://ACCOUNT.github.io/REPOSITORY/`.

After publishing, add that exact production URL to the Supabase Auth Site URL and allowed redirect URLs. The public pages can render without the database, but membership, chat and admin tools require the Supabase migrations and Auth setup below.

The supplied `config.js` contains the existing Supabase project URL and public publishable key. A publishable key is intended for browser use; never put a service-role key in this file.

## Enable the backend

1. Review and apply the migrations in `supabase/migrations/` in order to the configured Supabase project. Use the Supabase SQL Editor or link the CLI and run `supabase db push`. Migration `202609290001_likha_platform.sql` creates the LIKHA tables, row-level security policies, storage buckets, audit triggers and chat realtime publication. It also attempts a non-destructive import from the existing `artists`, `ateliers` and `artworks` tables when their expected columns are present. Migration `202609290002_official_brand_assets.sql` updates only the previous default logo and cover paths.
2. In Supabase Auth settings, set the local Site URL to `http://localhost:5173` and add it to the allowed redirect URLs. Add the production site origin when deployed. Configure email verification and a working SMTP provider before inviting members.
3. Register at `http://localhost:5173/#/join` using your own email and set your password in the form. Verify the email, then run [`supabase/setup_main_admin.sql`](supabase/setup_main_admin.sql) in the Supabase SQL Editor after replacing its email placeholder with your verified email. Do not share your password or put it in `config.js`.

4. Deploy the account-deletion Edge Function with `supabase functions deploy admin-delete-user`. Configure `SUPABASE_SERVICE_ROLE_KEY` in the Supabase Edge Function secrets settings only. The function verifies the caller as an active Main Admin before deleting any other account.
5. Sign in as Main Admin and review Sub-Admin requests in the admin dashboard. Approve each request and choose its permissions; members can submit requests from `#/access`. Set the approved school email domain in Website Settings, leaving it blank until the club confirms the correct domain.
6. Run the database security tests with `supabase test db`.

The initial Main Admin promotion is intentionally manual: there is no public administrator signup or hard-coded password. The local site already has the Supabase URL and publishable key, but sign-in remains unavailable until the project migrations and Auth settings are applied. Registration, uploads, chat and administrator access depend on that setup.

## Main areas

- Public homepage, Atelier filters, artwork viewer, artist profiles, announcements, About and community links.
- Member registration, email verification, sign-in, password reset and editable member profile.
- Realtime chat with stickers, private image uploads, message reports and moderation.
- Main Admin controls for members, role requests, Sub-Admin permissions, content, homepage copy, theme, branding, social links and the activity log.
- Sub-Admin permissions are independently enforced by database policies for content, chat moderation and member restrictions.

## Project layout

- `index.html`, `styles.css`, `src/`: browser application.
- `config.js`: public Supabase configuration and fallback social URLs.
- `supabase/migrations/`: database schema and access policies.
- `supabase/functions/admin-delete-user/`: protected Auth account deletion.
- `supabase/tests/`: pgTAP security checks.
- `server.mjs`: dependency-free local static server.
