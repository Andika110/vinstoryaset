CREATE TYPE "public"."asset_movement_type" AS ENUM('assignment', 'mutation');--> statement-breakpoint
CREATE TYPE "public"."asset_status" AS ENUM('available', 'in_use', 'on_loan', 'under_maintenance', 'damaged', 'disposed');--> statement-breakpoint
CREATE TYPE "public"."disposal_reason" AS ENUM('heavy_damage', 'not_economical', 'lost', 'not_needed', 'other');--> statement-breakpoint
CREATE TYPE "public"."disposal_status" AS ENUM('completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."loan_status" AS ENUM('borrowed', 'returned', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."maintenance_status" AS ENUM('reported', 'in_progress', 'waiting_parts', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."maintenance_type" AS ENUM('corrective', 'preventive', 'other');--> statement-breakpoint
CREATE TYPE "public"."opname_item_type" AS ENUM('asset', 'inventory');--> statement-breakpoint
CREATE TYPE "public"."opname_result" AS ENUM('matched', 'other_location', 'condition_changed', 'not_found');--> statement-breakpoint
CREATE TYPE "public"."opname_status" AS ENUM('draft', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."receiving_line_type" AS ENUM('asset', 'inventory');--> statement-breakpoint
CREATE TYPE "public"."receiving_type" AS ENUM('purchase', 'opening_balance', 'transfer_in', 'other');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('submitted', 'processing', 'partially_fulfilled', 'fulfilled', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."stock_document_type" AS ENUM('stock_in', 'stock_out', 'transfer', 'adjustment', 'opening_balance');--> statement-breakpoint
CREATE TYPE "public"."stock_transaction_type" AS ENUM('opening_balance', 'stock_in', 'stock_out', 'transfer_out', 'transfer_in', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'support', 'outlet');--> statement-breakpoint
CREATE TABLE "asset_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_conditions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_loans" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_number" text NOT NULL,
	"asset_id" integer NOT NULL,
	"borrower_employee_id" integer,
	"borrower_name" text NOT NULL,
	"borrowing_date" date NOT NULL,
	"expected_return_date" date NOT NULL,
	"actual_return_date" date,
	"condition_before_id" integer NOT NULL,
	"condition_after_id" integer,
	"notes" text,
	"status" "loan_status" DEFAULT 'borrowed' NOT NULL,
	"processed_by" integer NOT NULL,
	"submission_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "asset_loans_return_after_borrow" CHECK ("asset_loans"."expected_return_date" >= "asset_loans"."borrowing_date"),
	CONSTRAINT "asset_loans_actual_return_after_borrow" CHECK ("asset_loans"."actual_return_date" IS NULL OR "asset_loans"."actual_return_date" >= "asset_loans"."borrowing_date")
);
--> statement-breakpoint
CREATE TABLE "asset_maintenances" (
	"id" serial PRIMARY KEY NOT NULL,
	"maintenance_number" text NOT NULL,
	"asset_id" integer NOT NULL,
	"reported_by" integer NOT NULL,
	"location_id" integer NOT NULL,
	"location_name" text NOT NULL,
	"problem_description" text NOT NULL,
	"maintenance_type" "maintenance_type" DEFAULT 'corrective' NOT NULL,
	"technician" text,
	"start_date" date,
	"completion_date" date,
	"repair_description" text,
	"repair_cost" numeric(14, 2),
	"vendor" text,
	"status" "maintenance_status" DEFAULT 'reported' NOT NULL,
	"previous_asset_status" "asset_status",
	"submission_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "asset_maintenances_repair_cost_non_negative" CHECK ("asset_maintenances"."repair_cost" IS NULL OR "asset_maintenances"."repair_cost" >= 0)
);
--> statement-breakpoint
CREATE TABLE "asset_models" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"brand_id" integer NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"movement_number" text,
	"asset_id" integer NOT NULL,
	"movement_type" "asset_movement_type" NOT NULL,
	"movement_date" timestamp with time zone DEFAULT now() NOT NULL,
	"from_location_id" integer,
	"to_location_id" integer,
	"from_employee_id" integer,
	"to_employee_id" integer,
	"department_id" integer,
	"from_location_name" text,
	"to_location_name" text,
	"from_employee_name" text,
	"to_employee_name" text,
	"reason" text,
	"received_by_name" text,
	"performed_by" integer NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_code" text NOT NULL,
	"name" text NOT NULL,
	"category_id" integer NOT NULL,
	"brand_id" integer,
	"model_id" integer,
	"serial_number" text,
	"purchase_date" date,
	"warranty_expiration" date,
	"acquisition_source" text,
	"acquisition_cost" numeric(14, 2),
	"location_id" integer NOT NULL,
	"assigned_employee_id" integer,
	"condition_id" integer NOT NULL,
	"status" "asset_status" DEFAULT 'available' NOT NULL,
	"description" text,
	"photo_path" text,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assets_acquisition_cost_non_negative" CHECK ("assets"."acquisition_cost" IS NULL OR "assets"."acquisition_cost" >= 0)
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"action" text NOT NULL,
	"module" text NOT NULL,
	"record_id" text,
	"previous_value" jsonb,
	"new_value" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"outlet_id" integer NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disposals" (
	"id" serial PRIMARY KEY NOT NULL,
	"disposal_number" text NOT NULL,
	"asset_id" integer NOT NULL,
	"disposal_date" date NOT NULL,
	"reason" "disposal_reason" NOT NULL,
	"final_condition_id" integer NOT NULL,
	"description" text,
	"recorded_by" integer NOT NULL,
	"previous_asset_status" "asset_status" NOT NULL,
	"status" "disposal_status" DEFAULT 'completed' NOT NULL,
	"cancelled_reason" text,
	"cancelled_by" integer,
	"cancelled_at" timestamp with time zone,
	"submission_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doc_counters" (
	"kind" text NOT NULL,
	"year" integer NOT NULL,
	"last" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "doc_counters_kind_year_pk" PRIMARY KEY("kind","year"),
	CONSTRAINT "doc_counters_last_non_negative" CHECK ("doc_counters"."last" >= 0)
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_code" text NOT NULL,
	"full_name" text NOT NULL,
	"email" text,
	"phone" text,
	"outlet_id" integer NOT NULL,
	"department_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_code" text NOT NULL,
	"name" text NOT NULL,
	"category_id" integer NOT NULL,
	"brand_id" integer,
	"unit_id" integer NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_number" text NOT NULL,
	"outlet_id" integer NOT NULL,
	"requested_by" integer NOT NULL,
	"reason" text,
	"notes" text,
	"status" "request_status" DEFAULT 'submitted' NOT NULL,
	"processed_by" integer,
	"rejection_reason" text,
	"submission_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"outlet_id" integer NOT NULL,
	"parent_id" integer,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_parts" (
	"id" serial PRIMARY KEY NOT NULL,
	"maintenance_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"stock_transaction_id" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "maintenance_parts_quantity_positive" CHECK ("maintenance_parts"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "opname_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"opname_id" integer NOT NULL,
	"item_type" "opname_item_type" NOT NULL,
	"inventory_item_id" integer,
	"asset_id" integer,
	"system_qty" integer DEFAULT 0 NOT NULL,
	"physical_qty" integer,
	"condition_id" integer,
	"result" "opname_result",
	"checked_by" integer,
	"checked_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opname_lines_system_qty_non_negative" CHECK ("opname_lines"."system_qty" >= 0),
	CONSTRAINT "opname_lines_physical_qty_non_negative" CHECK ("opname_lines"."physical_qty" IS NULL OR "opname_lines"."physical_qty" >= 0),
	CONSTRAINT "opname_lines_item_reference" CHECK ((
				("opname_lines"."item_type"::text = 'asset' AND "opname_lines"."asset_id" IS NOT NULL AND "opname_lines"."inventory_item_id" IS NULL)
				OR
				("opname_lines"."item_type"::text = 'inventory' AND "opname_lines"."inventory_item_id" IS NOT NULL AND "opname_lines"."asset_id" IS NULL)
			))
);
--> statement-breakpoint
CREATE TABLE "outlets" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_head_office" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"address" text,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receiving_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"receiving_id" integer NOT NULL,
	"line_type" "receiving_line_type" NOT NULL,
	"inventory_item_id" integer,
	"asset_id" integer,
	"quantity" integer NOT NULL,
	"unit_cost" numeric(14, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "receiving_lines_quantity_positive" CHECK ("receiving_lines"."quantity" > 0),
	CONSTRAINT "receiving_lines_item_reference" CHECK ((
				("receiving_lines"."line_type"::text = 'asset' AND "receiving_lines"."asset_id" IS NOT NULL AND "receiving_lines"."inventory_item_id" IS NULL)
				OR
				("receiving_lines"."line_type"::text = 'inventory' AND "receiving_lines"."inventory_item_id" IS NOT NULL AND "receiving_lines"."asset_id" IS NULL)
			))
);
--> statement-breakpoint
CREATE TABLE "receivings" (
	"id" serial PRIMARY KEY NOT NULL,
	"receipt_number" text NOT NULL,
	"receipt_date" date NOT NULL,
	"receiving_type" "receiving_type" NOT NULL,
	"supplier_id" integer,
	"location_id" integer NOT NULL,
	"reference_number" text,
	"notes" text,
	"received_by" integer NOT NULL,
	"submission_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"requested_qty" integer NOT NULL,
	"fulfilled_qty" integer DEFAULT 0 NOT NULL,
	"notes" text,
	CONSTRAINT "request_lines_requested_positive" CHECK ("request_lines"."requested_qty" > 0),
	CONSTRAINT "request_lines_fulfilled_non_negative" CHECK ("request_lines"."fulfilled_qty" >= 0),
	CONSTRAINT "request_lines_fulfilled_not_over_requested" CHECK ("request_lines"."fulfilled_qty" <= "request_lines"."requested_qty")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" text,
	"ip_address" text,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_balances" (
	"item_id" integer NOT NULL,
	"location_id" integer NOT NULL,
	"qty" integer DEFAULT 0 NOT NULL,
	"min_stock" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_balances_item_id_location_id_pk" PRIMARY KEY("item_id","location_id"),
	CONSTRAINT "stock_balances_qty_non_negative" CHECK ("stock_balances"."qty" >= 0),
	CONSTRAINT "stock_balances_min_stock_non_negative" CHECK ("stock_balances"."min_stock" IS NULL OR "stock_balances"."min_stock" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stock_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_number" text NOT NULL,
	"document_type" "stock_document_type" NOT NULL,
	"source_location_id" integer,
	"destination_location_id" integer,
	"reason" text,
	"notes" text,
	"performed_by" integer NOT NULL,
	"submission_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_opnames" (
	"id" serial PRIMARY KEY NOT NULL,
	"opname_number" text NOT NULL,
	"location_id" integer NOT NULL,
	"item_type" "opname_item_type" NOT NULL,
	"status" "opname_status" DEFAULT 'draft' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"location_id" integer NOT NULL,
	"transaction_type" "stock_transaction_type" NOT NULL,
	"signed_qty" integer NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_transactions_signed_qty_non_zero" CHECK ("stock_transactions"."signed_qty" <> 0)
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"phone" text,
	"email" text,
	"address" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"abbreviation" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" text NOT NULL,
	"role" "user_role" NOT NULL,
	"outlet_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_outlet_required" CHECK (("users"."role"::text <> 'outlet' OR "users"."outlet_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "asset_loans" ADD CONSTRAINT "asset_loans_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_loans" ADD CONSTRAINT "asset_loans_borrower_employee_id_employees_id_fk" FOREIGN KEY ("borrower_employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_loans" ADD CONSTRAINT "asset_loans_condition_before_id_asset_conditions_id_fk" FOREIGN KEY ("condition_before_id") REFERENCES "public"."asset_conditions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_loans" ADD CONSTRAINT "asset_loans_condition_after_id_asset_conditions_id_fk" FOREIGN KEY ("condition_after_id") REFERENCES "public"."asset_conditions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_loans" ADD CONSTRAINT "asset_loans_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_maintenances" ADD CONSTRAINT "asset_maintenances_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_maintenances" ADD CONSTRAINT "asset_maintenances_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_maintenances" ADD CONSTRAINT "asset_maintenances_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_models" ADD CONSTRAINT "asset_models_category_id_asset_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."asset_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_models" ADD CONSTRAINT "asset_models_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_from_location_id_locations_id_fk" FOREIGN KEY ("from_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_to_location_id_locations_id_fk" FOREIGN KEY ("to_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_from_employee_id_employees_id_fk" FOREIGN KEY ("from_employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_to_employee_id_employees_id_fk" FOREIGN KEY ("to_employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_category_id_asset_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."asset_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_model_id_asset_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."asset_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_assigned_employee_id_employees_id_fk" FOREIGN KEY ("assigned_employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_condition_id_asset_conditions_id_fk" FOREIGN KEY ("condition_id") REFERENCES "public"."asset_conditions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disposals" ADD CONSTRAINT "disposals_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disposals" ADD CONSTRAINT "disposals_final_condition_id_asset_conditions_id_fk" FOREIGN KEY ("final_condition_id") REFERENCES "public"."asset_conditions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disposals" ADD CONSTRAINT "disposals_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disposals" ADD CONSTRAINT "disposals_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_category_id_inventory_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."inventory_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_requests" ADD CONSTRAINT "item_requests_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_requests" ADD CONSTRAINT "item_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_requests" ADD CONSTRAINT "item_requests_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_parent_id_locations_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_parts" ADD CONSTRAINT "maintenance_parts_maintenance_id_asset_maintenances_id_fk" FOREIGN KEY ("maintenance_id") REFERENCES "public"."asset_maintenances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_parts" ADD CONSTRAINT "maintenance_parts_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_parts" ADD CONSTRAINT "maintenance_parts_stock_transaction_id_stock_transactions_id_fk" FOREIGN KEY ("stock_transaction_id") REFERENCES "public"."stock_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opname_lines" ADD CONSTRAINT "opname_lines_opname_id_stock_opnames_id_fk" FOREIGN KEY ("opname_id") REFERENCES "public"."stock_opnames"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opname_lines" ADD CONSTRAINT "opname_lines_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opname_lines" ADD CONSTRAINT "opname_lines_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opname_lines" ADD CONSTRAINT "opname_lines_condition_id_asset_conditions_id_fk" FOREIGN KEY ("condition_id") REFERENCES "public"."asset_conditions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opname_lines" ADD CONSTRAINT "opname_lines_checked_by_users_id_fk" FOREIGN KEY ("checked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiving_lines" ADD CONSTRAINT "receiving_lines_receiving_id_receivings_id_fk" FOREIGN KEY ("receiving_id") REFERENCES "public"."receivings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiving_lines" ADD CONSTRAINT "receiving_lines_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiving_lines" ADD CONSTRAINT "receiving_lines_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivings" ADD CONSTRAINT "receivings_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivings" ADD CONSTRAINT "receivings_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivings" ADD CONSTRAINT "receivings_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_lines" ADD CONSTRAINT "request_lines_request_id_item_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."item_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_lines" ADD CONSTRAINT "request_lines_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_documents" ADD CONSTRAINT "stock_documents_source_location_id_locations_id_fk" FOREIGN KEY ("source_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_documents" ADD CONSTRAINT "stock_documents_destination_location_id_locations_id_fk" FOREIGN KEY ("destination_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_documents" ADD CONSTRAINT "stock_documents_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opnames" ADD CONSTRAINT "stock_opnames_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opnames" ADD CONSTRAINT "stock_opnames_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_document_id_stock_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."stock_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "asset_categories_name_unique" ON "asset_categories" USING btree ("name");--> statement-breakpoint
CREATE INDEX "asset_categories_active_idx" ON "asset_categories" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "asset_conditions_name_unique" ON "asset_conditions" USING btree ("name");--> statement-breakpoint
CREATE INDEX "asset_conditions_active_idx" ON "asset_conditions" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "asset_loans_number_unique" ON "asset_loans" USING btree ("loan_number");--> statement-breakpoint
CREATE UNIQUE INDEX "asset_loans_submission_unique" ON "asset_loans" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "asset_loans_asset_idx" ON "asset_loans" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "asset_loans_status_idx" ON "asset_loans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "asset_loans_expected_return_idx" ON "asset_loans" USING btree ("expected_return_date");--> statement-breakpoint
CREATE UNIQUE INDEX "asset_maintenances_number_unique" ON "asset_maintenances" USING btree ("maintenance_number");--> statement-breakpoint
CREATE UNIQUE INDEX "asset_maintenances_submission_unique" ON "asset_maintenances" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "asset_maintenances_asset_idx" ON "asset_maintenances" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "asset_maintenances_status_idx" ON "asset_maintenances" USING btree ("status");--> statement-breakpoint
CREATE INDEX "asset_maintenances_location_idx" ON "asset_maintenances" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "asset_maintenances_created_idx" ON "asset_maintenances" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "asset_models_brand_name_unique" ON "asset_models" USING btree ("brand_id","name");--> statement-breakpoint
CREATE INDEX "asset_models_category_idx" ON "asset_models" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "asset_models_brand_idx" ON "asset_models" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "asset_models_active_idx" ON "asset_models" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "asset_movements_number_unique" ON "asset_movements" USING btree ("movement_number");--> statement-breakpoint
CREATE INDEX "asset_movements_asset_idx" ON "asset_movements" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "asset_movements_date_idx" ON "asset_movements" USING btree ("movement_date");--> statement-breakpoint
CREATE INDEX "asset_movements_type_idx" ON "asset_movements" USING btree ("movement_type");--> statement-breakpoint
CREATE INDEX "asset_movements_to_location_idx" ON "asset_movements" USING btree ("to_location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assets_code_unique" ON "assets" USING btree ("asset_code");--> statement-breakpoint
CREATE UNIQUE INDEX "assets_serial_unique" ON "assets" USING btree ("serial_number") WHERE "assets"."serial_number" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "assets_status_idx" ON "assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "assets_location_idx" ON "assets" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "assets_category_idx" ON "assets" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "assets_assigned_employee_idx" ON "assets" USING btree ("assigned_employee_id");--> statement-breakpoint
CREATE INDEX "assets_name_idx" ON "assets" USING btree ("name");--> statement-breakpoint
CREATE INDEX "audit_logs_user_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_module_idx" ON "audit_logs" USING btree ("module");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_record_idx" ON "audit_logs" USING btree ("record_id");--> statement-breakpoint
CREATE UNIQUE INDEX "brands_name_unique" ON "brands" USING btree ("name");--> statement-breakpoint
CREATE INDEX "brands_active_idx" ON "brands" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "departments_outlet_name_unique" ON "departments" USING btree ("outlet_id","name");--> statement-breakpoint
CREATE INDEX "departments_outlet_idx" ON "departments" USING btree ("outlet_id");--> statement-breakpoint
CREATE INDEX "departments_active_idx" ON "departments" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "disposals_number_unique" ON "disposals" USING btree ("disposal_number");--> statement-breakpoint
CREATE UNIQUE INDEX "disposals_submission_unique" ON "disposals" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "disposals_asset_idx" ON "disposals" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "disposals_date_idx" ON "disposals" USING btree ("disposal_date");--> statement-breakpoint
CREATE INDEX "disposals_reason_idx" ON "disposals" USING btree ("reason");--> statement-breakpoint
CREATE INDEX "disposals_status_idx" ON "disposals" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "employees_code_unique" ON "employees" USING btree ("employee_code");--> statement-breakpoint
CREATE INDEX "employees_outlet_idx" ON "employees" USING btree ("outlet_id");--> statement-breakpoint
CREATE INDEX "employees_department_idx" ON "employees" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "employees_name_idx" ON "employees" USING btree ("full_name");--> statement-breakpoint
CREATE INDEX "employees_active_idx" ON "employees" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_categories_name_unique" ON "inventory_categories" USING btree ("name");--> statement-breakpoint
CREATE INDEX "inventory_categories_active_idx" ON "inventory_categories" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_items_code_unique" ON "inventory_items" USING btree ("item_code");--> statement-breakpoint
CREATE INDEX "inventory_items_name_idx" ON "inventory_items" USING btree ("name");--> statement-breakpoint
CREATE INDEX "inventory_items_category_idx" ON "inventory_items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "inventory_items_brand_idx" ON "inventory_items" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "inventory_items_active_idx" ON "inventory_items" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "item_requests_number_unique" ON "item_requests" USING btree ("request_number");--> statement-breakpoint
CREATE UNIQUE INDEX "item_requests_submission_unique" ON "item_requests" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "item_requests_outlet_idx" ON "item_requests" USING btree ("outlet_id");--> statement-breakpoint
CREATE INDEX "item_requests_status_idx" ON "item_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "item_requests_created_idx" ON "item_requests" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "locations_outlet_code_unique" ON "locations" USING btree ("outlet_id","code");--> statement-breakpoint
CREATE INDEX "locations_outlet_idx" ON "locations" USING btree ("outlet_id");--> statement-breakpoint
CREATE INDEX "locations_parent_idx" ON "locations" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "locations_active_idx" ON "locations" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "maintenance_parts_maintenance_idx" ON "maintenance_parts" USING btree ("maintenance_id");--> statement-breakpoint
CREATE INDEX "maintenance_parts_item_idx" ON "maintenance_parts" USING btree ("item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "opname_lines_opname_item_unique" ON "opname_lines" USING btree ("opname_id","inventory_item_id") WHERE "opname_lines"."inventory_item_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "opname_lines_opname_asset_unique" ON "opname_lines" USING btree ("opname_id","asset_id") WHERE "opname_lines"."asset_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "opname_lines_opname_idx" ON "opname_lines" USING btree ("opname_id");--> statement-breakpoint
CREATE INDEX "opname_lines_item_idx" ON "opname_lines" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "opname_lines_asset_idx" ON "opname_lines" USING btree ("asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "outlets_code_unique" ON "outlets" USING btree ("code");--> statement-breakpoint
CREATE INDEX "outlets_active_idx" ON "outlets" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "receiving_lines_receiving_idx" ON "receiving_lines" USING btree ("receiving_id");--> statement-breakpoint
CREATE INDEX "receiving_lines_item_idx" ON "receiving_lines" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "receiving_lines_asset_idx" ON "receiving_lines" USING btree ("asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "receivings_number_unique" ON "receivings" USING btree ("receipt_number");--> statement-breakpoint
CREATE UNIQUE INDEX "receivings_submission_unique" ON "receivings" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "receivings_date_idx" ON "receivings" USING btree ("receipt_date");--> statement-breakpoint
CREATE INDEX "receivings_type_idx" ON "receivings" USING btree ("receiving_type");--> statement-breakpoint
CREATE INDEX "receivings_location_idx" ON "receivings" USING btree ("location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "request_lines_request_item_unique" ON "request_lines" USING btree ("request_id","item_id");--> statement-breakpoint
CREATE INDEX "request_lines_request_idx" ON "request_lines" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "request_lines_item_idx" ON "request_lines" USING btree ("item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_unique" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "stock_balances_location_idx" ON "stock_balances" USING btree ("location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_documents_number_unique" ON "stock_documents" USING btree ("document_number");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_documents_submission_unique" ON "stock_documents" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "stock_documents_type_idx" ON "stock_documents" USING btree ("document_type");--> statement-breakpoint
CREATE INDEX "stock_documents_created_idx" ON "stock_documents" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "stock_documents_source_idx" ON "stock_documents" USING btree ("source_location_id");--> statement-breakpoint
CREATE INDEX "stock_documents_destination_idx" ON "stock_documents" USING btree ("destination_location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_opnames_number_unique" ON "stock_opnames" USING btree ("opname_number");--> statement-breakpoint
CREATE INDEX "stock_opnames_location_idx" ON "stock_opnames" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "stock_opnames_status_idx" ON "stock_opnames" USING btree ("status");--> statement-breakpoint
CREATE INDEX "stock_opnames_created_idx" ON "stock_opnames" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "stock_transactions_document_idx" ON "stock_transactions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "stock_transactions_item_idx" ON "stock_transactions" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "stock_transactions_location_idx" ON "stock_transactions" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "stock_transactions_type_idx" ON "stock_transactions" USING btree ("transaction_type");--> statement-breakpoint
CREATE INDEX "stock_transactions_created_idx" ON "stock_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "suppliers_name_unique" ON "suppliers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "suppliers_active_idx" ON "suppliers" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "units_abbreviation_unique" ON "units" USING btree ("abbreviation");--> statement-breakpoint
CREATE INDEX "units_active_idx" ON "units" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_unique" ON "users" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_outlet_idx" ON "users" USING btree ("outlet_id");--> statement-breakpoint
CREATE INDEX "users_active_idx" ON "users" USING btree ("is_active");