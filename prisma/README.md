# Prisma + Supabase migrations

## 1) Set env vars in `.env.local`

- `DATABASE_URL`: Supabase pooled connection string (for runtime/client operations)
- `DIRECT_URL`: Supabase direct connection string on port 5432 (for migrations)

## 2) Generate Prisma client

```bash
npm run prisma:generate
```

## 3) Apply checked-in migrations to Supabase

```bash
npm run prisma:migrate:deploy
```

## 4) Create a new migration later

```bash
npm run prisma:migrate:dev -- --name <migration_name>
```

If your Supabase role cannot create a shadow database, use a local Postgres shadow database or create migration SQL manually and place it under `prisma/migrations/<timestamp_name>/migration.sql`.
