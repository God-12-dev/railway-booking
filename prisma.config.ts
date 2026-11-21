import "dotenv/config";
import { defineConfig } from "prisma/config";

// `prisma generate` (run during the build) does not need a database connection,
// so DATABASE_URL is optional here. Commands that talk to the database
// (migrate, seed, studio) still require it to be set.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
