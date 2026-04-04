const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:123456@localhost:5432/ubus',
  });
  await client.connect();

  const res = await client.query(`
    SELECT email, role, password_hash 
    FROM users 
    WHERE email = 'ubus_infra@ubus.local'
  `);

  console.log('User found:', JSON.stringify(res.rows, null, 2));
  await client.end();
}

main().catch(console.error);
