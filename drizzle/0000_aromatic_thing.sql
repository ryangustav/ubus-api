DO $$ BEGIN CREATE TYPE "public"."direcao_viagem" AS ENUM('IDA', 'VOLTA'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."role_usuario" AS ENUM('ALUNO', 'MOTORISTA', 'GESTOR'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."status_cadastro" AS ENUM('PENDENTE', 'APROVADO', 'REJEITADO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."status_reserva" AS ENUM('CONFIRMADA', 'PRESENTE', 'FALTOU', 'CANCELADA_SISTEMA', 'EXCESSO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."status_viagem" AS ENUM('AGENDADA', 'ABERTA_PARA_RESERVA', 'EM_ANDAMENTO', 'FINALIZADA', 'CANCELADA'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "linhas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(100) NOT NULL,
	"descricao" text,
	"is_ativo" boolean DEFAULT true,
	"criado_em" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "onibus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero_identificacao" varchar(20) NOT NULL,
	"placa" varchar(10) NOT NULL,
	"capacidade_padrao" integer NOT NULL,
	"is_ativo" boolean DEFAULT true,
	"criado_em" timestamp with time zone DEFAULT now(),
	CONSTRAINT "onibus_numero_identificacao_unique" UNIQUE("numero_identificacao"),
	CONSTRAINT "onibus_placa_unique" UNIQUE("placa")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cpf" varchar(14) NOT NULL,
	"nome" varchar(150) NOT NULL,
	"email" varchar(150) NOT NULL,
	"senha_hash" varchar(255) NOT NULL,
	"telefone" varchar(20),
	"role" "role_usuario" DEFAULT 'ALUNO',
	"nivel_prioridade" integer,
	"id_linha_padrao" uuid,
	"foto_perfil_url" text,
	"grade_horario_url" text,
	"status_cadastro" "status_cadastro" DEFAULT 'PENDENTE',
	"bloqueio_assento_ate" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now(),
	CONSTRAINT "usuarios_cpf_unique" UNIQUE("cpf"),
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "viagens" (
	"id_viagem" varchar(50) PRIMARY KEY NOT NULL,
	"data_viagem" date NOT NULL,
	"turno" varchar(10) NOT NULL,
	"direcao" "direcao_viagem" NOT NULL,
	"id_linha" uuid NOT NULL,
	"id_onibus" uuid NOT NULL,
	"id_motorista" uuid,
	"lideres_ids" uuid[] DEFAULT '{}',
	"capacidade_real" integer NOT NULL,
	"abertura_votacao" timestamp with time zone NOT NULL,
	"fechamento_votacao" timestamp with time zone NOT NULL,
	"status" "status_viagem" DEFAULT 'AGENDADA',
	"criado_em" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reservas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_viagem" varchar(50) NOT NULL,
	"id_usuario" uuid NOT NULL,
	"numero_assento" integer,
	"is_carona" boolean DEFAULT false,
	"status" "status_reserva" DEFAULT 'CONFIRMADA',
	"criado_em" timestamp with time zone DEFAULT now(),
	CONSTRAINT "assento_unico_por_viagem" UNIQUE("id_viagem","numero_assento")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_id_linha_padrao_linhas_id_fk" FOREIGN KEY ("id_linha_padrao") REFERENCES "public"."linhas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "viagens" ADD CONSTRAINT "viagens_id_linha_linhas_id_fk" FOREIGN KEY ("id_linha") REFERENCES "public"."linhas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "viagens" ADD CONSTRAINT "viagens_id_onibus_onibus_id_fk" FOREIGN KEY ("id_onibus") REFERENCES "public"."onibus"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "viagens" ADD CONSTRAINT "viagens_id_motorista_usuarios_id_fk" FOREIGN KEY ("id_motorista") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reservas" ADD CONSTRAINT "reservas_id_viagem_viagens_id_viagem_fk" FOREIGN KEY ("id_viagem") REFERENCES "public"."viagens"("id_viagem") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reservas" ADD CONSTRAINT "reservas_id_usuario_usuarios_id_fk" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
