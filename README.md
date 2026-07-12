# ROOH N RANG Gallery

Private client gallery application with account/PIN access, albums, favorites, selections, fullscreen previews, and controlled downloads.

## Structure

- `apps/gallery` - Next.js gallery application
- `packages/database` - shared Prisma client
- `prisma` - Supabase Postgres schema and migrations

Use `apps/gallery` as the Vercel Root Directory. Environment credentials belong in Vercel or a local `.env` file and must never be committed.
