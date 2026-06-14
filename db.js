const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.trim()) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

const isSupabase = (process.env.DATABASE_URL || '').includes('supabase');

const dbUrl = process.env.DATABASE_URL && isSupabase ? process.env.DATABASE_URL.replace(':5432', ':6543') : (process.env.DATABASE_URL || '');

const pool = new Pool({
  connectionString: dbUrl,
  ssl: isSupabase ? { rejectUnauthorized: false } : false,
  max: 2, // Limit pool size for Vercel Serverless
  idleTimeoutMillis: 3000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  // Log but do NOT exit — pg pool auto-recovers from transient connection drops.
  // Calling process.exit() here would take the entire server down on a routine disconnect.
  console.error('❌ Idle pool client error (non-fatal):', err.message);
});

module.exports = pool;
