import dotenv from "dotenv";

import { defineConfig } from "prisma/config";

// Prisma CLI (v7) does not automatically load Next.js env files.
// Load `.env.local` first (dev), then fall back to `.env`.
process.env.DOTENV_CONFIG_QUIET = "true";

dotenv.config({ path: ".env.local" } as any);
dotenv.config({} as any);

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    datasource: {
        // Prisma ORM v7: connection URLs are configured here (not in schema.prisma).
        // Use a direct Postgres URL for Prisma CLI operations like migrate/introspect.
        // Keep a fallback to avoid failures for commands that don't need a DB URL (e.g. `prisma generate`).
        url: process.env.DATABASE_POSTGRES_URL ?? "",
    },
});
