# Local Cloudflare development

## Purpose

`pnpm dev` runs Vite and the legacy local Express server. Use `pnpm dev:pages`
when testing the deployed Cloudflare Pages Functions, D1 binding, R2 binding, and
direct Google OAuth implementation together. Group-state Durable Objects remain a
separate deployed Worker integration and should be verified in preview E2E.

## First-time setup

1. Use Node 22 or newer and install dependencies with `pnpm install`.
2. `.env` is optional: copy `.env.example` only when testing Google Maps. Values
   prefixed with `VITE_` are browser-visible by design.
3. Put the administrator-provided `.dev.vars` next to `package.json` and fill the
   server-only OAuth values. `.dev.vars` is ignored by Git. Do **not** copy
   `.dev.vars.example` over an existing file: that would replace working local
   Google credentials with blank values.
4. In Google Cloud Console, add this authorised redirect URI for the development
   OAuth web client:

   ```text
   http://localhost:8788/api/auth/google/callback
   ```

5. Initialise the local D1 database and seed the verified restaurant catalogue:

   ```bash
   pnpm cf:d1:migrate:local
   pnpm cf:d1:seed:local
   ```

   Catalogue images and the ignored source-photo cache are not copied into
   local R2. `MEDIA_ORIGIN` makes the local Pages runtime read the deployed
   public media service, while all local D1 writes stay isolated. A fresh clone
   therefore seeds the whole verified catalogue without downloading photo
   originals. Remove or change that value to use a staging media service
   instead.

6. Start the Pages runtime:

   ```bash
   pnpm dev:pages
   ```

   Open `http://localhost:8788`. The command is shell-neutral: Wrangler reads
   `MEDIA_ORIGIN` from `.dev.vars`, so it works unchanged in Windows PowerShell.

## Safety boundary

- `--local` uses Wrangler's local D1 database. It does **not** write to production
  `lunchie-db`. Local development does not seed or write the production R2
  catalogue; it only reads the explicitly configured public `MEDIA_ORIGIN`.
- Do not add ad-hoc `--d1` or `--r2` flags to `dev:pages`: `wrangler.toml`
  already maps `DB` and `PHOTOS_R2` to their local counterparts. Overriding the
  bindings creates a different empty local store.
- Never run `pnpm cf:d1:migrate` for ordinary local work; that command targets the
  remote production database.
- Google client secrets and `AUTH_SESSION_SECRET` belong only in `.dev.vars` for
  local Pages Functions, and Cloudflare Pages Secrets for production.
- Values prefixed with `VITE_` are visible to the browser by design.
