# TypeSafe AI server setup

The Node/Express integration uses `@typesafe-ai/sdk` and the server-only factory
`createTypeSafeClient` in `server/typesafe.ts`. The factory loads the root `.env`
and reads `TYPESAFE_API_KEY`. Never import this module from `client/`.

1. Set `TYPESAFE_API_KEY` in the root `.env` (already excluded from Git).
2. Restart the development server after changing the key.
3. Run `npm run check:typesafe` from the repository root. This makes one small,
   billable API request using synthetic text; it does not send application data.

The client uses the official API, a 30-second timeout, no automatic retries, and
disabled SDK logging. It is created on demand, so an absent key does not prevent
the app from starting. The check prints only success/failure, never the key.

This prepares server-side calls; no UI feature or public API route invokes AI yet.
Cloudflare Pages/Workers deployment needs a separate secret binding and adapter;
the local `.env` is not uploaded or deployed by this setup.

Official SDK: https://github.com/typesafe-ai/typesafe-sdk-js
