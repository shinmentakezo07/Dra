import { Pool } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Get all migration files
  const migrationsDir = path.join(__dirname, '..', 'drizzle');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log('Found migrations:', files);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const migration = fs.readFileSync(filePath, 'utf-8');

    // Split by statement breakpoints
    const statements = migration
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`\nRunning migration: ${file}`);

    for (const statement of statements) {
      try {
        await pool.query(statement);
        console.log(`✓ Executed statement from ${file}`);
      } catch (error: any) {
        // Ignore "already exists" errors
        if (error.message?.includes('already exists') || error.message?.includes('does not exist')) {
          console.log(`⊘ Skipped (already applied): ${error.message.split('\n')[0]}`);
        } else {
          console.error(`✗ Error in ${file}:`, error.message);
          throw error;
        }
      }
    }
  }

  await pool.end();
  console.log('\n✓ All migrations completed successfully!');
}

runMigrations().catch(console.error);
