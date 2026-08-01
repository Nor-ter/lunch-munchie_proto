# Cloudflare deployment flow

## Developer flow

1. Create a feature branch and open a pull request.
2. Review and merge into `main`.
3. Cloudflare Pages deploys the web application from its Git integration.
4. If a change touches `workers/**` or `wrangler.state.toml`, GitHub Actions deploys
   `lunchie-munchie-state` after the merge.

Developers need GitHub repository and preview Access permissions only. They do not
need Cloudflare dashboard membership or access to stored production secrets.

## Production D1 changes

Database migrations are deliberately not run on every push. Add a migration under
`migrations/`, include it in a pull request, then the repository owner runs the
**Migrate Lunchie D1** workflow and types `APPLY`. The workflow currently permits
only GitHub user `JP5635` to execute it. This prevents an accidental production
schema or data change from a normal code merge.

## One-time repository secrets

Set the following GitHub Actions secrets in the repository. Never place these values
in source code, `.env` files, or pull-request text.

| Secret | Purpose | Minimum Cloudflare token permissions |
| --- | --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Account `8db6a96eeae5192386dd3fa838ec315b` | Not a token; the account ID is non-secret configuration. |
| `CLOUDFLARE_WORKER_DEPLOY_TOKEN` | Automatic deployment of `lunchie-munchie-state` | Account: Workers Scripts/Edit; Account Settings/Read. Add only the read permission required by Wrangler for existing bindings. |
| `CLOUDFLARE_D1_MIGRATIONS_TOKEN` | Owner-approved D1 migration workflow | Account: D1/Edit; Account Settings/Read. |

When repository-admin access is available, additionally protect the `production`
GitHub Environment with required reviewers and move both deployment secrets there.

## Secret changes

Google OAuth credentials and session secrets are changed by an owner through the
Cloudflare Pages project. A secret value cannot be read back from Cloudflare after it
has been stored; rotating a value means replacing it and validating login in preview
before production.
