CREATE TABLE IF NOT EXISTS "prefeituras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(200) NOT NULL,
	"id_gestor" uuid,
	"criado_em" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
-- Insere prefeitura padrão para dados existentes (se houver)
INSERT INTO "prefeituras" ("id", "nome")
SELECT gen_random_uuid(), 'Prefeitura Padrão'
WHERE NOT EXISTS (SELECT 1 FROM "prefeituras");
--> statement-breakpoint
ALTER TABLE "onibus" DROP CONSTRAINT IF EXISTS "onibus_numero_identificacao_unique";--> statement-breakpoint
ALTER TABLE "onibus" DROP CONSTRAINT IF EXISTS "onibus_placa_unique";--> statement-breakpoint
ALTER TABLE "usuarios" DROP CONSTRAINT IF EXISTS "usuarios_cpf_unique";--> statement-breakpoint
ALTER TABLE "usuarios" DROP CONSTRAINT IF EXISTS "usuarios_email_unique";--> statement-breakpoint
ALTER TABLE "linhas" ADD COLUMN IF NOT EXISTS "id_prefeitura" uuid;--> statement-breakpoint
ALTER TABLE "onibus" ADD COLUMN IF NOT EXISTS "id_prefeitura" uuid;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "id_prefeitura" uuid;--> statement-breakpoint
UPDATE "linhas" SET "id_prefeitura" = (SELECT "id" FROM "prefeituras" LIMIT 1) WHERE "id_prefeitura" IS NULL;--> statement-breakpoint
UPDATE "onibus" SET "id_prefeitura" = (SELECT "id" FROM "prefeituras" LIMIT 1) WHERE "id_prefeitura" IS NULL;--> statement-breakpoint
UPDATE "usuarios" SET "id_prefeitura" = (SELECT "id" FROM "prefeituras" LIMIT 1) WHERE "id_prefeitura" IS NULL;--> statement-breakpoint
ALTER TABLE "linhas" ALTER COLUMN "id_prefeitura" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "onibus" ALTER COLUMN "id_prefeitura" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "usuarios" ALTER COLUMN "id_prefeitura" SET NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "linhas" ADD CONSTRAINT "linhas_id_prefeitura_prefeituras_id_fk" FOREIGN KEY ("id_prefeitura") REFERENCES "public"."prefeituras"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "onibus" ADD CONSTRAINT "onibus_id_prefeitura_prefeituras_id_fk" FOREIGN KEY ("id_prefeitura") REFERENCES "public"."prefeituras"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_id_prefeitura_prefeituras_id_fk" FOREIGN KEY ("id_prefeitura") REFERENCES "public"."prefeituras"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "linhas" ADD CONSTRAINT "uq_linha_nome_prefeitura" UNIQUE("id_prefeitura","nome");--> statement-breakpoint
ALTER TABLE "onibus" ADD CONSTRAINT "uq_onibus_numero_prefeitura" UNIQUE("id_prefeitura","numero_identificacao");--> statement-breakpoint
ALTER TABLE "onibus" ADD CONSTRAINT "uq_onibus_placa_prefeitura" UNIQUE("id_prefeitura","placa");--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "uq_usuario_cpf_prefeitura" UNIQUE("id_prefeitura","cpf");--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "uq_usuario_email_prefeitura" UNIQUE("id_prefeitura","email");--> statement-breakpoint
ALTER TABLE "public"."usuarios" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "public"."usuarios" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."role_usuario";--> statement-breakpoint
CREATE TYPE "public"."role_usuario" AS ENUM('GESTOR', 'MOTORISTA', 'LIDER', 'ALUNO', 'CARONISTA');--> statement-breakpoint
ALTER TABLE "public"."usuarios" ALTER COLUMN "role" SET DATA TYPE "public"."role_usuario" USING "role"::"public"."role_usuario";--> statement-breakpoint
ALTER TABLE "public"."usuarios" ALTER COLUMN "role" SET DEFAULT 'ALUNO';