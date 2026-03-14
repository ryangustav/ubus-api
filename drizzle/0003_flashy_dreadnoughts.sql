ALTER TABLE "linhas" ADD COLUMN "dias_da_semana" integer[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "linhas" ADD COLUMN "horario_abertura_votacao" varchar(5) DEFAULT '06:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "linhas" ADD COLUMN "horario_fechamento_votacao" varchar(5) DEFAULT '07:30' NOT NULL;--> statement-breakpoint
ALTER TABLE "onibus" ADD COLUMN "id_motorista" uuid;--> statement-breakpoint
ALTER TABLE "onibus" ADD COLUMN "tem_banheiro" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "onibus" ADD COLUMN "tem_ar_condicionado" boolean DEFAULT false;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "onibus" ADD CONSTRAINT "onibus_id_motorista_usuarios_id_fk" FOREIGN KEY ("id_motorista") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
