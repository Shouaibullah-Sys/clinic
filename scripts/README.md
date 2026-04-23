# Scripts Guide

All project scripts are runnable from root with `pnpm run <script-name>`.

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
- `pnpm run script:sync-exported-lab-templates` (non-destructive: updates existing templates and creates missing ones from `exports/lab-test-templates.json`)

## Important Safety Notes
- Most scripts modify database records.
- `script:seed-collect-tests-to-templates` depends on a hardcoded block in `collect/page.tsx` and may fail in current codebase.
- `script:import-laboratory-data` is destructive (it runs `deleteMany` before import).
- `script:sync-exported-lab-templates` is safe for existing data (no collection wipe).
- To run import, you must set:
  - `ALLOW_DESTRUCTIVE_IMPORT=true`
- Connection values come from `.env.local`:
  - export uses `EXPORT_MONGODB_URI` (fallback `MONGODB_URI`)
  - import uses `IMPORT_MONGODB_URI` (fallback `MONGODB_URI`)
