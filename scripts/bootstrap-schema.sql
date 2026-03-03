-- Bootstrap do schema multi-tenant + super-admin
-- Use quando: db:push foi usado antes OU migrações falharam parcialmente
-- Execute: npm run db:bootstrap

-- 1. Criar prefeituras se não existir
CREATE TABLE IF NOT EXISTS "prefeituras" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nome" varchar(200) NOT NULL,
  "id_gestor" uuid,
  "ativo" boolean DEFAULT true,
  "criado_em" timestamp with time zone DEFAULT now()
);

-- 2. Inserir prefeitura sistema (para super-admins) e padrão (para dados existentes)
INSERT INTO "prefeituras" ("id", "nome", "ativo")
VALUES ('00000000-0000-0000-0000-000000000001', 'Sistema UBUS', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "prefeituras" ("id", "nome", "ativo")
SELECT gen_random_uuid(), 'Prefeitura Padrão', true
WHERE NOT EXISTS (SELECT 1 FROM "prefeituras" WHERE "nome" = 'Prefeitura Padrão');

-- 3. Adicionar id_prefeitura em linhas, onibus, usuarios (se não existir)
ALTER TABLE "linhas" ADD COLUMN IF NOT EXISTS "id_prefeitura" uuid;
ALTER TABLE "onibus" ADD COLUMN IF NOT EXISTS "id_prefeitura" uuid;
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "id_prefeitura" uuid;

-- 4. Preencher com prefeitura onde NULL (preferir Padrão, senão qualquer)
UPDATE "linhas" SET "id_prefeitura" = COALESCE(
  (SELECT "id" FROM "prefeituras" WHERE "nome" = 'Prefeitura Padrão' LIMIT 1),
  (SELECT "id" FROM "prefeituras" LIMIT 1)
) WHERE "id_prefeitura" IS NULL;
UPDATE "onibus" SET "id_prefeitura" = COALESCE(
  (SELECT "id" FROM "prefeituras" WHERE "nome" = 'Prefeitura Padrão' LIMIT 1),
  (SELECT "id" FROM "prefeituras" LIMIT 1)
) WHERE "id_prefeitura" IS NULL;
UPDATE "usuarios" SET "id_prefeitura" = COALESCE(
  (SELECT "id" FROM "prefeituras" WHERE "nome" = 'Prefeitura Padrão' LIMIT 1),
  (SELECT "id" FROM "prefeituras" LIMIT 1)
) WHERE "id_prefeitura" IS NULL;

-- 5. Adicionar coluna ativo em prefeituras (se não existir)
ALTER TABLE "prefeituras" ADD COLUMN IF NOT EXISTS "ativo" boolean DEFAULT true;

-- 6. Remover constraints antigas (ignora se não existirem)
ALTER TABLE "onibus" DROP CONSTRAINT IF EXISTS "onibus_numero_identificacao_unique";
ALTER TABLE "onibus" DROP CONSTRAINT IF EXISTS "onibus_placa_unique";
ALTER TABLE "usuarios" DROP CONSTRAINT IF EXISTS "usuarios_cpf_unique";
ALTER TABLE "usuarios" DROP CONSTRAINT IF EXISTS "usuarios_email_unique";

-- 7. Adicionar NOT NULL (pode falhar se houver NULLs - rode os UPDATEs acima primeiro)
DO $$ BEGIN
  ALTER TABLE "linhas" ALTER COLUMN "id_prefeitura" SET NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "onibus" ALTER COLUMN "id_prefeitura" SET NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "usuarios" ALTER COLUMN "id_prefeitura" SET NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 8. FKs e constraints (ignora duplicatas)
DO $$ BEGIN
  ALTER TABLE "linhas" ADD CONSTRAINT "linhas_id_prefeitura_prefeituras_id_fk" FOREIGN KEY ("id_prefeitura") REFERENCES "prefeituras"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "onibus" ADD CONSTRAINT "onibus_id_prefeitura_prefeituras_id_fk" FOREIGN KEY ("id_prefeitura") REFERENCES "prefeituras"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_id_prefeitura_prefeituras_id_fk" FOREIGN KEY ("id_prefeitura") REFERENCES "prefeituras"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 9. Unique constraints (ignora duplicatas)
ALTER TABLE "linhas" DROP CONSTRAINT IF EXISTS "uq_linha_nome_prefeitura";
ALTER TABLE "linhas" ADD CONSTRAINT "uq_linha_nome_prefeitura" UNIQUE("id_prefeitura","nome");

ALTER TABLE "onibus" DROP CONSTRAINT IF EXISTS "uq_onibus_numero_prefeitura";
ALTER TABLE "onibus" ADD CONSTRAINT "uq_onibus_numero_prefeitura" UNIQUE("id_prefeitura","numero_identificacao");

ALTER TABLE "onibus" DROP CONSTRAINT IF EXISTS "uq_onibus_placa_prefeitura";
ALTER TABLE "onibus" ADD CONSTRAINT "uq_onibus_placa_prefeitura" UNIQUE("id_prefeitura","placa");

ALTER TABLE "usuarios" DROP CONSTRAINT IF EXISTS "uq_usuario_cpf_prefeitura";
ALTER TABLE "usuarios" ADD CONSTRAINT "uq_usuario_cpf_prefeitura" UNIQUE("id_prefeitura","cpf");

ALTER TABLE "usuarios" DROP CONSTRAINT IF EXISTS "uq_usuario_email_prefeitura";
ALTER TABLE "usuarios" ADD CONSTRAINT "uq_usuario_email_prefeitura" UNIQUE("id_prefeitura","email");

-- 10. Adicionar valores ao enum role_usuario (ignora se já existirem)
DO $$ BEGIN
  ALTER TYPE "role_usuario" ADD VALUE 'SUPER_ADMIN' BEFORE 'GESTOR';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "role_usuario" ADD VALUE 'LIDER';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "role_usuario" ADD VALUE 'CARONISTA';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
