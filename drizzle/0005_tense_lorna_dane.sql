CREATE TYPE "public"."registration_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('CONFIRMED', 'PRESENT', 'ABSENT', 'CANCELLED_BY_SYSTEM', 'EXCESS');--> statement-breakpoint
CREATE TYPE "public"."trip_direction" AS ENUM('OUTBOUND', 'INBOUND');--> statement-breakpoint
CREATE TYPE "public"."trip_status" AS ENUM('SCHEDULED', 'OPEN_FOR_RESERVATION', 'ONGOING', 'FINISHED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('SUPER_ADMIN', 'MANAGER', 'DRIVER', 'LEADER', 'STUDENT', 'RIDE_SHARE');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "buses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"municipality_id" uuid NOT NULL,
	"driver_id" uuid,
	"identification_number" varchar(20) NOT NULL,
	"plate" varchar(10) NOT NULL,
	"standard_capacity" integer NOT NULL,
	"has_bathroom" boolean DEFAULT false,
	"has_air_conditioning" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "uq_bus_number_municipality" UNIQUE("municipality_id","identification_number"),
	CONSTRAINT "uq_bus_plate_municipality" UNIQUE("municipality_id","plate")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"route_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "uq_point_name_route" UNIQUE("route_id","name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"municipality_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"week_days" integer[] DEFAULT '{}' NOT NULL,
	"voting_open_time" varchar(5) DEFAULT '06:00' NOT NULL,
	"voting_close_time" varchar(5) DEFAULT '07:30' NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "uq_route_name_municipality" UNIQUE("municipality_id","name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "municipalities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"manager_id" uuid,
	"active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"municipality_id" uuid NOT NULL,
	"cpf" varchar(14) NOT NULL,
	"name" varchar(150) NOT NULL,
	"email" varchar(150) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"phone" varchar(20),
	"role" "user_role" DEFAULT 'STUDENT',
	"priority_level" integer,
	"default_route_id" uuid,
	"profile_picture_url" text,
	"schedule_url" text,
	"residence_proof_url" text,
	"needs_wheelchair" boolean DEFAULT false,
	"registration_status" "registration_status" DEFAULT 'PENDING',
	"default_point_id" uuid,
	"seat_block_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "uq_user_cpf_municipality" UNIQUE("municipality_id","cpf"),
	CONSTRAINT "uq_user_email_municipality" UNIQUE("municipality_id","email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trips" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"trip_date" date NOT NULL,
	"shift" varchar(10) NOT NULL,
	"direction" "trip_direction" NOT NULL,
	"route_id" uuid NOT NULL,
	"bus_id" uuid NOT NULL,
	"driver_id" uuid,
	"leader_ids" uuid[] DEFAULT '{}',
	"actual_capacity" integer NOT NULL,
	"voting_open_at" timestamp with time zone NOT NULL,
	"voting_close_at" timestamp with time zone NOT NULL,
	"status" "trip_status" DEFAULT 'SCHEDULED',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" varchar(50) NOT NULL,
	"user_id" uuid NOT NULL,
	"seat_number" integer,
	"is_ride_share" boolean DEFAULT false,
	"status" "reservation_status" DEFAULT 'CONFIRMED',
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "unique_seat_per_trip" UNIQUE("trip_id","seat_number")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "buses" ADD CONSTRAINT "buses_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "buses" ADD CONSTRAINT "buses_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "points" ADD CONSTRAINT "points_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "routes" ADD CONSTRAINT "routes_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_default_route_id_routes_id_fk" FOREIGN KEY ("default_route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_default_point_id_points_id_fk" FOREIGN KEY ("default_point_id") REFERENCES "public"."points"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trips" ADD CONSTRAINT "trips_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trips" ADD CONSTRAINT "trips_bus_id_buses_id_fk" FOREIGN KEY ("bus_id") REFERENCES "public"."buses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reservations" ADD CONSTRAINT "reservations_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
