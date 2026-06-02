import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { Pool } from "pg";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";

if (!process.env.DATABASE_URL && process.env.NODE_ENV !== "production") {
  console.warn("⚠️  DATABASE_URL is not defined. Using placeholder for build.");
}

const isNeon = DATABASE_URL.includes("neon.tech");

export const db = isNeon
  ? drizzleNeon(neon(DATABASE_URL, { fetchOptions: { cache: "no-store" } }), {
      schema,
    })
  : drizzlePg(new Pool({ connectionString: DATABASE_URL }), { schema });
