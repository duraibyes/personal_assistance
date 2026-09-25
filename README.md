# WealthGuard — Personal Finance App

Monorepo for web (Next.js), API (Express), and mobile (Expo) with Neon PostgreSQL + Prisma.

## Apps

| App | Path | Default URL |
| --- | ---- | ----------- |
| Web | `apps/web` | http://localhost:4000 · live: https://wealthguard-web.vercel.app |
| API | `apps/api` | http://localhost:5000 — Swagger at `/api/docs` · live: https://wealthguard-api.vercel.app |
| Mobile | `apps/mobile` | Expo app → same live API; see `apps/mobile/README.md` for APK build |

## Setup

1. Copy `.env.example` to `.env` (and `apps/web/.env.local` for Next public vars).
2. Fill Neon `DATABASE_URL` / `DIRECT_URL`, `JWT_SECRET`, Cloudinary, and `GEMINI_API_KEY`.
3. Install and generate Prisma client:

```bash
pnpm install
pnpm --filter @repo/database generate
pnpm --filter @repo/database push
```

4. Start everything:

```bash
pnpm dev
```

## Database Migrations

> **Note:** Stop the dev server (`Ctrl+C`) before running any Prisma commands, otherwise you'll get an `EPERM` error because the running process locks the query engine DLL.

### Generate Prisma Client (after any schema change)

```bash
pnpm --filter @repo/database generate
```

### Push schema to DB (no migration history — good for prototyping)

```bash
pnpm --filter @repo/database push
```

### Create a migration (tracks history — recommended for production)

```bash
pnpm --filter @repo/database exec prisma migrate dev --name <migration_name>
```

### Apply pending migrations (CI / production)

```bash
pnpm --filter @repo/database exec prisma migrate deploy
```

### Open Prisma Studio (visual DB browser)

```bash
pnpm --filter @repo/database studio
```

### Full workflow after a schema change

```bash
# 1. Stop dev server (Ctrl+C)
# 2. Generate client + push schema
pnpm --filter @repo/database generate
pnpm --filter @repo/database push
# 3. Restart dev server
pnpm dev
```

## Cloudinary folders

Uploads go to:

`{CLOUDINARY_UPLOAD_FOLDER}/{entity}/{entityId}/{file}`

Example: `personal_assistant/loans/<loanId>/statement.pdf`

## Auth & admin

- JWT auth (`Bearer` for API; `auth_token` httpOnly cookie for web).
- `User.isAdmin = true` grants global access (cross-user). Set via DB for now; full RBAC later.

## Security tooling

- Pre-commit runs **gitleaks** (install CLI: `scoop install gitleaks` or `brew install gitleaks`).
- Never commit `.env` secrets. Rotate any secret pasted in chat.

## Vercel Deployment

Both **Web** and **API** are deployed as separate Vercel projects from this monorepo.

### Deploy API (Express → Serverless)

```bash
cd apps/api
vercel --yes        # links to your Vercel account
vercel --prod       # deploys to production
```

Set these environment variables in the Vercel dashboard for the API project:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Neon pooled connection string |
| `DIRECT_URL` | Neon direct connection string |
| `JWT_SECRET` | Strong random secret |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Your Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API secret |
| `CLOUDINARY_UPLOAD_FOLDER` | `personal_assistant` |
| `GEMINI_API_KEY` | Google Gemini API key |
| `CORS_ORIGIN` | Your web Vercel URL (e.g. `https://wealthguard-web.vercel.app`) |
| `NODE_ENV` | `production` |

### Deploy Web (Next.js)

```bash
cd apps/web
vercel --yes        # links to your Vercel account
vercel --prod       # deploys to production
```

Set these environment variables in the Vercel dashboard for the Web project:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | Your API Vercel URL (e.g. `https://wealthguard-api.vercel.app/api`) |

### Redeploy after env var changes

```bash
cd apps/api && vercel --prod
cd ../web && vercel --prod
```

- **Mobile on your phone**: Point `EXPO_PUBLIC_API_URL` at the **public HTTPS API**, then run Expo Go or an EAS build. The current mobile app is a placeholder until screens are built; no code change to domain logic is needed once the API URL is set.

## Shared UI (web)

Use `@/components/ui`: `Button` (primary/secondary/danger/ghost), `SaveButton` / `CancelButton`, `Input`, `Select`, `Modal`, `ConfirmDialog` (no `alert`/`confirm`).
