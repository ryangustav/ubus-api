/**
 * Seed dos super-admins: ubus_infra e ubus_admin
 * Gera senhas de 16 caracteres e insere no banco.
 * Execute: npm run db:seed-super-admins
 */
import * as path from 'path';
import * as fs from 'fs';

// Carrega .env da raiz do projeto
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

const SISTEMA_PREFEITURA_ID = '00000000-0000-0000-0000-000000000001';

function gerarSenha16(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@!#$%¨&*(*)_+';
  return Array.from(crypto.randomBytes(16), (b) => chars[b % chars.length]).join('');
}

import { loadOciSecrets } from '../src/config/oci-vault';

async function main() {
  await loadOciSecrets();
  const url = process.env.DATABASE_URL ?? 'postgresql://postgres:123456@localhost:5432/ubus';
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  const senhaInfra = gerarSenha16();
  const senhaAdmin = gerarSenha16();

  await db
    .insert(schema.prefeituras)
    .values({
      id: SISTEMA_PREFEITURA_ID,
      nome: 'Sistema UBUS',
      ativo: true,
    })
    .onConflictDoNothing({ target: schema.prefeituras.id });

  const hashInfra = await bcrypt.hash(senhaInfra, 10);
  const hashAdmin = await bcrypt.hash(senhaAdmin, 10);

  await db
    .insert(schema.usuarios)
    .values([
      {
        idPrefeitura: SISTEMA_PREFEITURA_ID,
        cpf: '00000000001',
        nome: 'UBUS Infra',
        email: 'ubus_infra@ubus.local',
        senhaHash: hashInfra,
        role: 'SUPER_ADMIN',
      },
      {
        idPrefeitura: SISTEMA_PREFEITURA_ID,
        cpf: '00000000002',
        nome: 'UBUS Admin',
        email: 'ubus_admin@ubus.local',
        senhaHash: hashAdmin,
        role: 'SUPER_ADMIN',
      },
    ])
    .onConflictDoNothing({
      target: [schema.usuarios.idPrefeitura, schema.usuarios.email],
    });

  const credenciais = `
# Super-Admins UBUS - Credenciais geradas em ${new Date().toISOString()}
# GUARDE ESTE ARQUIVO EM LOCAL SEGURO E APAGUE APÓS ANOTAR AS SENHAS

ubus_infra
  Email: ubus_infra@ubus.local
  Senha: ${senhaInfra}

ubus_admin
  Email: ubus_admin@ubus.local
  Senha: ${senhaAdmin}

`.trim();

  const outputPath = path.join(process.cwd(), 'scripts', 'super-admin-credentials.txt');
  fs.writeFileSync(outputPath, credenciais, 'utf-8');
  console.log('Super-admins criados com sucesso!');
  console.log('Credenciais salvas em:', outputPath);
  console.log('\n--- Credenciais ---');
  console.log(credenciais);
  console.log('\n⚠️  Apague o arquivo super-admin-credentials.txt após anotar as senhas!');

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
