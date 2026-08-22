CREATE INDEX IF NOT EXISTS "citations_prompt_run_id_idx" ON "citations" USING btree ("prompt_run_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prompt_runs_brand_id_idx" ON "prompt_runs" USING btree ("brand_id");
