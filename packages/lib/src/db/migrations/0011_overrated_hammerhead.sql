CREATE TABLE "provider_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"kind" text NOT NULL,
	"brand_id" text,
	"success" boolean NOT NULL,
	"error_message" text,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "provider_calls" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "provider_calls_provider_created_at_idx" ON "provider_calls" USING btree ("provider","created_at");--> statement-breakpoint
CREATE INDEX "provider_calls_provider_model_created_at_idx" ON "provider_calls" USING btree ("provider","model","created_at");
