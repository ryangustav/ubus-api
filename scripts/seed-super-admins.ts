/**
 * Super-Admin Seed: ubus_infra and ubus_admin
 * Generates 16-character random passwords and inserts them into the database.
 * Run: npm run db:seed-super-admins
 */
import * as path from 'path';
import * as fs from 'fs';

// Load .env from project root
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
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as schema from '../src/shared/database/schema';

const SYSTEM_MUNICIPALITY_ID = '00000000-0000-0000-0000-000000000001';

function generatePassword16(): string {
  const chars =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@!#$%¨&*(*)_+';
  return Array.from(crypto.randomBytes(16), (b) => chars[b % chars.length]).join(
    '',
  );
}

import { loadOciSecrets } from '../src/config/oci-vault';

async function main() {
  await loadOciSecrets();
  const url =
    process.env.DATABASE_URL ??
    'postgresql://postgres:123456@localhost:5432/ubus';
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  const infraPassword = generatePassword16();
  const adminPassword = generatePassword16();

  await db
    .insert(schema.municipalities)
    .values({
      id: SYSTEM_MUNICIPALITY_ID,
      name: 'System UBUS',
      active: true,
    })
    .onConflictDoNothing({ target: schema.municipalities.id });

  const infraHash = await bcrypt.hash(infraPassword, 10);
  const adminHash = await bcrypt.hash(adminPassword, 10);

  await db
    .insert(schema.users)
    .values([
      {
        municipalityId: SYSTEM_MUNICIPALITY_ID,
        cpf: '00000000001',
        name: 'UBUS Infra',
        email: 'ubus_infra@ubus.local',
        passwordHash: infraHash,
        role: 'SUPER_ADMIN',
      },
      {
        municipalityId: SYSTEM_MUNICIPALITY_ID,
        cpf: '00000000002',
        name: 'UBUS Admin',
        email: 'ubus_admin@ubus.local',
        passwordHash: adminHash,
        role: 'SUPER_ADMIN',
      },
    ])
    .onConflictDoNothing({
      target: [schema.users.municipalityId, schema.users.email],
    });

  const credentials = `
# UBUS Super-Admins - Credentials generated on ${new Date().toISOString()}
# KEEP THIS FILE IN A SAFE PLACE AND DELETE IT AFTER NOTING THE PASSWORDS

ubus_infra
  Email: ubus_infra@ubus.local
  Password: ${infraPassword}

ubus_admin
  Email: ubus_admin@ubus.local
  Password: ${adminPassword}
`.trim();

  const outputPath = path.join(
    process.cwd(),
    'scripts',
    'super-admin-credentials.txt',
  );
  fs.writeFileSync(outputPath, credentials, 'utf-8');
  console.log('Super-admins created successfully!');
  console.log('Credentials saved to:', outputPath);
  console.log('\n--- Credentials ---');
  console.log(credentials);
  console.log(
    '\n⚠️  Delete the file super-admin-credentials.txt after noting the passwords!',
  );

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
