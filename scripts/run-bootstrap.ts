/**
 * Executa bootstrap-schema.sql via Node/pg
 * Execute: npm run db:bootstrap
 */
import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';

const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf-8');
  for (const line of env.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

async function main() {
  const url = process.env.DATABASE_URL ?? 'postgresql://postgres:123456@localhost:5432/ubus';
  const pool = new Pool({ connectionString: url });
  const sqlPath = path.join(process.cwd(), 'scripts', 'bootstrap-schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  // Split por ; no fim de linha (exceto dentro de $$)
  const stmts: string[] = [];
  let buf = '';
  let inBlock = false;
  for (const line of sql.split('\n')) {
    if (line.trim().startsWith('--')) continue;
    buf += (buf ? '\n' : '') + line;
    if (line.includes('$$')) inBlock = !inBlock;
    if (!inBlock && line.trim().endsWith(';')) {
      stmts.push(buf.trim());
      buf = '';
    }
  }
  if (buf.trim()) stmts.push(buf.trim());

  for (const stmt of stmts) {
    if (!stmt.includes(';')) continue;
    try {
      await pool.query(stmt);
      console.log('OK');
    } catch (err: unknown) {
      const e = err as { message?: string; code?: string };
      if (e.code === '42710' || e.code === '42P07' || e.code === '42701' || e.message?.includes('already exists')) {
        console.log('Skip (já existe)');
      } else {
        console.error('Erro:', stmt.slice(0, 80) + '...');
        throw err;
      }
    }
  }

  await pool.end();
  console.log('\nBootstrap concluído! Execute: npm run db:seed-super-admins');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
