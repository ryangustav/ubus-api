ALTER TYPE "public"."role_usuario" ADD VALUE 'SUPER_ADMIN' BEFORE 'GESTOR';--> statement-breakpoint
ALTER TABLE "prefeituras" ADD COLUMN IF NOT EXISTS "ativo" boolean DEFAULT true;--> statement-breakpoint
INSERT INTO "prefeituras" ("id", "nome", "ativo")
VALUES ('00000000-0000-0000-0000-000000000001', 'Sistema UBUS', true)
ON CONFLICT (id) DO NOTHING;