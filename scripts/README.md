# Scripts Guide

All project scripts are runnable from root with `pnpm run <script-name>`.

## Offline Windows Workflow
- `pnpm run offline:check`
- `pnpm run db:export:full`
- `pnpm run db:import:full`
- `pnpm run windows:start`
- `powershell -ExecutionPolicy Bypass -File scripts/setup-offline.ps1`
- `powershell -ExecutionPolicy Bypass -File scripts/backup-offline.ps1`
- `powershell -ExecutionPolicy Bypass -File scripts/restore-offline.ps1`

## Auth/Admin
- `pnpm run script:create-admin`
- `pnpm run script:reset-admin-password:js`
- `pnpm run script:reset-admin-password:ts`

## Laboratory Seeding/Migrations
- `pnpm run script:seed-lab-radiology` (runs lab + radiology seed flow)
- `pnpm run script:insert-lab-templates`
- `pnpm run script:seed-lab-test-templates`
- `pnpm run script:seed-collect-tests-to-templates`
- `pnpm run script:migrate-labtest-statuses:js`
- `pnpm run script:migrate-labtest-statuses:ts`
- `pnpm run script:remove-template-gender-ranges`
- `pnpm run script:remove-labtest-gender-ranges`
- `pnpm run script:backfill-labtest-template-parameters`

## Radiology
- `pnpm run script:seed-radiology-templates`

## Data Transfer
- `pnpm run script:export-laboratory-data`
- `pnpm run script:import-laboratory-data`
- `pnpm run db:export:full` (full MongoDB export using Extended JSON)
- `pnpm run db:import:full` (full MongoDB destructive restore into a local offline database)
- `pnpm run script:sync-exported-lab-templates` (non-destructive: updates existing templates and creates missing ones from `exports/lab-test-templates.json`)

## Important Safety Notes
- Most scripts modify database records.
- `script:seed-collect-tests-to-templates` depends on a hardcoded block in `collect/page.tsx` and may fail in current codebase.
- `script:import-laboratory-data` is destructive (it runs `deleteMany` before import).
- `db:import:full` is destructive and drops existing collections before restore.
- `script:sync-exported-lab-templates` is safe for existing data (no collection wipe).
- To run import, you must set:
  - `ALLOW_DESTRUCTIVE_IMPORT=true`
- Connection values come from `.env.local`:
  - export uses `EXPORT_MONGODB_URI` (fallback `MONGODB_URI`)
  - import uses `IMPORT_MONGODB_URI` (fallback `MONGODB_URI`)
  - offline runtime requires `APP_MODE=offline` and a local `MONGODB_URI`
