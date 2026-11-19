ALTER TABLE "stock_documents" ADD COLUMN "reference_type" text;--> statement-breakpoint
ALTER TABLE "stock_documents" ADD COLUMN "reference_id" integer;--> statement-breakpoint
CREATE INDEX "stock_documents_reference_idx" ON "stock_documents" USING btree ("reference_type","reference_id");