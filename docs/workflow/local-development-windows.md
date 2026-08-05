# Windows local development

Use this when you already have the project folder on `main` and have received a
team `.dev.vars` file.

1. Open PowerShell in the project root. `package.json` and `.dev.vars` must be
   at the same level. Do not run `cp .dev.vars.example .dev.vars`: it can replace
   the supplied Google OAuth credentials with blank values.

2. Confirm prerequisites and install dependencies:

   ```powershell
   node --version      # Node 22 or newer
   pnpm --version
   pnpm install --frozen-lockfile
   ```

   If `pnpm` is not installed, run `npm install --global pnpm@10` once, open a
   new PowerShell window, then continue. Do not share or commit `.dev.vars`.

3. Create the isolated local D1 database and seed it:

   ```powershell
   pnpm cf:d1:migrate:local
   pnpm cf:d1:seed:local
   ```

   These commands only modify Wrangler's local D1 state. They do not access the
   production database or download the source photo cache.

4. Start Pages Functions, D1, R2 bindings, and the frontend together:

   ```powershell
   pnpm dev:pages
   ```

5. Open <http://localhost:8788> in Chrome. Keep the PowerShell window open while
   testing; press `Ctrl+C` there to stop the server.

For local Google login, the OAuth client must have this authorised redirect URI:

```text
http://localhost:8788/api/auth/google/callback
```

If port 8788 is already in use, stop the existing local server before retrying.
Google OAuth is supported on `localhost`; use the deployed HTTPS site rather
than a LAN IP address when testing from another device.
