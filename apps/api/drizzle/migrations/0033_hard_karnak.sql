CREATE TABLE "reseller_partner_profile" (
	"org_id" text PRIMARY KEY NOT NULL,
	"partner_type" text NOT NULL,
	"has_modern_work_or_security_designation" boolean,
	"has_over_25_points" boolean,
	"designations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"specializations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"copilot_jumpstart_ready" boolean NOT NULL,
	"company_logo_url" text,
	"erp_margin_percent" double precision NOT NULL,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reseller_partner_profile" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reseller_partner_profile" ADD CONSTRAINT "reseller_partner_profile_org_id_reseller_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."reseller_organization"("id") ON DELETE cascade ON UPDATE no action;
