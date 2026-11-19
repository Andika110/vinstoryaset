CREATE TABLE "import_batch_rows" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"batch_id" integer NOT NULL,
	"row_number" integer NOT NULL,
	"status" text NOT NULL,
	"message" text,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_number" text NOT NULL,
	"import_type" text NOT NULL,
	"status" text NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "import_batch_rows" ADD CONSTRAINT "import_batch_rows_batch_id_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."import_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_batch_rows_batch_idx" ON "import_batch_rows" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "import_batch_rows_status_idx" ON "import_batch_rows" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "import_batches_number_unique" ON "import_batches" USING btree ("batch_number");--> statement-breakpoint
CREATE INDEX "import_batches_type_idx" ON "import_batches" USING btree ("import_type");--> statement-breakpoint
CREATE INDEX "import_batches_created_idx" ON "import_batches" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "import_batches_user_idx" ON "import_batches" USING btree ("created_by");--> statement-breakpoint
-- Riwayat impor bersifat append-only; role runtime hanya membaca dan menulis.
GRANT SELECT, INSERT ON TABLE "import_batches" TO "inventory_app";--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "import_batch_rows" TO "inventory_app";--> statement-breakpoint
GRANT USAGE, SELECT ON SEQUENCE "import_batches_id_seq" TO "inventory_app";--> statement-breakpoint
GRANT USAGE, SELECT ON SEQUENCE "import_batch_rows_id_seq" TO "inventory_app";