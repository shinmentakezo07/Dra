# Database Migrations

---

## Migration Strategy

The platform uses a **dual migration approach**:

| System | Tool | Purpose |
|--------|------|---------|
| Frontend (development) | Drizzle ORM `drizzle-kit push` | Fast schema iteration during development |
| Backend (production) | Hand-applied raw SQL | Controlled, versioned migrations |

---

## Backend Migrations

Raw SQL migration files are located in `apps/backend/migrations/`.

### Conventions

- Files are numbered sequentially: `001_*.sql`, `002_*.sql`, etc.
- Each migration is applied once, in order
- No auto-migrator — migrations are hand-applied
- Migrations are idempotent where possible

### Migration List

| # | File | Description |
|---|------|-------------|
| 001 | `001_*.sql` | Initial schema (users, api_keys, api_logs, user_credits, credit_transactions) |
| 002 | `002_*.sql` | Additional features |
| 003 | `003_*.sql` | Schema extensions |
| 004 | `004_*.sql` | Feature additions |
| 005 | `005_*.sql` | Platform extensions |
| 006 | `006_*.sql` | Admin & security tables |
| 007 | `007_*.sql` | Latest changes |

---

## Frontend Schema Management

For local development, the Drizzle schema at `apps/web/db/schema.ts` is the source of truth:

```bash
cd apps/web
npm run db:push      # Push current schema to database (uses drizzle-kit push)
npm run db:seed      # Seed demo data
npm run db:setup     # Push + seed (combined)
```

### Schema File

The Drizzle schema defines 5 tables with relations:

- `users`
- `api_keys` (FK -> users)
- `api_logs` (FK -> users, FK -> api_keys)
- `user_credits` (FK -> users, one-to-one)
- `credit_transactions` (FK -> users, FK -> api_logs)

Additional tables (conversations, prompts, webhooks, organizations, etc.) are managed via raw SQL in the backend only.

---

## Seed Data

Seed script at `apps/web/db/seed.ts` populates:

- Demo user accounts
- Sample API keys
- Initial credit balances
- Sample transaction history
- Test data for development

Run with: `npm run db:seed` (from `apps/web/`)

---

## Production Migrations Workflow

1. Create new numbered SQL file in `apps/backend/migrations/`
2. Apply manually to production database
3. Update Drizzle schema in `apps/web/db/schema.ts` if frontend needs to read the new tables
4. Add backend repository methods for the new table
5. Document the migration

---

## Important Notes

- `tsconfig.json` excludes `db/seed*.ts` and `scripts/**/*` from type checking (top-level await)
- Drizzle uses `@neondatabase/serverless` driver even against local PostgreSQL
- No auto-rollback — migrations are forward-only
- Schema changes requiring downtime should be communicated before deployment
