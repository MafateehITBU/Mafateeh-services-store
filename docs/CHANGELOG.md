# Mafateeh Store — Changelog

This file keeps the phase-by-phase history that used to live in `PROJECT_MEMORY.md`. Current decisions and the place for future work stay in `PROJECT_MEMORY.md`.

## Phase 7

Production startup now checks `DATABASE_URL`, `SESSION_SECRET`, `SITE_URL`, and the SMTP settings and stops with a clear message when one is missing. The proxy no longer continues when `SESSION_SECRET` is missing. Customer mail uses a pooled transport. Audit-log failures are logged and do not hide a successful change. Unused admin OTP, mailer, placeholder, and email sign-in files were removed. `public/sw.js` stays because removing it can reload-loop a browser that already registered the old worker. CI runs lint, typecheck, tests, Prisma checks, a secret scan, and the production build.

# Mafateeh Store — Project Memory

Read this file before starting any task. Update it after every change. Record created, modified, and deleted files, architectural decisions, and where future work belongs. Do not put secrets, passwords, or connection strings in this file.

This file is committed so every coding agent shares the same project history. Do not put secrets in it.

## 1. Project overview

Mafateeh Store is a bilingual e-commerce platform for Mafateeh, inspired by the shopping experience of linkin.sa. It will include an English and Arabic storefront, passwordless email OTP, carts, orders, MEPS payments, reviews, and an admin dashboard.

The application is one Next.js app. There is no separate Express backend, and no MongoDB, Firebase, or Supabase.

Current phase: the public browsing storefront is implemented, and the admin Homepage Content page is a visual builder with one global block order. Category cards can add a service to a browser cart. Customer email OTP, the database cart, checkout, and the MEPS gateway are not implemented. See sections 25, 28, 29, and 32.

## 2. Technology stack

Verified on 2 November 2026.

