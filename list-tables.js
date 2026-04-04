const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:123456@localhost:5432/ubus',
  });
  await client.connect();

  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `);

  console.log('Tables in database:', res.rows.map(r => r.table_name));
  await client.end();
}

main().catch(console.error);
