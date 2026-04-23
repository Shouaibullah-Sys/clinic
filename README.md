# Sajad Barakzai Hospital Offline Setup

This app now supports an offline-first Windows localhost deployment using a local MongoDB Community Server instance. The application remains a Next.js web app and should be opened in a browser at `http://localhost:3000`.

## Windows Offline Prerequisites

- Node.js LTS
- `pnpm`
- MongoDB Community Server running locally

## Environment Setup

Create `.env.local` from `.env.offline.example` if needed:

```bash
cp .env.offline.example .env.local
```

Required offline values:

```env
APP_MODE=offline
MONGODB_URI=mongodb://127.0.0.1:27017/sajad_barakzai_hospital
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Start The App

Development:

```bash
pnpm run offline:check
pnpm dev
```

Production-like local run:

```bash
pnpm run offline:check
pnpm build
pnpm start
```

On Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-offline.ps1
powershell -ExecutionPolicy Bypass -File scripts/start-offline.ps1
```

## Full Database Migration

Export from the current source database:

```bash
EXPORT_MONGODB_URI="your-source-uri" pnpm run db:export:full
```

Restore into the local offline MongoDB database:

```bash
ALLOW_DESTRUCTIVE_IMPORT=true pnpm run db:import:full
```

PowerShell helpers:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/backup-offline.ps1 -SourceUri "your-source-uri"
powershell -ExecutionPolicy Bypass -File scripts/restore-offline.ps1
```

The full backup writes Extended JSON files under `exports/full-backup`, preserving MongoDB types such as `ObjectId` and `Date`.

## Notes

- Offline mode rejects remote MongoDB URIs at runtime.
- The intended deployment target is one Windows PC running the app locally in a browser.
- Laboratory-only import/export scripts still exist, but the recommended migration path is `db:export:full` and `db:import:full`.
