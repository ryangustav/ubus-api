import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './src/shared/database/schema';

async function main() {
  const url = process.env.DATABASE_URL || 'postgresql://postgres:123456@localhost:5432/ubus';
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  const users = await db.select().from(schema.users);
  console.log('Total users:', users.length);
  console.log('Users:', JSON.stringify(users.map(u => ({ email: u.email, role: u.role })), null, 2));

  await pool.end();
}

main().catch(console.error);
