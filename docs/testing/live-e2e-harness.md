# Live E2E Harness

This harness follows the Zetaris model: a real Playwright browser drives an already-running app and its real backend. It does not start Vite, mock product APIs, or inject auth tokens.

## Local setup

```bash
cp config/e2e.config.example.json config/e2e.config.local.json
# set the target baseUrl, then capture a user-completed Google session
npm run e2e:auth:setup
npm run test:e2e:live
```

`config/e2e.config.local.json` and `.e2e/` are local-only. Do not commit them.

## Rules

1. Every test prepares what it creates, uses `uniqueName(scope)`, and registers reverse-order cleanup immediately after creation.
2. Cleanup is tolerant and runs after failures; no run may leave posts, reactions, or test sessions behind.
3. Tests are independent and order-free. Shared state is only a manually captured, read-only Google session.
4. Tests use product selectors (`data-testid`, then accessible role) and real UI paths. No API setup or token injection.
5. A write retry must keep the same idempotency key; integration evidence must prove the second request yields no extra D1 event.
6. Config and session state come only from local/CI secrets, never committed source.

The current live case establishes the anonymous privacy and direct-OAuth boundary. Authenticated write flows are added only once their UI supports test-owned content creation and deletion, so no live E2E case pollutes shared data.
