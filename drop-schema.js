const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
  .then(() => { console.log('Schema dropped and recreated'); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
