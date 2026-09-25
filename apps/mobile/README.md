# WealthGuard Mobile

Expo (React Native) client for the live WealthGuard API.

## API

Configured to:

- `https://wealthguard-api.vercel.app/api`
- Web: `https://wealthguard-web.vercel.app`

Override in `apps/mobile/.env` if needed.

## Run (dev)

```bash
cd apps/mobile
pnpm start
```

Scan the QR code with **Expo Go** on your phone (same Wi‑Fi for local; for live API, Expo Go works from anywhere).

## Features (parity with web)

- Login / signup (JWT in SecureStore)
- Home: savings hero, 6-month income vs expense chart, category breakdown, upcoming dues, recent transactions
- Loans: search + status/type filters, add/edit with AI document extraction (upload or pick from library), attachments, amortization schedule, delete
- EMI schedule: record/edit each installment with a receipt upload, bulk "mark paid" (all / until this month) and foreclosure
- Expenses: search + category/payment/date filters, add/edit with receipt scan auto-fill, delete
- Income: search + category/date filters, add/edit, delete
- Recurring bills and categories: add, edit, activate/pause, delete
- Native date pickers, confirm dialogs, inline field validation
- Theme taken from the WealthGuard logo (navy → teal background, blue → green accents)

## Build installable APK

1. Create a free Expo account: https://expo.dev/signup
2. From `apps/mobile`:

```bash
npx eas-cli login
npx eas-cli build:configure
pnpm build:apk
```

3. When the cloud build finishes, download the `.apk` from the Expo dashboard and install on your Android phone (enable “Install unknown apps” if prompted).

Updates: bump `expo.version` and `expo.android.versionCode` in `app.json`, build again, and install the new APK
over the old one — same package and signing key, so it upgrades in place and you stay signed in.

`eas.json` profile `preview` produces an **APK** (not Play Store AAB).
