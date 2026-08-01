# Direct Google OAuth setup

Create a **Web application** OAuth client in Google Cloud Console and add this
authorised redirect URI:

```text
https://lunchie-munchie.pages.dev/api/auth/google/callback
```

From the project root, run:

```bash
npm run cf:auth:secrets
```

Enter the Google OAuth Client ID, Google OAuth Client Secret, and a newly
generated high-entropy `AUTH_SESSION_SECRET` when prompted. Values are stored
only as Cloudflare Pages Secrets and must not be committed to `.env`.
