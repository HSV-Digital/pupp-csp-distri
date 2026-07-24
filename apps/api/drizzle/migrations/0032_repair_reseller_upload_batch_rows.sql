CREATE TABLE IF NOT EXISTS "reseller_upload_batch_rows" (
	"id" text PRIMARY KEY NOT NULL,
	"upload_job_id" text NOT NULL,
	"org_id" text NOT NULL,
	"row_index" integer NOT NULL,
	"partner_name" text NOT NULL,
	"customer_name" text NOT NULL,
	"current_sku" text NOT NULL,
	"seat_count" integer NOT NULL,
	"cost_per_user" double precision NOT NULL,
	"region" text DEFAULT 'United States' NOT NULL,
	"target_sku" text NOT NULL,
	"current_sku_customer_cost" double precision NOT NULL,
	"current_sku_reseller_cost" double precision NOT NULL,
	"target_sku_customer_cost" double precision NOT NULL,
	"target_sku_reseller_cost" double precision NOT NULL,
	"upload_meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'reseller_upload_batch_rows_upload_job_id_upload_jobs_id_fk'
	) THEN
		ALTER TABLE "reseller_upload_batch_rows"
			ADD CONSTRAINT "reseller_upload_batch_rows_upload_job_id_upload_jobs_id_fk"
			FOREIGN KEY ("upload_job_id")
			REFERENCES "public"."upload_jobs"("id")
			ON DELETE cascade
			ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'reseller_upload_batch_rows_org_id_reseller_organization_id_fk'
	) THEN
		ALTER TABLE "reseller_upload_batch_rows"
			ADD CONSTRAINT "reseller_upload_batch_rows_org_id_reseller_organization_id_fk"
			FOREIGN KEY ("org_id")
			REFERENCES "public"."reseller_organization"("id")
			ON DELETE cascade
			ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'reseller_upload_batch_rows_created_by_reseller_users_id_fk'
	) THEN
		ALTER TABLE "reseller_upload_batch_rows"
			ADD CONSTRAINT "reseller_upload_batch_rows_created_by_reseller_users_id_fk"
			FOREIGN KEY ("created_by")
			REFERENCES "public"."reseller_users"("id")
			ON DELETE no action
			ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reseller_upload_batch_rows_upload_job_idx" ON "reseller_upload_batch_rows" USING btree ("upload_job_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reseller_upload_batch_rows_org_upload_job_idx" ON "reseller_upload_batch_rows" USING btree ("org_id","upload_job_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reseller_upload_batch_rows_created_by_idx" ON "reseller_upload_batch_rows" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reseller_upload_batch_rows_org_created_at_idx" ON "reseller_upload_batch_rows" USING btree ("org_id","created_at");
--> statement-breakpoint
ALTER TABLE "reseller_upload_batch_rows" ENABLE ROW LEVEL SECURITY;
