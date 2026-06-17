import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';

const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf-8');
  for (const line of env.split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = val;
    }
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL not found in environment');
  }
  console.log('Connecting to database...');
  const pool = new Pool({ connectionString: url });
  
  const res = await pool.query('SELECT id, trip_date, shift, direction, status, voting_open_at, voting_close_at FROM trips ORDER BY trip_date DESC, id DESC LIMIT 20');
  console.log('\n--- ULTIMAS VIAGENS ---');
  console.table(res.rows);
  
  await pool.end();
}

main().catch(console.error);
