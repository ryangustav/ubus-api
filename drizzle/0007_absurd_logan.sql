DO $$ BEGIN CREATE TYPE "public"."accessibility_reason" AS ENUM('PCD', 'TEA', 'IDOSO', 'GESTANTE', 'LACTANTE', 'MOBILIDADE_REDUZIDA'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."accessibility_status" AS ENUM('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED', 'REVOKED'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
ALTER TYPE "public"."registration_status" ADD VALUE IF NOT EXISTS 'RENEWAL_PENDING';--> statement-breakpoint
ALTER TYPE "public"."registration_status" ADD VALUE IF NOT EXISTS 'SUSPENDED';--> statement-breakpoint
ALTER TYPE "public"."registration_status" ADD VALUE IF NOT EXISTS 'INACTIVE';--> statement-breakpoint
ALTER TABLE "buses" ADD COLUMN "has_elevator" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "buses" ADD COLUMN "preferential_seats" integer[];--> statement-breakpoint
ALTER TABLE "points" ADD COLUMN "lat" double precision;--> statement-breakpoint
ALTER TABLE "points" ADD COLUMN "lng" double precision;--> statement-breakpoint
ALTER TABLE "points" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "requires_elevator" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "renewal_deadline" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "renewal_submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "accessibility_reason" "accessibility_reason";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "accessibility_doc_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "accessibility_status" "accessibility_status";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "accessibility_approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "accessibility_review_note" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "accessibility_consecutive_periods" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "token_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp with time zone;