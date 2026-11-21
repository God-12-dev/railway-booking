import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // `prisma generate` does not need a live database, so don't fail the build
    // when no URL is set. Netlify Database injects NETLIFY_DB_URL at runtime.
    url: process.env.DATABASE_URL ?? process.env.NETLIFY_DB_URL ?? "",
  },
});
