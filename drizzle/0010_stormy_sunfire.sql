CREATE TABLE IF NOT EXISTS "dropoff_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"route_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"address" text,
	"lat" double precision,
	"lng" double precision,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "uq_dropoff_point_name_route" UNIQUE("route_id","name")
);
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "pickup_point_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dropoff_points" ADD CONSTRAINT "dropoff_points_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