- Node.js v22.19.0
- npm 10.9.3
- Next.js 16.4.3, App Router, Turbopack, Cache Components, Partial Prefetching
- React 19.3.0 and React DOM 19.3.0
- TypeScript 5.9.3
- Tailwind CSS 4.3.3 with `@tailwindcss/turbopack` 4.3.3
- ESLint 9.39.5 and `eslint-config-next` 16.4.3
- PostgreSQL. Docker Compose still requests PostgreSQL 16. The database that accepted the migration is PostgreSQL 18.1, database name `mafateeh_store`, on localhost port 5432.
- Prisma ORM 7.10.1, `@prisma/client` 7.10.1, `@prisma/adapter-pg` 7.10.1
- `pg` 8.23.1 and `@types/pg` 8.23.1
- Zod 4.6.7
- React Hook Form 7.91.0
- Lucide React 1.66.0
- `server-only` 0.0.1
- `dotenv` 18.0.9, used by the Prisma CLI config and the generate script only
- `next-intl` 4.14.9
- `jose` 6.2.15, used to sign the administrator session cookie
- `nodemailer` 10.3.1 and `@types/nodemailer` 8.0.2
- `tsx` 4.23.15, used only by `npm run admin:bootstrap`
- TipTap 3.32.2 (`@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, and the extensions listed in section 22) for service descriptions

Do not upgrade Prisma. `npm view prisma dist-tags` showed `latest` as the Prisma 8 release candidate. Use the local `prisma` binary, the npm scripts, or `npx prisma@7`. Never run bare `npx prisma`.

## 3. Architecture and folder structure

```text
src/
  app/
    [locale]/          Locale layout, temporary home, and localized not-found
    api/categories/    Public category tree. Unprefixed because the proxy skips /api
    not-found.tsx      Root fallback with its own html and body
  components/
    ui/                Buttons, overlay, empty state, and other primitives
    layout/            Header, footer, language switcher, logo, and shell
    storefront/        Menu, search, account, and cart presentation
    dashboard/         Admin shell, tables, and login form
  features/
    auth/              Customer email sign-in is still a placeholder. Administrator OTP lives in src/server/admin.
    categories/        Public category query
  i18n/                next-intl routing, navigation, and request config
  messages/            en.json and ar.json
  config/              Public site facts and WhatsApp URL check
    services/
    cart/
    orders/
    reviews/
    users/
  lib/
    env.ts             Server environment validation
    prisma.ts          Prisma Client singleton
    utils.ts           Shared helpers such as cn()
  server/              Server-only data access. Put transactions here.
  hooks/               Client hooks
  types/               Shared TypeScript types
  validations/         Zod schemas
prisma/
  schema.prisma        Source of truth for the relational model
  migrations/          Applied SQL migrations
public/
  images/
  icons/
scripts/
  generate-prisma.mjs
```

Future work belongs in these places:

- Routes and layouts: `src/app`.
- Schema changes: `prisma/schema.prisma`, then `npm run db:migrate`. Do not use `db push`.
- Queries and multi-row changes: `src/server` and `src/features/<feature>`. Import `prisma` only from server code.
- Cart-to-order conversion and loyalty balance updates must use `prisma.$transaction`.
- Form schemas: `src/validations`, with Zod. React Hook Form comes with the forms.
- Icons: Lucide React.
- Storefront UI: `src/components/storefront`.
- Dashboard UI: `src/components/dashboard`.
- Locale routes, dictionaries, and the public category query are in place. Do not add Google Fonts or `next/font/google`.

Before changing Next.js behavior, read the matching guide in `node_modules/next/dist/docs/` and `AGENTS.md`.

## 4. Important files and their responsibilities

- `package.json` — scripts and pinned versions. Package name is `mafateeh-services-store`.
- `next.config.ts` — Cache Components, Partial Prefetching, Prisma server packages, and the `next-intl/config` alias. The next-intl plugin is not imported because it loads a native SWC binding that Windows Application Control blocks on this machine.
- `src/proxy.ts` — Next.js 16 proxy. Named `proxy`, not `middleware`. Locale routing skips `api`, `trpc`, `_next`, `_vercel`, and files with extensions. `/admin` is handled before next-intl, so it is not redirected to `/en/admin`. Missing or invalid admin session cookies redirect to `/admin/login`. Role checks still happen in server code, not in the proxy.
- `prisma/schema.prisma` — 26 models. Generator output remains `src/generated/prisma`.
- `prisma.config.ts` — Prisma 7 CLI config. Unchanged in phase 2. Not part of the Next.js bundle.
- `prisma/migrations/20261102082022_init/migration.sql` — initial migration, applied locally.
- `prisma/migrations/migration_lock.toml` — provider `postgresql`.
- `src/lib/env.ts` — Zod validation for server variables. The only module that should read secret `process.env` values.
- `src/lib/prisma.ts` — Prisma Client singleton with `PrismaPg`. Marked `server-only`.
- `docker-compose.yml` — PostgreSQL 16 definition for machines that use Docker. It was not the server used for this migration.
- `.env.example` — committed `DATABASE_URL` template and an empty `NEXT_PUBLIC_WHATSAPP_URL`.
- `.env` — local and gitignored. The WhatsApp variable was added empty.
- `README.md` — setup commands, schema notes, and `/en` / `/ar` routes.
- `src/config/site.ts` — public Mafateeh contact facts. Missing legal and social URLs stay null or empty and are hidden.
- `src/features/categories/get-public-categories.ts` — active categories with the locale translation. Database failures return an empty tree and `unavailable: true`, with no error text.
- `src/features/auth/prepare-email-sign-in.ts` — returns `pending_integration`. The authentication phase replaces this and must not claim a code was sent.

## 5. Database configuration

- Database name: `mafateeh_store`.
- Connection succeeded on 2 November 2026. Server version reported by PostgreSQL: 18.1. Schema `public`. 26 business tables plus `_prisma_migrations`.
- `prisma migrate status`: database schema is up to date. Migration `20261102082022_init` finished.
- Docker is still not installed, and `psql` is not on PATH. The live server was reached through the `pg` driver and `DATABASE_URL`.
- Credentials stay in gitignored `.env` and the local Compose file. Never prefix `DATABASE_URL` with `NEXT_PUBLIC_`.
- Do not store passwords, plaintext OTP codes, card numbers, CVV codes, or cardholder secrets. Payment JSON metadata is not a place for card data. Audit JSON is not a place for secrets or OTP hashes.

### Schema decisions

- Primary keys are UUIDs.
- Money is `Decimal(12, 3)`, not float. Three decimal places cover Jordanian dinar fils. Currency is `VarChar(3)` so PostgreSQL does not blank-pad a `char(3)`.
- There is no default currency. The application must set an ISO 4217 code.
- Email is unique and must be lowercased in application code before insert. The unique index is case-sensitive.
- `EmailOtp` is keyed by email, not by user, because a first login happens before the user row exists. `codeHash` stores a hash.
- Category parent delete is `RESTRICT`, so deactivation (`isActive = false`) keeps the tree.
- A category or service is not hard-deleted when historical orders, reviews, payments, or loyalty rows point at it. Those foreign keys are `RESTRICT`. Cart and wishlist rows cascade.
- Order line names and prices are snapshots. Do not add a stored average rating or review count on `Service`. Calculate both from `Review` rows with status `APPROVED`.
- `ServiceTranslation.detailedDescription` is TipTap JSON (`jsonb`).
- Both `EN` and `AR` translations are required before content is published. The database enforces one row per locale, not the presence of both locales.
- `Notification.type`, `AdminAuditLog.action`, and `AdminAuditLog.entityType` are strings. The prompt did not enumerate their values. Define the allowed codes in Zod when those features are built.
- Dashboard statistics are aggregates. There is no stats table.
- There is no guest cart. `Cart.userId` is unique.
- `updatedAt` is maintained by Prisma Client, not by a database trigger.
- SEO fields, banner subtitle, banner button label, variant description, category description, section subtitle, and `User.avatarUrl` are nullable because a valid record can exist without them.

### Application rules the database does not enforce yet

- Review `rating` is an integer from 1 to 5.
- Cart and order quantities are positive integers.
- `LoyaltyWallet.pointsBalance` must not go negative. Change the balance and insert `LoyaltyTransaction` in one transaction. `points` is signed: `EARN` positive, `REDEEM` and `EXPIRE` negative, `ADJUST` either nonzero sign.
- `verifiedPurchase` is derived from a paid order.
- A category used as `CATEGORY_SERVICES` needs `HomeSection.categoryId`.
- `CartItem` unique key includes nullable `variantId`. PostgreSQL treats nulls as distinct, so two lines for the same service and a null variant are not rejected. The cart service must collapse them. `NULLS NOT DISTINCT` was not added because Prisma would treat that hand-edited index as drift.

## 6. Implemented features

- Next.js foundation from phase 1.
- Full relational schema and the applied initial migration.
- Generated Prisma Client 7.10.1.
- English and Arabic storefront shell: design tokens, sticky header, language switcher, category drawer, search panel, email entry modal, empty cart drawer, footer, and optional WhatsApp button.
- Separate admin shell, administrator email and password sign-in, signed HTTP-only sessions, role checks, super-admin bootstrap, dashboard counts, and the audit-log helper.
- Category management: bilingual create and edit, nested parents, image upload, activation, and safe deletion. The storefront drawer reads those active categories.

Not implemented: homepage sections, category detail pages, service pages, product search, cart persistence, checkout, customer OTP, service and banner management, MEPS gateway calls, and seed data. Do not generate fake services or banners.

## 7. Models, enums, relations, indexes

26 models. 12 enums.

### Enums

- `Locale`: `EN`, `AR`
- `UserRole`: `CUSTOMER`, `ADMIN`, `SUPER_ADMIN`
- `AccountStatus`: `ACTIVE`, `DEACTIVATED`, `SUSPENDED`
- `OtpPurpose`: `LOGIN`, `CHANGE_EMAIL`
- `BannerPlacement`: `HOME_HERO`, `HOME_PROMO`
- `HomeSectionType`: `FEATURED_CATEGORIES`, `FEATURED_SERVICES`, `CATEGORY_SERVICES`, `CUSTOM_SERVICES`
- `OrderStatus`: `PENDING_PAYMENT`, `PAID`, `PROCESSING`, `COMPLETED`, `CANCELLED`, `REFUNDED`
- `PaymentStatus`: `PENDING`, `PROCESSING`, `PAID`, `FAILED`, `REFUNDED`
- `PaymentProvider`: `MEPS`
- `PaymentAttemptStatus`: `CREATED`, `PENDING`, `SUCCEEDED`, `FAILED`, `CANCELLED`
- `ReviewStatus`: `PENDING`, `APPROVED`, `REJECTED`
- `LoyaltyTransactionType`: `EARN`, `REDEEM`, `ADJUST`, `EXPIRE`

### Models and relations

- `User` — cart, orders, reviews, wishlist, notifications, loyalty wallet, audit logs.
- `EmailOtp` — no user foreign key.
- `Category` — self-relation `CategoryHierarchy` (`parent` / `children`). Translations, services, and home sections.
- `CategoryTranslation` — one per category and locale. Cascade from category.
- `Service` — belongs to category (`RESTRICT`). Translations, images, variants, cart items, order items, reviews, wishlist, homepage links.
- `ServiceTranslation` — cascade from service. TipTap JSON description.
- `ServiceImage` — cascade from service.
- `ServiceVariant` — cascade from service. Translations, cart items, order items.
- `ServiceVariantTranslation` — cascade from variant.
- `StoreBanner` — translations.
- `StoreBannerTranslation` — cascade from banner.
- `HomeSection` — optional category (`RESTRICT`). Translations and selected services.
- `HomeSectionTranslation` — cascade from section.
- `HomeSectionService` — section and service, both cascade. Unique pair.
- `Cart` — one per user, cascade from user. Items.
- `CartItem` — cart cascade, service cascade, optional variant cascade.
- `Order` — user `RESTRICT`. Items, payment attempts, loyalty transactions.
- `OrderItem` — order cascade. Optional service and variant are `RESTRICT`, so ordered catalog rows cannot be deleted.
- `PaymentAttempt` — order `RESTRICT`.
- `Review` — user and service `RESTRICT`. Unique user and service.
- `WishlistItem` — user and service cascade. Unique pair.
- `Notification` — user cascade. Translations.
- `NotificationTranslation` — cascade from notification.
- `LoyaltyWallet` — one per user, user `RESTRICT`. Transactions.
- `LoyaltyTransaction` — wallet and optional order, both `RESTRICT`.
- `AdminAuditLog` — actor user `RESTRICT`.

Every foreign key has an explicit `onDelete` and `onUpdate: Cascade`.

### Unique constraints

- `User.email`
- `Category.slug`
- `CategoryTranslation` `(categoryId, locale)`
- `Service.slug`, `Service.sku`
- `ServiceTranslation` `(serviceId, locale)`
- `ServiceVariant.sku`
- `ServiceVariantTranslation` `(variantId, locale)`
- `StoreBannerTranslation` `(bannerId, locale)`
- `HomeSection.key`
- `HomeSectionTranslation` `(sectionId, locale)`
- `HomeSectionService` `(sectionId, serviceId)`
- `Cart.userId`
- `CartItem` `(cartId, serviceId, variantId)` — see the null caveat above
- `Order.orderNumber`
- `PaymentAttempt.idempotencyKey`
- `Review` `(userId, serviceId)`
- `WishlistItem` `(userId, serviceId)`
- `NotificationTranslation` `(notificationId, locale)`
- `LoyaltyWallet.userId`

### Indexes that are not already implied by a unique key

- `User`: `role`, `status`, `phone`
- `EmailOtp`: `(email, purpose, expiresAt)`, `expiresAt`
- `Category`: `(parentId, isActive, sortOrder)`, `(isActive, sortOrder)`
- Locale indexes on every translation table
- `Service`: `(categoryId, isActive, sortOrder)`, `(isFeatured, isActive, sortOrder)`
- `ServiceImage`: `(serviceId, sortOrder)`
- `ServiceVariant`: `(serviceId, isActive, sortOrder)`
- `StoreBanner`: `(placement, isActive, sortOrder)`, `(startsAt, endsAt)`
- `HomeSection`: `(isActive, sortOrder)`, `type`, `categoryId`
- `HomeSectionService`: `(sectionId, sortOrder)`, `serviceId`
- `CartItem`: `serviceId`, `variantId`
- `Order`: `(userId, createdAt)`, `(status, createdAt)`, `paymentStatus`
- `OrderItem`: `orderId`, `serviceId`, `variantId`
- `PaymentAttempt`: `(orderId, createdAt)`, `(provider, status)`, `providerReference`, `transactionReference`
- `Review`: `(serviceId, status)`, `userId`
- `WishlistItem`: `serviceId`
- `Notification`: `(userId, isRead, createdAt)`, `type`
- `LoyaltyTransaction`: `(walletId, createdAt)`, `orderId`, `type`
- `AdminAuditLog`: `(actorId, createdAt)`, `(entityType, entityId)`, `createdAt`

## 8. Files created

Phase 2:

- `prisma/migrations/migration_lock.toml`
- `prisma/migrations/20261102082022_init/migration.sql`

Phase 3:

- `src/i18n/routing.ts`
- `src/i18n/navigation.ts`
- `src/i18n/request.ts`
- `src/proxy.ts`
- `src/messages/en.json`
- `src/messages/ar.json`
- `src/config/site.ts`
- `src/config/whatsapp.ts`
- `src/features/categories/types.ts`
- `src/features/categories/get-public-categories.ts`
- `src/features/auth/prepare-email-sign-in.ts`
- `src/validations/email-sign-in.ts`
- `src/app/api/categories/route.ts`
- `src/app/[locale]/layout.tsx`
- `src/app/[locale]/page.tsx`
- `src/app/[locale]/not-found.tsx`
- `src/app/not-found.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/icon-button.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/container.tsx`
- `src/components/ui/section-heading.tsx`
- `src/components/ui/divider.tsx`
- `src/components/ui/skeleton.tsx`
- `src/components/ui/empty-state.tsx`
- `src/components/ui/overlay.tsx`
- `src/components/layout/brand-logo.tsx`
- `src/components/layout/language-switcher.tsx`
- `src/components/layout/site-header.tsx`
- `src/components/layout/site-footer.tsx`
- `src/components/layout/storefront-shell.tsx`
- `src/components/layout/whatsapp-button.tsx`
- `src/components/storefront/category-drawer.tsx`
- `src/components/storefront/search-panel.tsx`
- `src/components/storefront/account-modal.tsx`
- `src/components/storefront/cart-drawer.tsx`
- `public/images/logo-mafateeh.png`
- `public/images/logo-white.png`
- `public/images/logo.png`

Phase 1 files are listed in the previous foundation record and remain in the repository. The generated client under `src/generated/prisma` was regenerated and stays gitignored.

## 9. Files modified

Phase 2:

- `prisma/schema.prisma` — full relational schema replaced the empty shell
- `README.md` — Prisma section now describes the schema and initial migration
- `PROJECT_MEMORY.md` — this update

`prisma.config.ts`, `package.json`, and `src/lib/prisma.ts` were inspected and left unchanged in phase 2. The db scripts `db:generate`, `db:validate`, `db:migrate`, and `db:studio` were already present.

Phase 3:

- `next.config.ts` — `next-intl/config` alias for Turbopack and webpack
- `src/app/globals.css` — Mafateeh tokens and system font stack
- `package.json` and `package-lock.json` — `next-intl`
- `README.md` — locale routes
- `.env.example` and local `.env` — empty `NEXT_PUBLIC_WHATSAPP_URL`
- `PROJECT_MEMORY.md` — this update

## 10. Files deleted

- `prisma/migrations/.gitkeep` — removed because the migration directory now contains the initial migration

Phase 3:

- `src/app/layout.tsx` — replaced by `src/app/[locale]/layout.tsx`
- `src/app/page.tsx` — replaced by `src/app/[locale]/page.tsx`
- `public/icons/favicon.svg` — downloaded mark was a generic purple icon, not the Mafateeh logo

## 11. Dependencies added or removed

Phase 2: none. Prisma stayed at 7.10.1.

Phase 3: `next-intl` 4.14.9. No component library was added.

Phase 4: `jose` 6.2.15, `nodemailer` 10.3.1, `@types/nodemailer` 8.0.2, and dev dependency `tsx` 4.23.15.

## 12. Commands executed

Phase 2:

- Read `PROJECT_MEMORY.md`, `prisma/schema.prisma`, `prisma.config.ts`, `package.json`, and `src/lib/prisma.ts`
- `npm exec -- prisma format`
- `npm exec -- prisma validate`
- `npm exec -- prisma generate`
- Confirmed Docker and `psql` are still absent
- Connected with `pg` and read the database name and server version
- Confirmed `public` had zero tables before migrating
- `npm exec -- prisma migrate dev --name init`
- `npm exec -- prisma migrate status`
- Counted business tables
- `npm run lint`
- `npm run build`

Phase 3:

- Read `PROJECT_MEMORY.md`, the Next.js app, Prisma config, and the schema
- Installed `next-intl` 4.14.9
- `npm run lint`
- `npm run build`
- Production server checks for `/`, `/en`, `/ar`, and `/api/categories`

Phase 4:

- Installed `jose`, `nodemailer`, `@types/nodemailer`, and `tsx`
- `npm run lint`
- `npm run db:validate`
- `npm run build`
- Production checks for storefront routes, `/admin/login`, unauthenticated `/admin`, session, logout, customer rejection, suspended rejection, settings restriction, overview, rate limit, and the bootstrap command
- Temporary example.com accounts created for those checks were deleted afterward

## 13. Errors encountered and solutions

- Docker and `psql` are not on PATH, but PostgreSQL 18.1 was already accepting connections. The migration was applied there. No `db push` was used.
- `CartItem` cannot get `NULLS NOT DISTINCT` from the Prisma schema language. Left the Prisma unique index in place and recorded the application rule above. Hand-editing the applied SQL would make `migrate dev` report drift.
- Foundation issues still stand: ESLint 9 deprecation, 16 moderate ESLint-toolchain audit findings, and the Prisma 8 release-candidate upgrade notice. Do not force those upgrades.
- `createNextIntlPlugin()` imports `@swc/core`, and Windows Application Control blocked `swc.win32-x64-msvc.node`. The request config is linked with `turbopack.resolveAlias` and a webpack alias instead. Do not reintroduce the plugin on this machine unless that native binding is allowed.
- Cache Components rejected the locale layout because the category query is uncached IO. `StorefrontShell` is inside `<Suspense>`. Do not move that query back into the layout body.

## 14. Pending tasks

Admin dashboard modules through section 24 are complete. The items below are the remaining storefront and payment work.

- Homepage hero, promotions, and service collections. The home route is only a temporary heading. The admin can manage that content, and `getPublicHomepage` can read it, but no storefront page renders it yet.
- Category detail pages and service detail pages. Drawer leaves are not links yet.
- Product search. The search panel keeps local input state only.
- Cart persistence and the header count. The drawer is empty and `cartItemCount` defaults to 0.
- Checkout and order creation.
- Replace the storefront `prepareEmailSignIn` with customer email OTP. Do not reuse the admin cookie for customers.
- Service, banner, homepage, review, customer, order, and account-settings screens are implemented in the admin dashboard. Do not seed fake catalog data.
- Call `writeAdminAuditLog` from future storefront mutations. Category, service, homepage, review, customer, order, and account mutations already write audit rows.
- Customer profile completion. A session table was not part of this schema. The admin session is a signed cookie, not a database row.
- Cart service that collapses null-variant lines, then order creation inside a transaction with price snapshots.
- MEPS gateway and the reserved footer payment area. The `PaymentAttempt` table is only storage.
- Public review submission. Moderation and approved-only rating aggregates already exist.
- Loyalty transactions that keep `pointsBalance` non-negative.
- Audit log writes for future storefront actions. Dashboard mutations already write rows.
- Zod bounds for rating, quantity, currency length, and notification type codes.
- Real privacy and terms URLs, and verified social links, before those footer items become links.
- A valid `https://wa.me/...` or WhatsApp API URL before the floating button appears.

## 15. Current development phase

The public browsing storefront is implemented. See section 25. Do not start customer OTP, cart persistence, checkout, or MEPS until a new prompt asks for it.

Earlier text in this section stopped at category management. Sections 22, 23, and 24 supersede that note.

## 16. Internationalization

- Locales: `en` (default, LTR) and `ar` (RTL). URL prefixes are always `/en` and `/ar`.
- `localeDetection` is false, so `/` redirects to `/en` instead of guessing from the browser.
- `src/i18n/routing.ts` defines the locales. `src/i18n/navigation.ts` exports the locale-aware `Link`, `redirect`, `usePathname`, `useRouter`, and `getPathname`.
- `src/i18n/request.ts` loads `src/messages/<locale>.json`. When no locale is passed, it reads `next/root-params`.
- `src/app/[locale]/layout.tsx` sets `lang` and `dir`, calls `setRequestLocale`, and renders `NextIntlClientProvider`.
- The language switcher calls `router.replace` with the current pathname, current query, and the next locale. It does not reload the document.
- The header itself uses `dir="ltr"` so the account and cart stay on the left and the search, menu, and language controls stay on the right in both locales. Drawer text follows the document direction. The cart drawer is physically on the left. The menu drawer is physically on the right.
- Database locale values are `EN` and `AR`. The public category query maps `en` and `ar` to those values.
- Metadata includes canonical and alternate links for `/en`, `/ar`, and `x-default`.

## 17. Design system

Colors come from the public Mafateeh site: green `#157037`, deep green `#0c3d1e`, mint `#2f9a58`, and gold `#dfb026`. Tokens live in `src/app/globals.css` for brand, canvas, ink, borders, success, warning, danger, information, shadows, radii, spacing, the container width, and the header gradient.

The header and footer both use `public/images/logo-white.png` directly on the green backgrounds, with no backing chip. `public/images/logo.png` remains available and is not shown in the shell. `public/images/logo-mafateeh.png` remains available and is not shown in the shell. Typography uses Segoe UI, Tahoma, Noto Naskh Arabic, Geeza Pro, and Arial. There is no Google Fonts import.

Reusable primitives are in `src/components/ui`. Interface icons are Lucide. The WhatsApp glyph is a small inline path, not a Linkin asset.

## 18. Storefront shell decisions

- `SiteHeader` opens the category drawer and the search panel. Account and cart stay visible as disabled placeholders until OTP and the cart exist. `AccountModal` and `CartDrawer` remain in the repo and are not mounted.
- Categories are loaded on the server by `getPublicCategoryTree` and also exposed at `GET /api/categories?locale=en|ar`. Invalid locales return 400. An unavailable database returns 503 and an empty list. Active categories are returned as a flat list. A missing translation falls back to the other locale. Section 25 describes the drawer, search, and pages.
- Footer contact is the published Mafateeh phone, email, Amman address, and hours. About, services, and contact point at the official localized site. Privacy and terms are omitted because no public URLs were verified. Social links are hidden.
- `getWhatsAppUrl()` accepts only HTTPS URLs on `wa.me`, `api.whatsapp.com`, `whatsapp.com`, or a `whatsapp.com` subdomain. An empty value hides the button.

## 19. Admin dashboard

The admin area is a separate root layout at `src/app/admin`. It does not render the storefront header, cart, or footer. The interface is English. Routes:

- `/admin/login`
- `/admin`
- `/admin/categories`
- `/admin/services`
- `/admin/banners`
- `/admin/homepage`
- `/admin/reviews`
- `/admin/users`
- `/admin/orders`
- `/admin/settings`

The overview and `/admin/categories` read the database. Services, banners, homepage, reviews, users, and orders still say the module is awaiting implementation and do not expose action buttons. Settings is limited to `SUPER_ADMIN` on the server. The sidebar hides that link for `ADMIN`.

### Authentication

Customers remain passwordless. Their future sign-in is email OTP through `EmailOtp`. Administrators sign in with email and password.

1. `POST /api/admin/auth/login` accepts email and password.
2. The account must be an active `ADMIN` or `SUPER_ADMIN` with a `passwordHash`.
3. Unknown emails, customers, inactive accounts, and wrong passwords all return the same 401 message.
4. A match sets the session cookie.
5. `POST /api/admin/auth/logout` clears that cookie.
6. `GET /api/admin/session` returns 401, 403, or the signed-in role. It reloads the user from PostgreSQL.

`passwordHash` is nullable. Customers do not get one. The stored value is `scrypt:<salt>:<hash>` from Node `crypto.scrypt`. The plaintext password is never stored or logged. Login attempts are rate limited in process memory for 15 minutes.

The administrator OTP routes were removed. SMTP is not used for admin sign-in.

### Session

- Cookie name: `mafateeh_admin_session`.
- Signed with `jose` HS256. The payload contains the user id and `kind: "admin"`, not a trusted role.
- HTTP-only, `SameSite=Lax`, `Secure` in production, path `/`, lifetime 8 hours.
- Logout sets `Max-Age=0`. A copied token remains valid until it expires or the account is no longer an active administrator, because there is no session table.
- Every protected server read calls `requireAdmin()` or `requireSuperAdmin()` and checks the current database role and status.

### Bootstrap

`npm run admin:bootstrap` runs `scripts/bootstrap-super-admin.ts`. It requires `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` (at least 12 characters), and `DATABASE_URL`. It creates that exact lowercase email as an active `SUPER_ADMIN` with a password hash, or promotes an existing active account and replaces the hash. A deactivated or suspended account is left unchanged. There is no public promotion endpoint and no hardcoded address or password.

### Dashboard counts

`getDashboardOverview` counts services, active services, categories, customers, orders, pending-payment orders, completed orders, and approved reviews. Recent orders show number, status, total, and time. They do not include customer contact details. The overview does not list administrative activity.

### Audit helper

`writeAdminAuditLog` in `src/server/admin/audit.ts` records actor, action, entity type, entity id, and before/after JSON. Keys that look like passwords, secrets, tokens, OTP material, cards, or cookies are replaced with `[redacted]`. Category mutations call it. The other modules do not yet.

### Environment variables

`.env.example` includes `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SESSION_SECRET`, `SUPER_ADMIN_EMAIL`, and `SUPER_ADMIN_PASSWORD`. The app also accepts the older `SMTP_PASSWORD` name. `SMTP_FROM` may be a plain address or `Name <address>`. Its `DATABASE_URL` uses the local Docker placeholder `postgres:postgres`, not a real password. SMTP is reserved for future customer email codes. `SESSION_SECRET` stays only in the local `.env`. The bootstrap password is local and must not be copied into this file or into source.

### Files created in phase 4

- `src/lib/admin-env.ts`
- `src/types/admin.ts`
- `src/validations/admin-auth.ts`
- `src/server/admin/audit.ts`
- `src/server/admin/authorization.ts`
- `src/server/admin/dashboard.ts`
- `src/server/admin/http.ts`
- `src/server/admin/login.ts`
- `src/server/admin/mailer.ts`
- `src/server/admin/otp.ts`
- `src/server/admin/rate-limit.ts`
- `src/server/admin/session.ts`
- `src/app/api/admin/auth/login/route.ts`
- `src/app/api/admin/auth/logout/route.ts`
- `src/server/admin/password.ts`
- `src/app/api/admin/session/route.ts`
- `src/app/admin/layout.tsx`
- `src/app/admin/login/page.tsx`
- `src/app/admin/(panel)/layout.tsx`
- `src/app/admin/(panel)/loading.tsx`
- `src/app/admin/(panel)/page.tsx`
- `src/app/admin/(panel)/categories/page.tsx`
- `src/app/admin/(panel)/services/page.tsx`
- `src/app/admin/(panel)/banners/page.tsx`
- `src/app/admin/(panel)/homepage/page.tsx`
- `src/app/admin/(panel)/reviews/page.tsx`
- `src/app/admin/(panel)/users/page.tsx`
- `src/app/admin/(panel)/orders/page.tsx`
- `src/app/admin/(panel)/settings/page.tsx`
- `src/components/dashboard/admin-breadcrumbs.tsx`
- `src/components/dashboard/admin-header.tsx`
- `src/components/dashboard/admin-layout.tsx`
- `src/components/dashboard/admin-module-placeholder.tsx`
- `src/components/dashboard/admin-page-header.tsx`
- `src/components/dashboard/admin-sidebar.tsx`
- `src/components/dashboard/confirm-dialog.tsx`
- `src/components/dashboard/data-table.tsx`
- `src/components/dashboard/empty-state.tsx`
- `src/components/dashboard/loading-state.tsx`
- `src/components/dashboard/login-form.tsx`
- `src/components/dashboard/navigation.ts`
- `src/components/dashboard/stat-card.tsx`
- `src/components/dashboard/status-badge.tsx`
- `scripts/bootstrap-super-admin.ts`

### Files modified in phase 4

- `package.json`
- `package-lock.json`
- `next.config.ts`
- `src/proxy.ts`
- `.env.example`
- `.env`
- `README.md`
- `PROJECT_MEMORY.md`

### Files deleted in phase 4

- `src/app/api/admin/auth/request/route.ts`
- `src/app/api/admin/auth/verify/route.ts`

Administrator sign-in no longer uses those OTP routes. Migration `add_admin_password_hash` adds nullable `User.passwordHash`.

## 20. Category management

`/admin/categories` replaces the placeholder. It shows total, active, and inactive counts, search, a status filter, and a paginated table. Creating and editing happen in a dialog with General, English, and Arabic sections. Both names and descriptions are required. Categories are not nested: each category holds services, and `parentId` is saved as null. The slug is generated on the server from the English name and is not shown or edited. Sort order starts at 1. The Arabic tab uses Arabic field labels.

Deactivation keeps the category, its translations, and its services. Deletion is refused while children, services, or homepage sections exist. Category writes use a Prisma transaction. The schema was not changed.

### Image storage

Uploaded images use the shared helper in `src/server/media/image-storage.ts`. See section 21. A category has an optional image in `iconImageUrl` and a required banner in `bannerImageUrl`. The list returns only the category image. The edit request returns both images. `iconName` is saved as null. The audit log records that an image was stored, not the base64 value.

### Admin API

All of these call `requireAdmin()`:

- `GET /api/admin/categories` with `page`, `pageSize`, `search`, `status`, and `view=options`
- `POST /api/admin/categories`
- `GET /api/admin/categories/[id]`
- `PUT /api/admin/categories/[id]`
- `PATCH /api/admin/categories/[id]/status`
- `DELETE /api/admin/categories/[id]`

Audit actions are `category.create`, `category.update`, `category.activate`, `category.deactivate`, and `category.delete`.

### Cursor behavior

Enabled links, buttons, summaries, selects, checkbox and radio labels, file labels, and button, tab, and menu roles use `cursor: pointer` from `src/app/globals.css`. Disabled buttons and selects, and `aria-disabled="true"`, use `cursor: not-allowed`. Icon actions are real buttons with accessible names. Decorative icons stay inside those controls.

### Files created in phase 5

- `src/server/storage.ts`
- `src/server/admin/categories.ts`
- `src/validations/category.ts`
- `src/app/api/admin/categories/route.ts`
- `src/app/api/admin/categories/[id]/route.ts`
- `src/app/api/admin/categories/[id]/status/route.ts`
- `src/app/api/admin/uploads/route.ts`
- `src/app/api/media/categories/[file]/route.ts`
- `src/components/dashboard/categories-manager.tsx`
- `src/components/dashboard/category-form.tsx`
- `src/components/dashboard/category-icons.tsx`

### Files modified in phase 5

- `src/app/admin/(panel)/categories/page.tsx`
- `src/app/globals.css`
- `src/components/ui/button.tsx`
- `src/components/ui/icon-button.tsx`
- `src/components/ui/overlay.tsx`
- `src/components/dashboard/admin-header.tsx`
- `src/components/dashboard/admin-sidebar.tsx`
- `src/components/dashboard/confirm-dialog.tsx`
- `src/components/layout/language-switcher.tsx`
- `src/components/layout/site-header.tsx`
- `src/components/storefront/category-drawer.tsx`
- `.gitignore`
- `.env.example`
- `README.md`
- `PROJECT_MEMORY.md`

No dependencies were added. No schema migration was created. The temporary HTTP check script was deleted after the checks passed.

A browser service worker left over from another app on `localhost:3000` kept requesting `/sw.js`. A missing file was rendered through `[locale]`, which made the dev server rebuild and the page refresh. `public/sw.js` is an empty script so that update can succeed. It must not intercept fetches or unregister itself, because that reloads the page continuously. The dev server can be opened on another port when that worker still controls port 3000.

## 21. Base64 image policy

Every image uploaded through the dashboard is stored in PostgreSQL as a complete data URL: `data:image/jpeg;base64,...`, `data:image/png;base64,...`, or `data:image/webp;base64,...`. External hosts and local upload folders are not used. Static files that ship with the app, including the Mafateeh logos in `public/images`, stay as project files.

The columns are already `TEXT` in the initial migration, so no new migration was added:

- `Category.iconImageUrl`
- `Category.bannerImageUrl`
- `Service.coverImageUrl`
- `ServiceImage.imageUrl`
- `StoreBanner.desktopImageUrl`
- `StoreBanner.mobileImageUrl`
- `User.avatarUrl`

`src/server/media/image-storage.ts` is the only writer for those values. It checks the file signature, ignores the browser file name and declared type, rejects HTTP and path URLs, rejects files over 5 MB, and builds the data URL on the server. No image-processing package is installed, so the bytes are not resized. Category create and update call this helper. Service, banner, and profile screens are not built yet; they must call the same helper.

The category list selects `iconImageUrl` only. The category detail response includes the image and the banner because the edit form displays both. `StoredImage` renders a data URL with `object-cover`, a muted placeholder, and an error state. It does not request an image host. Admin image routes still require `requireAdmin()`.

Removed filesystem upload code:

- `src/server/storage.ts`
- `src/app/api/admin/uploads/route.ts`
- `src/app/api/media/categories/[file]/route.ts`
- `UPLOAD_DIR` from `.env.example`
- `/storage/uploads/` from `.gitignore`

Files added: `src/server/media/image-storage.ts`, `src/components/ui/stored-image.tsx`.

Files changed for this policy: `src/server/admin/categories.ts`, `src/components/dashboard/category-form.tsx`, `src/components/dashboard/categories-manager.tsx`, `README.md`, `.env.example`, `.gitignore`, `PROJECT_MEMORY.md`.

Service covers and gallery images now use this helper. See section 22. `Service.coverImageUrl` was made nullable so a draft can be saved before a cover exists. Homepage banners and profile pictures still have no upload screens. When they are built, they must store base64 through `image-storage.ts`.

## 22. Service management

`/admin/services` replaces the placeholder. The page shows total, published, draft, and inactive counts, search by English or Arabic name, category, status, and featured filters, sorting, and a paginated table. Columns are cover, name, category, price, currency, approved rating, approved review count, status, featured, created date, and actions. View and edit open dedicated pages. Publish, deactivate, reactivate, and delete ask for confirmation.

A service belongs to one category. Only active categories can be chosen for a new service or a newly published service. A draft may keep its current category if that category is later deactivated. The slug is generated on the server from the English name, with `-2`, `-3`, and later suffixes when needed. The form does not show the slug.

Status comes from existing columns:

- Draft: `publishedAt` is null.
- Published: `publishedAt` is set and `isActive` is true.
- Inactive: `publishedAt` is set and `isActive` is false.

Publishing requires a cover, English and Arabic names and short descriptions, an active category, and a valid price. `publishedAt` is set only when it is still null. Deactivation keeps the content and the original `publishedAt`.

The admin form collects one price and one currency. It does not ask for an SKU, a compare-at price, or packages. The price is a Prisma `Decimal` sent as a string. Currency is a 3-letter code. The form offers JOD, USD, SAR, AED, EUR, and GBP, and accepts another ISO-style code. The database still has optional SKU and compare-at columns, and the package tables remain unused by this screen. Saving a service clears any packages so the service price is the only price.

Ratings and review counts use `Review.status = APPROVED` only. A service with no approved reviews shows no average. Pending reviews are ignored.

Deletion is refused when an order item points at the service or one of its packages, when any review exists, or when a homepage section links to the service. Cart and wishlist rows cascade with the service. Order snapshots are not edited.

### Rich text

English and Arabic descriptions use separate TipTap 3.32.2 editors. English is left-to-right. Arabic is right-to-left and right-aligned by default. The saved value is the TipTap JSON document in `ServiceTranslation.detailedDescription`. It is not HTML.

Extensions:

- `@tiptap/starter-kit` for paragraphs, headings 1–3, bold, italic, strike, lists, blockquote, horizontal rule, undo, and redo. Code and code block are turned off. Underline and link come from the starter kit.
- `@tiptap/extension-text-style` and `@tiptap/extension-color`
- `@tiptap/extension-highlight` with multiple colors
- `@tiptap/extension-text-align`
- `@tiptap/extension-table`, `@tiptap/extension-table-row`, `@tiptap/extension-table-cell`, and `@tiptap/extension-table-header`
- `@tiptap/extension-placeholder`
- `@tiptap/pm` and `@tiptap/react`

`src/features/services/rich-text.ts` checks the JSON on the server. Allowed links are `http`, `https`, `mailto`, and `tel`. Colors must be `#rgb` or `#rrggbb`. `RichTextView` renders the document as React elements. It does not use `dangerouslySetInnerHTML`. The admin preview and `getPublicService` both use that document.

### Images

Cover and gallery uploads call `imageFromDataUrl` and `optionalImageFromDataUrl`. The cover is stored in `Service.coverImageUrl`. Gallery rows are `ServiceImage` records, at most 10, with alt text and sort order. Replacing the gallery deletes and recreates only that service's image rows inside the same transaction. The list endpoint selects the cover and does not select gallery rows. The detail endpoint returns the gallery. Audit entries store `coverStored` and `galleryCount`, never the data URL.

### Admin API

All of these call `requireAdmin()`:

- `GET /api/admin/services`
- `POST /api/admin/services`
- `GET /api/admin/services/[id]`
- `PUT /api/admin/services/[id]`
- `PATCH /api/admin/services/[id]/status` with `publish`, `deactivate`, or `reactivate`
- `DELETE /api/admin/services/[id]`

Validation is in `src/validations/service.ts`. Writes run in a Prisma transaction. Audit actions are `service.create`, `service.update`, `service.images`, `service.packages`, `service.publish`, `service.deactivate`, `service.reactivate`, and `service.delete`.

### Public query layer

`src/features/services/get-public-services.ts` is ready for later storefront pages. No public service route or product page was added.

`listPublicServices(locale)` returns active published services in an active category, with the requested translation, cover, base price, compare-at price, currency, featured flag, category, and approved rating. It does not return gallery images or drafts.

`getPublicService(slug, locale)` also returns gallery images, the TipTap document, active packages that have both English and Arabic names, and approved reviews without user emails.

### Prisma

Migration `20261102104008_make_service_cover_optional` drops `NOT NULL` from `Service.coverImageUrl`. No other columns or models were added.

### Files created

- `src/validations/service.ts`
- `src/server/admin/services.ts`
- `src/features/services/rich-text.ts`
- `src/features/services/rich-text-view.tsx`
- `src/features/services/get-public-services.ts`
- `src/app/api/admin/services/route.ts`
- `src/app/api/admin/services/[id]/route.ts`
- `src/app/api/admin/services/[id]/status/route.ts`
- `src/app/admin/(panel)/services/new/page.tsx`
- `src/app/admin/(panel)/services/[id]/page.tsx`
- `src/components/dashboard/services-manager.tsx`
- `src/components/dashboard/service-editor.tsx`
- `src/components/dashboard/rich-text-editor.tsx`
- `src/components/dashboard/service-preview.tsx`
- `prisma/migrations/20261102104008_make_service_cover_optional/migration.sql`

### Files modified

- `prisma/schema.prisma`
- `src/app/admin/(panel)/services/page.tsx`
- `src/components/dashboard/admin-page-header.tsx`
- `src/components/dashboard/data-table.tsx`
- `src/app/globals.css`
- `package.json`
- `package-lock.json`
- `PROJECT_MEMORY.md`

### Files deleted

No application files were deleted. The temporary `scripts/phase6-check.mjs` script was removed after the checks.

### Checks

The workflow was exercised over HTTP against PostgreSQL on 2 November 2026: create, edit, unique slug, category selection, cover and gallery upload, replace, remove, base64 prefixes stored in `Service` and `ServiceImage`, no `storage` or `public/uploads` directory, English and Arabic text, saved table and color marks, package create and price edit, publish, deactivate, reactivate, approved ratings only, deletion blocked by an order and then by a review, anonymous API 401, and a list response that contained the cover but not the gallery payload. The temporary rows were deleted. The pages `/admin/services`, `/admin/services/new`, and `/admin/services/[id]` returned 200 for a signed-in administrator. Browser click-through was not available.

### Remaining

Homepage banners, storefront category and service pages, customer package selection, review moderation, orders, users, and settings are not started.

## 23. Homepage content management

`/admin/homepage` replaces the placeholder. `/admin/banners` still redirects there for old addresses, but the sidebar no longer has a Banners link because it duplicated Homepage Content. The screen has tabs for the hero carousel, promotional banners, homepage sections, and an English/Arabic preview. The preview uses the open form, so unsaved title, image, schedule, and service-order changes are visible before saving.

The service form still has one price and one currency. It does not collect an SKU, a compare-at price, or packages.

### Banners

Hero banners use `StoreBanner.placement = HOME_HERO`. Promotional banners use `HOME_PROMO`. Each banner has a required desktop image, an optional mobile image, English and Arabic title, subtitle, and button label, an optional destination, active status, sort order, and optional start and end dates. A destination may be an `http` or `https` URL, an internal path such as `/en/services/example`, or a same-page anchor such as `#service-categories`. `javascript:`, `data:`, other unsafe protocols, and protocol-relative URLs such as `//example.com` are rejected. The saved value is kept as entered, aside from the existing trim of surrounding whitespace. Fragment links use a normal `href` so they stay on the current locale. Validation lives in `src/features/homepage/banner-destination.ts` and `bannerInputSchema`, and the banner form checks it before sending. The public homepage category section uses `id="service-categories"`. The storefront catalog is still not rendered there. The end date must be after the start date. Images go through `imageFromDataUrl` and `optionalImageFromDataUrl` and are stored in `desktopImageUrl` and `mobileImageUrl`. The translation `altText` is the title. Reorder buttons update `sortOrder` in a transaction.

### Sections

Sections use `HomeSection`, `HomeSectionTranslation`, and `HomeSectionService`. The key is generated from the English title and is not shown. Types:

- Featured category: one active category. The schema stores one category per section, so another category needs another section.
- Featured services: an ordered list of active published services.
- Category services: one active category, then services from that category. An empty list uses the newest published services in that category, limited by `maxItems`.
- Custom services: an ordered list of active published services from any active category.

A service can appear only once in a section. The database unique key enforces that, and the request is rejected before writing when the list contains a duplicate. Only active published services and active categories can be selected.

### Public query

`src/features/homepage/get-public-homepage.ts` returns active banners whose schedule includes the current time, active sections, the requested locale, category images, service covers, prices, currencies, and approved ratings. Banner `linkUrl` values pass through `bannerDestinationHref`, which keeps a safe fragment, path, or http(s) URL unchanged and drops an unsafe value. It does not return gallery images, drafts, inactive records, or banners outside their schedule. No storefront page calls it yet. The public homepage at `src/app/[locale]/page.tsx` has the category anchor `id="service-categories"` for banner destinations.

### API

All of these call `requireAdmin()`:

- `GET /api/admin/homepage`
- `POST /api/admin/homepage/banners`
- `PUT /api/admin/homepage/banners/[id]`
- `PATCH /api/admin/homepage/banners/[id]/status`
- `PATCH /api/admin/homepage/banners/reorder`
- `DELETE /api/admin/homepage/banners/[id]`
- `POST /api/admin/homepage/sections`
- `PUT /api/admin/homepage/sections/[id]`
- `PATCH /api/admin/homepage/sections/[id]/status`
- `PATCH /api/admin/homepage/sections/reorder`
- `DELETE /api/admin/homepage/sections/[id]`

Audit actions are `banner.create`, `banner.update`, `banner.activate`, `banner.deactivate`, `banner.reorder`, `banner.delete`, `section.create`, `section.update`, `section.activate`, `section.deactivate`, `section.reorder`, and `section.delete`. Audit data records that an image was stored, not the Base64 value.

### Prisma

No schema change and no migration. Existing `StoreBanner`, `StoreBannerTranslation`, `HomeSection`, `HomeSectionTranslation`, and `HomeSectionService` models are used.

### Files created

- `src/validations/homepage.ts`
- `src/server/admin/homepage.ts`
- `src/features/homepage/get-public-homepage.ts`
- `src/app/api/admin/homepage/http.ts`
- `src/app/api/admin/homepage/route.ts`
- `src/app/api/admin/homepage/banners/route.ts`
- `src/app/api/admin/homepage/banners/reorder/route.ts`
- `src/app/api/admin/homepage/banners/[id]/route.ts`
- `src/app/api/admin/homepage/banners/[id]/status/route.ts`
- `src/app/api/admin/homepage/sections/route.ts`
- `src/app/api/admin/homepage/sections/reorder/route.ts`
- `src/app/api/admin/homepage/sections/[id]/route.ts`
- `src/app/api/admin/homepage/sections/[id]/status/route.ts`
- `src/components/dashboard/homepage-manager.tsx`
- `src/components/dashboard/homepage-preview.tsx`

### Files modified

- `src/app/admin/(panel)/homepage/page.tsx`
- `src/app/admin/(panel)/banners/page.tsx`
- `PROJECT_MEMORY.md`

### Files deleted

No application files were deleted. The temporary `scripts/phase7-check.mjs` script was removed after the checks.

### Checks

On 2 November 2026 the HTTP checks passed for unauthorized access, the homepage page, hero create/edit/delete, promotional create/deactivate, desktop PNG and mobile JPEG Base64 stored in PostgreSQL, rejected schedules, banner and section ordering, featured services, featured category, duplicate service rejection, Arabic public content, hiding inactive and future banners, service price and currency without gallery data, audit rows without Base64, and no upload directory. Temporary rows were deleted. Browser click-through was not available.

### Remaining

The public homepage catalog is not rendered yet. The page does include the category anchor `id="service-categories"`. Review moderation, orders, customers, and account settings were added in section 24. Customer OTP, cart persistence, and the MEPS gateway are not started.

### Banner destination anchors

Same-page anchors are valid banner destinations. `src/features/homepage/banner-destination.ts` accepts `#service-categories`, other safe fragments, `http` and `https` URLs, and internal paths. It rejects `javascript:`, `data:`, `vbscript:`, `file:`, `blob:`, and protocol-relative URLs. `bannerInputSchema` uses that check, and the banner form checks it before the request. Saved destinations are not rewritten. Preview and public banner hrefs use a plain anchor, so a fragment stays on the current page and locale. The first featured-category block in the admin preview also uses `id="service-categories"`.

Files created: `src/features/homepage/banner-destination.ts`, `src/features/homepage/banner-destination.test.ts`.

Files modified: `src/validations/homepage.ts`, `src/features/homepage/get-public-homepage.ts`, `src/components/dashboard/homepage-manager.tsx`, `src/components/dashboard/homepage-preview.tsx`, `src/app/[locale]/page.tsx`, `src/messages/en.json`, `src/messages/ar.json`, `PROJECT_MEMORY.md`.

No schema change, migration, or dependency change.

On 2 November 2026, `node --import tsx --test src/features/homepage/banner-destination.test.ts` passed 36 tests. `npm run lint`, `npm run db:validate`, and `npm run build` passed. `/en` and `/ar` both returned the `service-categories` anchor. The dev server was restarted on port 3010 after the build.

## 24. Admin dashboard completion

Completed on 2 November 2026. This phase finishes the administration system. It does not add a public storefront page.

### What was already in place

- Admin email and password authentication, session cookie, and `requireAdmin`.
- Categories, services, and homepage content. Those modules were left in place. Services still have one price and one currency. The editor still sends no SKU, no compare-at price, and no packages.
- Overview counts in `src/server/admin/dashboard.ts`. They were extended, not replaced with sample numbers.
- Public service ratings already use `Review.status = APPROVED` in `src/features/services/get-public-services.ts` and `src/server/admin/services.ts`.

### Overview

`getDashboardOverview` now returns live counts for customers, services, published services, active categories, orders, pending orders (`PENDING_PAYMENT`, `PAID`, `PROCESSING`), completed orders, and pending reviews. Paid revenue is the sum of `Order.total` grouped by currency where `paymentStatus` is `PAID` and status is not `CANCELLED` or `REFUNDED`. Currencies are not added together. Best-performing services rank paid, non-cancelled order items by quantity and keep each currency separate. The page also lists recent orders, recent customers, the full order-status summary, and recent `AdminAuditLog` rows.

### Reviews

`/admin/reviews` lists reviews with search, status, rating, service, and date filters. An administrator can open a review, approve it, reject it, or delete it after confirmation. Status values stay `PENDING`, `APPROVED`, and `REJECTED`. Only approved reviews affect the public rating query.

### Customers

`/admin/users` lists `CUSTOMER` accounts only, with search on name, email, and phone, plus status and registration-date filters. `/admin/users/[id]` shows profile, orders, loyalty balance, and loyalty transactions. Status can move among `ACTIVE`, `SUSPENDED`, and `DEACTIVATED`. A request that includes `role` or `passwordHash` is rejected. The responses never select password hashes, OTP rows, or tokens. There is no customer delete action. Customers with orders stay in the database and are suspended or deactivated instead.

### Orders

`/admin/orders` searches by order number and customer name, email, or phone, and filters by order status, payment status, and date. Sort options are newest, oldest, and highest total. `/admin/orders/[id]` shows the customer, saved item names, quantities, unit prices, line totals, subtotal, discount, tax, total, currency, payment attempts, loyalty transactions, and administrator status history from `AdminAuditLog`.

Allowed order-status transitions:

- `PENDING_PAYMENT` with a payment status other than `PAID`: `CANCELLED` only.
- `PENDING_PAYMENT` when payment is already `PAID`: `PAID`, `PROCESSING`, or `CANCELLED`.
- `PAID`: `PROCESSING` or `CANCELLED`.
- `PROCESSING`: `COMPLETED` or `CANCELLED`.
- `COMPLETED`, `CANCELLED`, and `REFUNDED`: no further change.

The status update writes `Order.status` and, when completing, `completedAt`. It does not write `paymentStatus`, totals, or item snapshots, and it does not create `PaymentAttempt` rows. `REFUNDED` is rejected in this phase because there is no refund gateway. Payment attempt metadata is not returned to the browser.

### Settings

`/admin/settings` is available to every active administrator and edits only the signed-in account. It updates first and last name, changes email after a lowercase uniqueness check, and changes the password only after `verifyPassword` succeeds. The new hash uses the existing scrypt helper. SMTP and other secrets stay in environment variables. Customer authentication is still the future email OTP flow.

The Settings navigation item is no longer limited to `SUPER_ADMIN`, because it is self-service account settings and cannot change roles.

### Audit actions

`review.approve`, `review.reject`, `review.delete`, `customer.activate`, `customer.suspend`, `order.status`, `account.profile`, `account.email`, and `account.password`. The audit scrubber already redacts password-like keys. Password hashes and Base64 images are not written.

### Prisma

No schema change and no migration.

### API routes

- `GET /api/admin/reviews`
- `PATCH /api/admin/reviews/[id]`
- `DELETE /api/admin/reviews/[id]`
- `GET /api/admin/customers`
- `GET /api/admin/customers/[id]`
- `PATCH /api/admin/customers/[id]`
- `GET /api/admin/orders`
- `GET /api/admin/orders/[id]`
- `PATCH /api/admin/orders/[id]`
- `GET /api/admin/account`
- `PATCH /api/admin/account`

Every route calls `requireAdmin`.

### Files created

- `src/validations/admin-operations.ts`
- `src/server/admin/reviews.ts`
- `src/server/admin/customers.ts`
- `src/server/admin/orders.ts`
- `src/server/admin/account.ts`
- `src/app/api/admin/reviews/route.ts`
- `src/app/api/admin/reviews/[id]/route.ts`
- `src/app/api/admin/customers/route.ts`
- `src/app/api/admin/customers/[id]/route.ts`
- `src/app/api/admin/orders/route.ts`
- `src/app/api/admin/orders/[id]/route.ts`
- `src/app/api/admin/account/route.ts`
- `src/app/admin/(panel)/users/[id]/page.tsx`
- `src/app/admin/(panel)/orders/[id]/page.tsx`
- `src/components/dashboard/reviews-manager.tsx`
- `src/components/dashboard/customers-manager.tsx`
- `src/components/dashboard/customer-detail.tsx`
- `src/components/dashboard/orders-manager.tsx`
- `src/components/dashboard/order-detail.tsx`
- `src/components/dashboard/account-settings.tsx`

### Files modified

- `src/server/admin/dashboard.ts`
- `src/app/admin/(panel)/page.tsx`
- `src/app/admin/(panel)/reviews/page.tsx`
- `src/app/admin/(panel)/users/page.tsx`
- `src/app/admin/(panel)/orders/page.tsx`
- `src/app/admin/(panel)/settings/page.tsx`
- `src/components/dashboard/navigation.ts`
- `PROJECT_MEMORY.md`

### Files deleted

No application files were deleted. The temporary `scripts/phase8-check.mjs` script was removed after the checks.

### Dependencies

None added or removed.

### Checks

On 2 November 2026, `npx tsc --noEmit` passed. An HTTP and SQL check against `http://localhost:3010` passed 37 cases: anonymous API rejection, anonymous page redirect, admin login, customer login rejection, review search and filters, approved ratings, rejection leaving the public rating, review deletion, customer search, hidden credentials, suspension, rejected role elevation, reactivation, order search and filters, rejected invalid transitions, rejected payment falsification, cancellation, fulfillment of an already paid order without changing payment or totals, rejected refund, loyalty display, live overview HTML, the reviews, customers, orders, settings, categories, services, and homepage pages, existing category, service, and homepage APIs, profile update, duplicate email, wrong current password, email round-trip, password round-trip, and logout. Temporary customers, orders, reviews, loyalty rows, and the audit rows from that check were deleted. The administrator password was changed and then restored during the check.

Browser click-through was not available. The pages were loaded over HTTP while signed in, which confirms the server render, not every button click.

`npm run lint` passed. `npm run db:validate` passed. `npm run build` passed, including Prisma generate and the new admin routes. The dev server was stopped for the build and started again on port 3010.

### Remaining

The public browsing storefront now exists. See section 25. Still unimplemented: customer email OTP, cart persistence, checkout, and the MEPS gateway. There is no separate order-status history table. The order page reads status changes from `AdminAuditLog`.

## 25. Public storefront

Prompt 9 replaced the placeholder homepage with the browsing storefront. Content comes from PostgreSQL. No services, categories, prices, ratings, reviews, or banners are invented. No schema change and no new dependency. Customer OTP, cart persistence, checkout, MEPS, and loyalty redemption are still out of scope. Account and cart remain visible in the header as disabled placeholders. `AccountModal` and `CartDrawer` are not mounted.

### Routes

- `/[locale]` homepage
- `/[locale]/categories/[slug]` active category, otherwise the localized not-found UI
- `/[locale]/services/[slug]` published service in an active category, otherwise the localized not-found UI
- `GET /api/search?locale=en|ar&q=` public search. Invalid locale returns 400. Queries shorter than 2 or longer than 80 characters return an empty list.

### Data loading

- `getPublicHomepage` is wrapped in React `cache`. It calls `connection()` before `new Date()` so banner scheduling is request-time. Hero and promo banners must be active, inside their schedule, have a desktop `data:image/` URL, and have a translation. The requested locale is preferred and the other locale is the fallback. Homepage service cards include the cover, short description, one price, one currency, and approved ratings. Galleries are not loaded.
- `getPublicDrawerBanner` loads the first eligible active `HOME_PROMO` banner for the drawer. The area is omitted when none qualifies.
- `getPublicCategoryTree` returns active categories as a flat list, with the icon image and localized title and description. Category banners are not loaded for the header or homepage.
- `getPublicCategory` loads one active category, including its banner, for the category page.
- `listPublicServices`, `searchPublicServices`, and `getPublicService` show only active published services in active categories. Ratings and the review list use `Review.status = APPROVED`. Search matches either locale name, returns at most 8 rows, and does not load galleries. The service page renders TipTap JSON through `RichTextView` and up to 4 related published services from the same category. Packages, SKU, variants, and compare-at prices are not returned.

### Interface

- The hero renders database text over the stored image. Desktop and mobile images use `object-contain` at their natural ratio. Desktop copy stays in a physical left column; Arabic text direction is applied inside that column. One slide hides the carousel controls. Multiple slides advance every 6 seconds, pause on hover, focus, and reduced motion, and support arrows, dots, and touch swipe.
- The menu opens a right-side dialog. The backdrop darkens and blurs the page. The panel stays sharp, is about `min(90vw, 30rem)`, locks body scroll, traps focus, and closes on the close button, backdrop, Escape, and category navigation. Rows are compact and fully clickable. A missing category image uses a grid icon.
- Search is a debounced overlay, 300ms, over the public search API. Results show the cover, localized name, price, and currency, and link to the service page.
- Homepage sections render in admin order: featured category, featured services, category services, and custom collections. Empty categories omit the category grid. Empty service sections are omitted by the query.
- The footer uses the existing verified Mafateeh contact details. Privacy and terms are hidden because no destination URL is configured.
- Banner destinations still go through `bannerDestinationHref`. Same-page anchors stay on the current page.

### SEO

Homepage metadata uses the existing `Metadata` messages. Category and service metadata prefer `seoTitle` and `seoDescription`, then the visible title and description. Each page sets a canonical URL and `en`, `ar`, and `x-default` alternates.

### Files created

- `src/app/[locale]/categories/[slug]/page.tsx`
- `src/app/[locale]/services/[slug]/page.tsx`
- `src/app/api/search/route.ts`
- `src/components/storefront/hero-carousel.tsx`
- `src/components/storefront/home-content.tsx`
- `src/components/storefront/service-card.tsx`

### Files modified

- `src/app/[locale]/layout.tsx`
- `src/app/[locale]/page.tsx`
- `src/components/layout/site-footer.tsx`
- `src/components/layout/site-header.tsx`
- `src/components/layout/storefront-shell.tsx`
- `src/components/storefront/category-drawer.tsx`
- `src/components/storefront/search-panel.tsx`
- `src/components/ui/overlay.tsx`
- `src/components/ui/stored-image.tsx`
- `src/features/categories/get-public-categories.ts`
- `src/features/categories/types.ts`
- `src/features/homepage/get-public-homepage.ts`
- `src/features/services/get-public-services.ts`
- `src/messages/en.json`
- `src/messages/ar.json`
- `PROJECT_MEMORY.md`

### Files deleted

No tracked files were deleted. A route-level `src/app/[locale]/loading.tsx` was tried and removed: with Cache Components it kept missing category and service URLs on an HTTP 200 skeleton instead of rendering the not-found page.

### Checks

On 2 November 2026, `npx tsc --noEmit`, `npm run lint`, `npm run db:validate`, and `npm run build` passed. Production HTTP checks against `http://localhost:3010` confirmed the English and Arabic homepages, the hero and promotional copy, the six active categories, English and Arabic category pages, the compact empty-service state, and empty search results for English and Arabic queries. The database currently has no published services, homepage sections, or reviews, so service cards, galleries, ratings, and a real service page could not be exercised. No browser automation was available, so the drawer animation, backdrop blur, swipe, keyboard focus, and the 1440, 768, 390, and 360 layouts were not click-tested.

### Remaining

Missing category and service slugs render the localized not-found UI in the response payload and include a 404 digest, but Cache Components still returns HTTP 200 for those partial routes. The initial HTML shell does not contain the not-found heading until client JavaScript applies the payload. Purchasing is not implemented. Homepage layout corrections are in section 26.

## 26. Homepage rendering corrections

Prompt 10 corrected the homepage. The admin dashboard was not changed.

### Image bug

English and Arabic already received the same banner and category images. A comparison of `/en` and `/ar` showed ten `data:image` sources on each page, with identical payload lengths. The query does not hide images by locale. Images belong to the banner or category record. Translations only change the text.

`StoredImage` rendered every picture with `opacity-0` until `onLoad`. A Base64 data URL finishes loading while the browser parses the first HTML response, before React hydration can attach that handler. The English landing page therefore kept the pictures invisible. Switching to Arabic mounted the images in the browser and the load event was observed, so the pictures appeared. The fix renders a valid stored image at full opacity immediately and still replaces a broken source with the existing fallback. No external image host was added.

### Layout

- The hero is full width, with no centered container. Desktop height is `clamp(35rem, 46vw, 42.5rem)`, about 560–680px, and the desktop image uses `object-contain` inside that frame. The mobile image keeps its natural ratio. Copy stays in the open left area in both languages so the artwork remains visible. Arabic text is RTL inside that area. The hero button is `#ca9733`, with `#a67b28` on hover and deep-green text.
- Promotional banners are a full-width section. The image spans the viewport and the localized copy sits over it, on the left in English and on the right in Arabic. Multiple banners fade between slides. A banner without a destination is not a link.
- `ValuePropositions` adds three static editorial cards after the dashboard homepage sections: Integrated Solutions, Solutions Built Around Your Business, and Continuous Development. They are Mafateeh value statements, not customer quotations. Desktop shows three cards, tablet two, and mobile a carousel with previous, next, and indicators.

### Files created

- `src/components/storefront/promo-banners.tsx`
- `src/components/storefront/value-propositions.tsx`

### Files modified

- `src/components/ui/stored-image.tsx`
- `src/components/storefront/hero-carousel.tsx`
- `src/components/storefront/home-content.tsx`
- `src/app/[locale]/page.tsx`
- `src/app/globals.css`
- `src/messages/en.json`
- `src/messages/ar.json`
- `PROJECT_MEMORY.md`

### Checks

On 2 November 2026, `npx tsc --noEmit`, `npm run lint`, `npm run db:validate`, and `npm run build` passed. HTTP checks confirmed both locales serve the same image payloads, no `opacity-0` on those images, the full-width hero frame, the gold hero button, and both value-section headings. No browser automation was available, so the 1920, 1440, 768, 390, and 360 layouts were not click-tested and no screenshots were captured.

## 27. Homepage rhythm and testimonials

Prompt 11 refined the homepage without changing the admin dashboard or image storage.

The tall hero frame was letterboxing the image, which left a band of empty space under the header. The desktop and mobile heroes now use the image's own height at full width, so the artwork starts at the header. Text stays in the image's open left area, with Arabic reading right to left inside that area. The hero button remains `#ca9733`.

Promotions are editorial rows in the content container: image and text side by side, alternating sides, with the same image-then-text stack on small screens. Text is not overlaid on the image. Rows come from active scheduled `HOME_PROMO` banners.

`src/components/storefront/value-propositions.tsx` was removed.

`listHomepageTestimonials` loads up to 12 `APPROVED` reviews for published services in active categories. The customer name comes from the account. There is no location field on `User`, so location is omitted for real reviews. An avatar is shown only when it is a stored data URL. "Read review" links to the service. In production, an empty approved list renders the compact empty state. Outside production, and only when that list is empty, three bilingual preview items are loaded from `src/features/reviews/preview-testimonials.ts`. Each preview card is labeled as example content. Preview rows are not written to PostgreSQL.

The carousel shows three cards from 1280px, two from 768px, and one below that. Previous, next, page indicators, swipe, and arrow keys move it. Motion is removed when the user prefers reduced motion. It does not autoplay.

### Files created

- `src/components/storefront/testimonial-carousel.tsx`
- `src/features/reviews/types.ts`
- `src/features/reviews/get-public-testimonials.ts`
- `src/features/reviews/preview-testimonials.ts`

### Files modified

- `src/app/[locale]/page.tsx`
- `src/components/storefront/hero-carousel.tsx`
- `src/components/storefront/promo-banners.tsx`
- `src/messages/en.json`
- `src/messages/ar.json`
- `PROJECT_MEMORY.md`

### Files deleted

- `src/components/storefront/value-propositions.tsx`

### Checks

`npx tsc --noEmit`, `npm run lint`, `npm run db:validate`, and `npm run build` passed. Dev HTTP checks of `/en` and `/ar` showed the natural-height hero, the editorial promotion, the localized review heading, and the preview label. A production server check of `/en` showed the review heading and the empty-state sentence, with no preview label. No browser automation was available, so the requested screenshots and viewport click-tests were not captured. Production exclusion is enforced by `NODE_ENV === "production"` before the preview module is imported.

## 28. Visual homepage builder

Prompt 12 replaced the Homepage Content tabs with one builder and made the public homepage follow a single saved order.

`HomepageLayoutItem` stores that order. Block types are `HERO_CAROUSEL`, `PROMOTIONAL_BANNER`, `CATEGORY_CAROUSEL`, `HOME_SECTION`, and `TESTIMONIAL_CAROUSEL`. A promotional banner or home section points at its existing record. The three carousels do not. A partial unique index allows only one hero, one category carousel, and one testimonial carousel. A check constraint requires the matching reference. Deleting a banner or section cascades its layout row. Hiding a block sets `isVisible` and leaves the content in place. `isActive` on a banner or section is still the content's own inactive state.

Migration `20261103071000_add_homepage_layout` created the table and backfilled the previous public order: hero when hero slides exist, category carousel, non-featured sections, each promotional banner, featured-category sections, then testimonials. Existing banner, translation, image, and section rows were not copied. On 3 November 2026 the backfill produced hero, category carousel, two separate promotions, and testimonials.

Creating a promotion or section also appends its layout row in the same transaction. Creating a hero slide creates the hero block when it is missing. Reorder writes every block's `sortOrder` in one transaction and rejects an ID list that is not the full current set. Admin routes are `POST /api/admin/homepage/layout`, `PATCH /api/admin/homepage/layout/reorder`, `PATCH /api/admin/homepage/layout/[id]/visibility`, and `DELETE /api/admin/homepage/layout/[id]`. All require an administrator session.

The builder uses `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` for the structure list, plus move-up and move-down buttons. Forms for slides, promotions, and sections open in a dialog and reuse the existing validation and Base64 image storage. English and Arabic preview controls sit on the same page.

`getPublicHomepage` returns `blocks` in layout order. Hidden, inactive, unscheduled, unpublished, or empty blocks are omitted. The page renders that array directly. Promotions stay editorial and can sit apart from each other. The category grid was replaced by a carousel titled "Explore Our Solutions" / "اكتشف حلولنا", with three cards from 1280px, two from 768px, and one below that. It advances every 5 seconds, pauses on hover and focus, stops when the user prefers reduced motion, and does not autoplay for a single page. Header account, cart, search, and menu controls are icons only; accessible names and the disabled account and cart behavior remain. The testimonial carousel is unchanged and now renders only when its layout block is visible. Approved-review loading and the development-only preview guard were not replaced.

### Dependency added

- `@dnd-kit/core` 6.3.1
- `@dnd-kit/sortable` 10.0.0
- `@dnd-kit/utilities` 3.2.2

### Files created

- `prisma/migrations/20261103071000_add_homepage_layout/migration.sql`
- `src/app/api/admin/homepage/layout/route.ts`
- `src/app/api/admin/homepage/layout/reorder/route.ts`
- `src/app/api/admin/homepage/layout/[id]/route.ts`
- `src/app/api/admin/homepage/layout/[id]/visibility/route.ts`
- `src/components/storefront/category-carousel.tsx`

### Files modified

- `prisma/schema.prisma`
- `package.json`
- `package-lock.json`
- `src/server/admin/homepage.ts`
- `src/validations/homepage.ts`
- `src/features/homepage/get-public-homepage.ts`
- `src/components/dashboard/homepage-manager.tsx`
- `src/app/admin/(panel)/homepage/page.tsx`
- `src/app/[locale]/page.tsx`
- `src/components/storefront/home-content.tsx`
- `src/components/storefront/hero-carousel.tsx`
- `src/components/storefront/promo-banners.tsx`
- `src/components/storefront/testimonial-carousel.tsx`
- `src/components/layout/site-header.tsx`
- `src/messages/en.json`
- `src/messages/ar.json`
- `PROJECT_MEMORY.md`

### Files deleted

- `src/components/dashboard/homepage-preview.tsx`

### Checks

On 3 November 2026, `npx tsc --noEmit`, `npm run db:validate`, and `npm run build` passed. `npm run lint` passed with one existing warning in `testimonial-carousel.tsx` about a hook dependency. Dev HTTP checks of `/en` and `/ar` showed the same block order as the saved layout: hero, category carousel, the first promotion, the second promotion, then testimonials. The old category-grid heading was absent. Header account text was not a visible label, and the English account control still had its accessible name. No browser automation was available, so drag-and-drop, carousel clicks, swipe, autoplay, and the 1920, 1440, 768, 390, and 360 screenshots were not captured.

### Remaining

The two current promotions are next to each other because that is the backfilled order. The builder can place other blocks between them. There are still no approved reviews, so production shows the testimonial empty state and development shows the labeled preview items. Account and cart stay disabled. Purchasing is still out of scope.

## 29. Homepage visual corrections

Prompt 13 adjusted layout only. Ordering, drag-and-drop, modals, and image storage are unchanged.

The Homepage Builder preview is the left column. Page Structure is the right column, at least 300px and up to 32% of the row, and it sticks below the admin header. Titles wrap onto two lines instead of being truncated. Actions sit on their own row. On small screens the preview stacks above the panel. The builder page drops the 72rem content cap through `main:has(.homepage-builder)`.

Category cards use `FramedArtwork`: a blurred cover of the same image sits behind a contained copy, so the full artwork stays visible and the frame is filled with the image colors. The carousel section, track, and viewport have no shadow or card border. Only each card has a shadow, a thin green border, and a hover lift.

The public header height is `--header-height` (`4.5rem`, `5.5rem` from 768px). The hero minimum height is `calc(100svh - var(--header-height))`. Desktop keeps the sharp image contained and full width, with the blurred copy filling the extra height. That avoids cropping the laptop and phone. The stored desktop artwork is a wide banner, so the sharp image does not itself fill a viewport-tall frame; a source near 1.9:1 would. Mobile uses the mobile artwork on a cream field, aligned to the bottom, with no blurred green layer at the top. Hero text uses the shared `--container` margins. The button stays `#ca9733` with dark green text, a light gold shadow, and a small hover lift.

### Files created

- `src/components/ui/framed-artwork.tsx`

### Files modified

- `src/app/globals.css`
- `src/components/dashboard/admin-layout.tsx`
- `src/components/dashboard/homepage-manager.tsx`
- `src/components/layout/site-header.tsx`
- `src/components/storefront/hero-carousel.tsx`
- `src/components/storefront/category-carousel.tsx`
- `PROJECT_MEMORY.md`

### Checks

On 3 November 2026, `npx tsc --noEmit`, `npm run db:validate`, and `npm run build` passed. `npm run lint` still reports the existing `testimonial-carousel.tsx` hook warning. No browser automation was available, so the requested screenshots and viewport passes were not captured.

The category section background stays transparent. Cards sit 1.5rem apart, and each card has a soft shadow (`0 12px 22px -8px`) with padding inside the carousel so the shadow is not clipped into a band. The public hero is one banner, not a carousel. On phones it starts at the top of the page, underneath the header, and the text starts just below the header. On desktop the banner displays at 2:1 (`1920 × 960`). The text block sits a little above the vertical center, and the title can run to 40rem so it wraps in fewer lines. Phones stay at 4:5 (`1080 × 1350`). The banner is full width, with space left below. The store uses Manrope for Latin text and Cairo for Arabic. The homepage builder edits that single banner and refuses a second hero image. The side menu lists service categories only. Homepage promotional banners stay on the page.

## 30. Category listing pages

The public category page is the existing `/[locale]/categories/[slug]` route. It reads the active category through `getPublicCategory` and the published services through `listCategoryServices`.

The banner uses the category's stored image at its own width and height, so a 1920 × 430 upload keeps the illustration visible. HTML sits on the right of that artwork: a small `MAFATEEH` label, a short green underline, the translated title, and the translated description. English text in that block is left to right. Arabic text is right to left. A missing banner keeps the same light panel and the text. The breadcrumb sits above the banner.

Under the banner, a toolbar offers Featured, Newest, Price low to high, Price high to low, and Highest rated. Featured, newest, and price use the service columns. Highest rated orders by the average of approved reviews, with unrated services last. The result count is the published services in that category. Twelve services are loaded per page. The page query is kept with the selected sort. Pagination is omitted when everything fits on one page. Changing the sort returns to the first page.

Category cards are a separate component from the homepage card. Each card uses the square cover, a centered name, a two-line description, the category name, a featured label only when the service is featured, an approved rating only when one exists, the single price in red with its currency, and a full-width green View Service button that opens the service page. The grid is one column below 400px, two columns from there, three from the large breakpoint, and four from the extra-large breakpoint.

An unknown or inactive slug calls `notFound()` before the response streams. A request for `/en/categories/this-slug-does-not-exist` returned HTTP 404.

Linkin.sa could not be opened from this environment, so its computed font was not identified. Arabic text uses IBM Plex Sans Arabic, self-hosted from the official OFL files in `src/fonts/ibm-plex-sans-arabic/` with `license.txt`. English stays on Manrope. No Google Fonts request is made for the Arabic face.

No sample service was seeded. The AI, IT & Business Automation category already had one published service, `ai-content-copywriting`. The other five active categories had no published services and showed the empty state.

### Files created

- `src/components/storefront/category-banner.tsx`
- `src/components/storefront/category-service-card.tsx`
- `src/components/storefront/category-toolbar.tsx`
- `src/components/storefront/category-pagination.tsx`
- `src/fonts/ibm-plex-sans-arabic/IBMPlexSansArabic-Regular.woff2`
- `src/fonts/ibm-plex-sans-arabic/IBMPlexSansArabic-Medium.woff2`
- `src/fonts/ibm-plex-sans-arabic/IBMPlexSansArabic-SemiBold.woff2`
- `src/fonts/ibm-plex-sans-arabic/IBMPlexSansArabic-Bold.woff2`
- `src/fonts/ibm-plex-sans-arabic/license.txt`

### Files modified

- `src/app/[locale]/categories/[slug]/page.tsx`
- `src/features/services/get-public-services.ts`
- `src/app/fonts.ts`
- `src/app/globals.css`
- `src/messages/en.json`
- `src/messages/ar.json`
- `PROJECT_MEMORY.md`

### Checks

On 3 November 2026, `npx tsc --noEmit`, `npm run lint`, `npm run db:validate`, and `npm run build` passed. Lint still reports the existing `testimonial-carousel.tsx` hook warning. HTTP checks of all six category slugs in English and Arabic returned 200, the translated result counts, and the empty state where no service is published. Highest-rated sorting returned 200. A missing slug returned 404. No browser automation was available, so the 1920, 1440, 1024, 768, 390, and 360 layouts were not screenshotted and the sort dropdown was not clicked.

## 31. Service rich-text descriptions

The service form keeps the existing TipTap editor and its toolbar. English and Arabic each have their own editor. Both stay mounted, and the inactive language is hidden, so switching tabs does not clear the other document. The editors mount only after an existing service has loaded, so reopening fills each editor from that language's saved JSON.

English TipTap JSON is stored on the English `ServiceTranslation.detailedDescription`. Arabic JSON is stored on the Arabic translation. Short descriptions stay plain text for cards and category listings. The service page renders the detailed description with `RichTextView`. No `dangerouslySetInnerHTML` is used.

### Checks

On 3 November 2026, a temporary unpublished draft was created with both languages. The English document included H1–H3, bold, italic, underline, strikethrough, text color, highlight, a link, bullet and numbered lists, a blockquote, a horizontal rule, alignment, and a table. The Arabic document was a separate right-aligned heading and bold paragraph. Reopening returned both documents unchanged, including the short descriptions. An English-only edit was saved, and the Arabic document stayed as it was. The temporary service was then deleted. The check did not click through the dashboard, because no browser automation was available.

## 32. Category add to cart

The category card body links to `/services/[slug]`. The Add to cart button is outside that link. Clicking it adds the published service to a browser cart stored in `localStorage` under `mafateeh.cart`, increases the quantity when the same service is added again, and opens the cart drawer. The header bag shows the quantity and opens the same drawer. Cover images are not stored in the cart. This is not the database `Cart` model, and it does not sign the customer in or start checkout.

### Files created

- `src/features/cart/cart-provider.tsx`
- `src/components/storefront/add-to-cart-button.tsx`

### Files modified

- `src/components/storefront/category-service-card.tsx`
- `src/components/storefront/cart-drawer.tsx`
- `src/components/layout/site-header.tsx`
- `src/components/layout/storefront-shell.tsx`
- `src/messages/en.json`
- `src/messages/ar.json`
- `PROJECT_MEMORY.md`

## 33. Service detail page

The service page gallery keeps the cover as the large image. Each thumbnail, including the cover, is a button. Choosing one replaces the large image. The details column is the title, star rating, short description, price, and Add to cart. A service with no approved reviews shows four filled stars. A thin light-gray line separates that block from the detailed description, which has no heading.

Approved reviews open with the rating summary: the average beside five dark stars, the review count, the share of reviews scored 4 or 5, and a bar for each star from 5 down to 1. A light gray line separates the reviews from the description above. The list then shows a small person image, the author, date, stars, and comment. A stored avatar is used when the account has one. Otherwise a person icon is shown. The list is omitted when there are none. There is no helpful or like control. A signed-in active user sees a review form with a star picker and a text area. The review is saved as `PENDING` and stays off the public page until an admin approves it. A visitor without a session does not see the form.

Similar services lists up to three other published services from the same category, using the category card. The section is omitted when there are no others.

### Files created

- `src/components/storefront/service-gallery.tsx`
- `src/components/storefront/service-stars.tsx`
- `src/components/storefront/review-form.tsx`
- `src/server/auth/storefront-user.ts`
- `src/server/storefront/reviews.ts`
- `src/app/api/reviews/route.ts`

### Files modified

- `src/app/[locale]/services/[slug]/page.tsx`
- `src/features/services/get-public-services.ts`
- `src/messages/en.json`
- `src/messages/ar.json`
- `PROJECT_MEMORY.md`

## 34. Cart page

The side cart drawer is no longer mounted. The header bag links to `/[locale]/cart` and still shows the quantity. Adding a service keeps the shopper on the current page.

The cart page starts with a breadcrumb. Each saved service is a row with its cover, name, selling price, compare-at price when that price is higher, quantity controls, line total, and a remove control. The second column is the order summary: products total, grand total with the product count, and Complete order. The button does not start checkout. Prices and images are loaded from the published service records. The browser cart still stores only the service id, name, price text, currency, and quantity.

### Files created

- `src/app/[locale]/cart/page.tsx`
- `src/app/api/cart/services/route.ts`
- `src/components/storefront/cart-view.tsx`
- `src/features/cart/get-cart-services.ts`

### Files modified

- `src/features/cart/cart-provider.tsx`
- `src/components/layout/site-header.tsx`
- `src/messages/en.json`
- `src/messages/ar.json`
- `PROJECT_MEMORY.md`

### Files deleted

- `src/components/storefront/cart-drawer.tsx`

## 35. Customer email sign-in

The header account icon opens a centered sign-in modal. The shopper enters an email and receives a 6-digit code. Filling the last digit checks the code without a separate button. A returning customer with a completed profile is signed in, and the first name appears beside the icon. A first-time customer then enters a first name, last name, and phone number. There is no newsletter checkbox and no social sign-in.

The sign-in email is an HTML message in the store green and gold, with the white Mafateeh logo embedded. A mobile number is checked against the selected country, including a leading zero. The signed-in account menu lists Profile and Sign out. Profile opens My Account. The code is stored only as an HMAC hash on `EmailOtp`, expires after 5 minutes, and locks after 5 wrong attempts. A new code can be sent after 60 seconds. The customer session cookie is `mafateeh_customer_session` and is separate from the administrator session. Reviews use this customer session.

### Files created

- `src/server/auth/customer-session.ts`
- `src/server/auth/customer-mailer.ts`
- `src/server/auth/customer-otp.ts`
- `src/validations/customer-auth.ts`
- `src/app/api/auth/email/route.ts`
- `src/app/api/auth/verify/route.ts`
- `src/app/api/auth/profile/route.ts`
- `src/app/api/auth/logout/route.ts`

### Files modified

- `src/server/auth/storefront-user.ts`
- `src/components/storefront/account-modal.tsx`
- `src/components/layout/site-header.tsx`
- `src/components/layout/storefront-shell.tsx`
- `src/messages/en.json`
- `src/messages/ar.json`
- `PROJECT_MEMORY.md`

## 36. Customer account page

Profile in the header opens My Account. The page has a side menu for Orders, Wishlist, Loyalty points, My Account, and Sign out. Orders lists the customer's service orders. Wishlist is filled from the heart on each service card: an empty heart saves the service and turns into a red filled heart. Loyalty points are a number on each service, set by the administrator when creating or editing it, and they are added to the customer once when a paid order moves to paid, processing, or completed. My Account edits the first name, last name, email, phone, and profile photo. A changed email is saved only after a confirmation code sent to the new address is entered. The phone control is a searchable country list with a round flag, the country name, and the calling code, and the same control is used on the registration form.

## 37. Static homepage testimonials

The "What Our Customers Say" block no longer loads customer reviews. It shows six written testimonials in English and Arabic. Three cards are visible on a wide screen, and the row advances on its own like the category carousel. The cards use the same shadow as Explore Our Solutions, with a wider gap and no arrows or dots. It pauses when hovered and stays still when reduced motion is requested.

## 38. Dashboard list tables

The Reviews, Orders, and Customers lists use the same white card as Categories: a rounded border, white background, and soft shadow, with the page controls inside the card. Only the columns differ. View on a review opens the details in a dialog over the page.

## 39. Store policies and cart icon

The store has its own Privacy Policy, Terms & Conditions, Cookie Policy, and Accessibility pages in English and Arabic. Their links replace the Company column in the footer. The header cart control uses a cart icon. The header icons and profile photo are larger than the earlier 24px icons and 32px photo. The signed-in name beside them is a medium size, larger than the original small label. A downward arrow sits at the bottom of that name, and the photo, name, and arrow open the account menu together. The menu does not repeat the name. On a phone the cart and the language switch live in the side menu. On a phone the hero shows the uploaded banner below the header at its own shape, and the text sits in the open area at the top of that image, above the artwork. The name stays beside the profile photo.

## 40. Customer login hardening

Sign-in and email-change codes are 6 digits. A wrong attempt is recorded with a conditional increment before the code is compared, so parallel guesses cannot all pass a stale attempt count. An email is limited to 5 verification failures in 15 minutes and 5 code requests in an hour. Unknown, administrator, and suspended addresses get the same success response as a customer and no email is sent. A taken address on email change gets that same response, and confirmation of a taken address returns the ordinary invalid-code result. The listed customer routes also have a per-IP limit. Expired or consumed `EmailOtp` rows older than one day are deleted on the next code write, and `npx tsx scripts/cleanup-email-otp.ts` does the same cleanup on demand.

### Files created

- `src/server/auth/request-limit.ts`
- `scripts/cleanup-email-otp.ts`

### Files modified

- `src/server/auth/customer-otp.ts`
- `src/validations/customer-auth.ts`
- `src/app/api/auth/email/route.ts`
- `src/app/api/auth/verify/route.ts`
- `src/app/api/auth/profile/route.ts`
- `src/app/api/account/route.ts`
- `src/app/api/account/email/route.ts`
- `src/app/api/reviews/route.ts`
- `src/app/api/wishlist/route.ts`
- `src/components/storefront/account-modal.tsx`
- `src/components/storefront/account-form.tsx`
- `src/app/[locale]/account/orders/page.tsx`
- `PROJECT_MEMORY.md`

## 41. Request limits, origin checks, and security headers

Request limits use a fixed window stored in `RateLimitWindow`, so they survive a restart. The in-memory store remains available for tests. `TRUSTED_PROXY_HEADER` is empty by default, and forwarded addresses are ignored until it is set. Administrator sign-in is limited by IP and email together, waits longer after each attempt, and still runs a password hash when the account does not exist. Every POST, PUT, PATCH, and DELETE under `src/app/api` checks the request origin. JSON and catalog bodies are capped: 16 KB for auth, 64 KB for ordinary admin forms, 12 MB for image forms, and 60 MB for catalog import. Responses send a content security policy, HSTS, nosniff, a strict referrer policy, a permissions policy, and `frame-ancestors 'none'`. The `X-Powered-By` header is off.

## 42. Sessions and passwords

`User.sessionVersion` is stored in the administrator and customer session tokens. Authorization, the storefront user lookup, and customer account actions reject a token whose version does not match the account. Password changes, administrator email changes, customer email changes, and a customer status other than active increment the version, so older sessions stop. The person who just changed their own credentials receives a new token. Session keys and the OTP hash key are derived from `SESSION_SECRET` with HKDF, and tokens are checked as HS256 with an issuer and audience. New password hashes store the scrypt cost as `scrypt$N$r$p$salt$hash` with N at 2^17. Older hashes still verify, and a successful sign-in replaces an outdated hash. Administrator email changes require the current password. New administrator passwords must be at least 12 characters. `npm run admin:bootstrap` asks for the password without echoing it when `SUPER_ADMIN_PASSWORD` is not set. The local database port is bound to 127.0.0.1.

## 43. Image delivery

Uploaded images stay in PostgreSQL. Public list queries return `/media/<kind>/<id>?v=<updatedAt>` and do not select the base64 column. The media route reads one image column, checks the same visibility rules as the public pages, and sends a long-lived cache header. Drafts stay available to a signed-in administrator. Avatars are private unless they appear on an approved public review. A missing mobile banner is resized from the desktop image and cached in memory. New uploads are checked with sharp, re-encoded to WebP, kept as PNG when they need transparency, and limited to 2560 px for banners, 1600 px for covers, and 512 px for avatars. Existing rows are left unchanged until `npx tsx scripts/optimize-images.ts` is run. `--dry-run` prints the size difference first. `listPublicServices` returns at most 48 services. Search and category responses send a short public cache header.

## 44. Database integrity

An earn for an order is unique. A second credit for the same order does nothing, and a zero-point order does not create a transaction. Order status changes only when the stored status is still the one that was read. Review ratings, item quantities, and loyalty balances have database checks. Emails are also unique without regard to case. Old category and service links are kept and answered with a 301 when a slug changes later. Catalog import checks banner links, slug and section-key format, and requires English and Arabic for published or active records. The import audit row is written in that same transaction.

## 45. Search metadata

`SITE_URL` is required. Canonical and language links are absolute. The sitemap lists active categories and published services in English and Arabic. Robots excludes `/admin` and `/api`. Home, category, and service pages send Open Graph and Twitter cards that use the media image address. Structured data includes the organization, breadcrumbs, and a service rating only when approved reviews exist. A service page loads its record once for both the metadata and the page. Empty image text, or text in the other language, uses the localized name.









