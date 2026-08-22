ALTER TABLE "provider_calls" ADD COLUMN "prompt_id" uuid;--> statement-breakpoint
CREATE INDEX "provider_calls_prompt_id_created_at_idx" ON "provider_calls" USING btree ("prompt_id","created_at");
