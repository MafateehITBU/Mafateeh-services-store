# Mafateeh Store — Project Memory

Read this file before starting any task. Update it when a decision changes. The phase-by-phase history is in `docs/CHANGELOG.md`. Do not put secrets, passwords, or connection strings in either file.

## Decisions

- One Next.js App Router app. English is LTR and Arabic is RTL. The header stays `dir=ltr`.
- Stay on Prisma 7.10.1. Do not run bare `npx prisma`, and do not upgrade to the Prisma 8 release candidate.
- Uploaded images stay in PostgreSQL as data URLs. Public pages receive `/media/<kind>/<id>?v=<updatedAt>` and do not load the base64 column in list queries. `/media` stays outside the language redirect.
- Customers sign in with a 6-digit email code. Administrators use a password. Sessions carry `sessionVersion` and stop working when credentials or status change.
- Do not start checkout or MEPS until that work is requested.
- `TRUSTED_PROXY_HEADER` stays empty unless the app is behind a proxy you trust. Forwarded addresses are ignored until it is set.
- The Content-Security-Policy allows `unsafe-eval` only while `next dev` is running. Production script sources stay `'self'` and `'unsafe-inline'`.
- `SITE_URL` is required for canonical links. Production also requires `DATABASE_URL`, `SESSION_SECRET` of at least 32 characters, and the SMTP settings.
- `public/sw.js` stays. It replaces an old browser worker with one that does not intercept requests. Deleting it can make an already registered worker reload the page forever.
- Content that still needs a product decision is listed in `docs/DECISIONS-NEEDED.md`.

## Where future work goes

- Checkout and MEPS payment stay unbuilt. Order status and loyalty crediting already exist for orders created by other means.
- New dashboard images go through `src/server/media/process-image.ts` before they are stored. Existing rows are optimized only by `npx tsx scripts/optimize-images.ts`.
- Customer sign-in lives in `src/server/auth/customer-otp.ts`. Administrator sign-in lives in `src/server/admin/login.ts`.
- Request limits live in `src/server/security/rate-limit.ts`. Origin checks live in `src/server/security/same-origin.ts`.
- Slug changes are recorded in `ServiceSlugHistory` and `CategorySlugHistory`. The proxy sends a 301 when an old public link is requested.
