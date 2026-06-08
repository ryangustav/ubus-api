CREATE TABLE IF NOT EXISTS "bus_layouts" (
	"bus_id" uuid PRIMARY KEY NOT NULL,
	"numbering_mode" varchar(20) NOT NULL,
	"numeration_side" varchar(20) NOT NULL,
	"dpm_seat_virtual_number" integer,
	"preferential_seats" integer[] DEFAULT '{}' NOT NULL,
	"rows" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bus_layouts" ADD CONSTRAINT "bus_layouts_bus_id_buses_id_fk" FOREIGN KEY ("bus_id") REFERENCES "public"."buses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
