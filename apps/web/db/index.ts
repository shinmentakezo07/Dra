import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@localhost:5432/placeholder';

if (!process.env.DATABASE_URL && process.env.NODE_ENV !== 'production') {
  console.warn("⚠️  DATABASE_URL is not defined. Using placeholder for build.");
}

const sql = neon(DATABASE_URL, {
  fetchOptions: {
    cache: 'no-store',
  },
});
export const db = drizzle(sql, { schema });
