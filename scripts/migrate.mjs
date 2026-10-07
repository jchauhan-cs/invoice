// Applies db/migrations/*.sql in order. Safe to run repeatedly.
// Runs automatically before `next build`, so every deploy keeps the schema current.
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

// Load .env.local for local runs (does not override real environment variables).
try {
  for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}

const url = process.env.DATABASE_URL;
if (!url) {
  if (process.env.VERCEL) {
    console.error('DATABASE_URL is not set. Add it in the Vercel project settings.');
    process.exit(1);
  }
  console.log('DATABASE_URL is not set, skipping migrations.');
  process.exit(0);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`;
  const dir = path.join(process.cwd(), 'db', 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const done = new Set((await sql`SELECT name FROM schema_migrations`).map((r) => r.name));
  for (const file of files) {
    if (done.has(file)) continue;
    const text = fs.readFileSync(path.join(dir, file), 'utf8');
    await sql.begin(async (tx) => {
      await tx.unsafe(text);
      await tx`INSERT INTO schema_migrations (name) VALUES (${file})`;
    });
    console.log(`Applied migration ${file}`);
  }
  console.log('Database is up to date.');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  await sql.end();
}
