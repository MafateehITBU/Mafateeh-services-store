# Mafateeh Store

Mafateeh Store is a bilingual e-commerce platform for Mafateeh services. This repository currently contains the application foundation: one Next.js application, PostgreSQL, and Prisma.

## Technologies

- Next.js 16 (App Router) and React 19
- TypeScript
- Tailwind CSS 4
- PostgreSQL 16
- Prisma ORM 7 with the PostgreSQL driver adapter
- Zod
- React Hook Form
- Lucide React

The storefront shell is available in English and Arabic. Administrators sign in with email and password. Customers will use email codes. Catalog management and payments are not implemented yet.

## Prerequisites

- Node.js 22.12 or newer (Node.js 22.19 is used in local development)
- npm 10 or newer
- Docker with Docker Compose, for the local PostgreSQL database

PostgreSQL 16 can also be installed directly on the machine. Use the same database name and connection string shown below.

## Installation

```bash
npm install
```

`npm install` generates the Prisma Client when `DATABASE_URL` is already available. Copy the environment file first if this is a new checkout.

## Environment configuration

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

`.env.example` contains the local development `DATABASE_URL`. Database credentials stay on the server. Do not prefix `DATABASE_URL` with `NEXT_PUBLIC_`, and do not commit `.env`.

The application validates `DATABASE_URL` in `src/lib/env.ts` before the Prisma Client is created. `SESSION_SECRET` must be at least 32 characters and signs the administrator session cookie. SMTP settings are reserved for future customer email codes and are not used by administrator sign-in.

`TRUSTED_PROXY_HEADER` is optional. Leave it empty when the app is reached directly. Set it to the header a trusted proxy uses for the client address, such as `x-forwarded-for`. Until it is set, forwarded addresses are ignored so a caller cannot pick their own rate-limit key.

## PostgreSQL

Start the local database:

```bash
docker compose up -d
```

The Compose file uses PostgreSQL 16, publishes port `5432`, stores data in the `mafateeh_postgres_data` volume, and checks readiness with `pg_isready`.

Stop it with:

```bash
docker compose down
```

`docker compose down` keeps the volume. `docker compose down -v` deletes the local database data.

If Docker is not available, create a PostgreSQL 16 database named `mafateeh_store` and set `DATABASE_URL` in `.env` to that instance.

## Prisma

Prisma 7 keeps the connection string in `prisma.config.ts` and connects at runtime through `@prisma/adapter-pg`. The relational schema lives in `prisma/schema.prisma`. The initial migration is `prisma/migrations/20261102082022_init`. Apply it to a new database with `npm run db:migrate`.

```bash
npm run db:validate
npm run db:generate
npm run db:migrate
npm run db:studio
```

- `db:validate` checks `prisma/schema.prisma`.
- `db:generate` generates the client into `src/generated/prisma`.
- `db:migrate` applies development migrations after the schema exists.
- `db:studio` opens Prisma Studio.

Use the project scripts or `npx prisma@7`. Do not run `npx prisma` without a version: the `latest` npm tag currently points at the Prisma 8 release candidate, which does not use this project's Prisma 7 configuration.

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The root path redirects to `/en`. Arabic is at `/ar`. The administration area is at [http://localhost:3000/admin/login](http://localhost:3000/admin/login) and does not use the storefront header.

## First administrator

The dashboard has no public registration. Administrators sign in with email and password. Create or update the super administrator from the command line:

```bash
SUPER_ADMIN_EMAIL="person@example.com" SUPER_ADMIN_PASSWORD="choose-a-long-password" npm run admin:bootstrap
```

On Windows PowerShell:

```powershell
$env:SUPER_ADMIN_EMAIL="person@example.com"; $env:SUPER_ADMIN_PASSWORD="choose-a-long-password"; npm run admin:bootstrap
```

The command reads `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, and `DATABASE_URL`. The password must be at least 12 characters. It stores only a hash. It creates that email as an active `SUPER_ADMIN`, or promotes an existing active account and sets the password. It does not change a deactivated or suspended account. Do not put a real address or password in source code.

Uploaded images are stored in PostgreSQL as base64 data URLs. They are not written to disk and are not sent to an image host. Static files such as the Mafateeh logo stay in `public/`.

## Production build

```bash
npm run build
npm start
```

The build generates the Prisma Client, then builds the Next.js application. `DATABASE_URL` must be set. The build does not require a running database until a feature actually queries it.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run lint` | Run ESLint |
| `npm run build` | Generate Prisma Client and create the production build |
| `npm start` | Start the production server |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:validate` | Validate the Prisma schema |
| `npm run db:migrate` | Run development migrations |
| `npm run db:studio` | Open Prisma Studio |
| `npm run admin:bootstrap` | Create or update the super administrator from `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` |
