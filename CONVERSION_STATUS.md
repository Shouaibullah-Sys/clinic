# MongoDB → Prisma/SQLite Conversion Status

**Date:** 2026-05-04
**Session:** Completed auth routes + foundation

## ✅ COMPLETED

### Foundation Files
- `/prisma/schema.prisma` - All models defined for SQLite (no Prisma relations, just plain fields)
- `/prisma.config.ts` - Prisma 7.x config pointing to `DATABASE_URL`
- `/prisma/dev.db` - SQLite database created
- `/lib/prisma.ts` - PrismaClient using `@prisma/adapter-libsql` adapter
- `/lib/dbConnect.ts` - Compatibility shim (no-op, connects Prisma silently)
- `/lib/mongo-config.ts` - Deprecated, no-op functions
- `/lib/mongodb.ts` - Deprecated, no-op functions
- `.env.local` - Using `DATABASE_URL="file:./prisma/dev.db"`, `APP_MODE=offline`

### Auth Routes (6 files - manually converted, tested working)
- `/app/api/auth/login/route.ts` - Login with bcrypt, JWT tokens
- `/app/api/auth/register/route.ts` - Register admin/doctor/staff
- `/app/api/auth/logout/route.ts` - Clear tokens
- `/app/api/auth/me/route.ts` - Get current user, token refresh
- `/app/api/auth/refresh/route.ts` - Refresh access token
- `/app/api/auth/reset-password/route.ts` - Reset password

**Build Status:** Clean build, no TypeScript errors
**Runtime Status:** Auth works end-to-end (register → login → /me → logout)

## 🔄 STILL NEEDED (130+ files)

All other API routes still use Mongoose imports from `@/lib/models/` and `dbConnect()`:

| Priority | Module | Route Files | Status |
|----------|--------|-------------|--------|
| ⭐ HIGH | `patients/` | 3 files | ❌ Mongoose |
| ⭐ HIGH | `admin/users/` | 2 files | ❌ Mongoose |
| ⭐ HIGH | `admin/doctors/` | 2 files | ❌ Mongoose |
| ⭐ HIGH | `appointments/` | ~12 files | ❌ Mongoose |
| HIGH | `admissions/` | 2 files | ❌ Mongoose |
| HIGH | `warehouse/` | 6 files | ❌ Mongoose |
| HIGH | `pharmacy/` | ~20 files | ❌ Mongoose |
| HIGH | `laboratory/` | ~25 files | ❌ Mongoose |
| HIGH | `radiology/` | ~15 files | ❌ Mongoose |
| MED | `reception/` | ~8 files | ❌ Mongoose |
| MED | `doctor/` | ~15 files | ❌ Mongoose |
| MED | `dashboard/` | ~15 files | ❌ Mongoose |
| LOW | `debug/`, `settings/` | ~5 files | ❌ Mongoose |

## 📝 Conversion Strategy

Each file needs this pattern applied:

```typescript
// OLD (MongoDB/Mongoose)
import dbConnect from "@/lib/dbConnect";
import { User } from "@/lib/models/User";
await dbConnect();
const user = await User.findOne({ email });
// NEW (Prisma/SQLite)
import { prisma } from "@/lib/prisma";
const user = await prisma.user.findFirst({ where: { email } });
```

### Key Mapping Rules
- `Model.findOne({...})` → `prisma.model.findFirst({ where: {...} })`
- `Model.findById(id)` → `prisma.model.findUnique({ where: { id } })`
- `Model.find({...})` → `prisma.model.findMany({ where: {...} })`
- `Model.create({...})` → `prisma.model.create({ data: {...} })`
- `new Model(data)` → just the `data` object (for create)
- `model.save()` → `prisma.model.update()` or nothing if data passed
- `$regex: pattern` → `contains: pattern` (add `mode: "insensitive"` for case-insensitive)
- `$gte/$lte/$gt/$lt` → `gte/lte/gt/lt`
- `$ne` → `not`
- `$in` → `in`
- `$or/$and` → `OR/AND`
- `$set: { field: val }` → `field: val` 
- `Model.findByIdAndUpdate(id, { $set: {...} })` → `prisma.model.update({ where: { id }, data: {...} })`
- `.sort({ field: 1 })` → `.orderBy({ field: "asc" })` (use "desc" for -1)
- `.lean()` → remove entirely
- `.toObject()` → remove entirely
- `.select("...")` → remove entirely (Prisma selects all by default)
- `.populate()` → remove entirely (Prisma uses `include`)
- `_id` → `id` (when used as `.property`, keep as key `_id` when it's an object property name)
- `new mongoose.Types.ObjectId(id)` → just `id`
- `mongoose.Types.ObjectId.isValid(id)` → just check `typeof id === "string"`
- `dbConnect()` → remove entirely

### Mongoose Model Files (50+ files in `/lib/models/`)
These can be kept as-is during migration - they're importable but won't connect to MongoDB. They just slow down startup with warnings. Can be deleted after full conversion.

## 🧪 Testing
```bash
# Start server
npx next start -p 3000

# Test auth
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@hospital.com","password":"Pass123!"}'
```