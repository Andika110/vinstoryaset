import { sql } from 'drizzle-orm';
import {
	check,
	date,
	index,
	integer,
	numeric,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';
import { timestamps } from './columns';
import {
	assetMovementTypeEnum,
	assetStatusEnum,
	disposalReasonEnum,
	disposalStatusEnum,
	loanStatusEnum,
	maintenanceStatusEnum,
	maintenanceTypeEnum
} from './enums';
import { inventoryItems, stockTransactions } from './inventory';
import { assetCategories, assetConditions, assetModels, brands } from './master-data';
import { departments, employees, locations } from './organization';
import { users } from './users';

export const assets = pgTable(
	'assets',
	{
		id: serial('id').primaryKey(),
		assetCode: text('asset_code').notNull(),
		name: text('name').notNull(),
		categoryId: integer('category_id')
			.notNull()
			.references(() => assetCategories.id),
		brandId: integer('brand_id').references(() => brands.id),
		modelId: integer('model_id').references(() => assetModels.id),
		serialNumber: text('serial_number'),
		purchaseDate: date('purchase_date'),
		warrantyExpiration: date('warranty_expiration'),
		acquisitionSource: text('acquisition_source'),
		acquisitionCost: numeric('acquisition_cost', { precision: 14, scale: 2 }),
		locationId: integer('location_id')
			.notNull()
			.references(() => locations.id),
		assignedEmployeeId: integer('assigned_employee_id').references(() => employees.id),
		conditionId: integer('condition_id')
			.notNull()
			.references(() => assetConditions.id),
		status: assetStatusEnum('status').notNull().default('available'),
		description: text('description'),
		photoPath: text('photo_path'),
		createdBy: integer('created_by').references(() => users.id),
		updatedBy: integer('updated_by').references(() => users.id),
		...timestamps()
	},
	(t) => [
		uniqueIndex('assets_code_unique').on(t.assetCode),
		uniqueIndex('assets_serial_unique')
			.on(t.serialNumber)
			.where(sql`${t.serialNumber} IS NOT NULL`),
		index('assets_status_idx').on(t.status),
		index('assets_location_idx').on(t.locationId),
		index('assets_category_idx').on(t.categoryId),
		index('assets_assigned_employee_idx').on(t.assignedEmployeeId),
		index('assets_name_idx').on(t.name),
		check(
			'assets_acquisition_cost_non_negative',
			sql`${t.acquisitionCost} IS NULL OR ${t.acquisitionCost} >= 0`
		)
	]
);

export const assetMovements = pgTable(
	'asset_movements',
	{
		id: serial('id').primaryKey(),
		movementNumber: text('movement_number'),
		assetId: integer('asset_id')
			.notNull()
			.references(() => assets.id),
		movementType: assetMovementTypeEnum('movement_type').notNull(),
		movementDate: timestamp('movement_date', { withTimezone: true }).notNull().defaultNow(),
		fromLocationId: integer('from_location_id').references(() => locations.id),
		toLocationId: integer('to_location_id').references(() => locations.id),
		fromEmployeeId: integer('from_employee_id').references(() => employees.id),
		toEmployeeId: integer('to_employee_id').references(() => employees.id),
		departmentId: integer('department_id').references(() => departments.id),
		fromLocationName: text('from_location_name'),
		toLocationName: text('to_location_name'),
		fromEmployeeName: text('from_employee_name'),
		toEmployeeName: text('to_employee_name'),
		reason: text('reason'),
		receivedByName: text('received_by_name'),
		performedBy: integer('performed_by')
			.notNull()
			.references(() => users.id),
		notes: text('notes'),
		submissionId: uuid('submission_id'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		uniqueIndex('asset_movements_number_unique').on(t.movementNumber),
		uniqueIndex('asset_movements_submission_unique')
			.on(t.submissionId)
			.where(sql`${t.submissionId} IS NOT NULL`),
		index('asset_movements_asset_idx').on(t.assetId),
		index('asset_movements_date_idx').on(t.movementDate),
		index('asset_movements_type_idx').on(t.movementType),
		index('asset_movements_to_location_idx').on(t.toLocationId)
	]
);

export const assetLoans = pgTable(
	'asset_loans',
	{
		id: serial('id').primaryKey(),
		loanNumber: text('loan_number').notNull(),
		assetId: integer('asset_id')
			.notNull()
			.references(() => assets.id),
		borrowerEmployeeId: integer('borrower_employee_id').references(() => employees.id),
		borrowerName: text('borrower_name').notNull(),
		borrowingDate: date('borrowing_date').notNull(),
		expectedReturnDate: date('expected_return_date').notNull(),
		actualReturnDate: date('actual_return_date'),
		conditionBeforeId: integer('condition_before_id')
			.notNull()
			.references(() => assetConditions.id),
		conditionAfterId: integer('condition_after_id').references(() => assetConditions.id),
		notes: text('notes'),
		status: loanStatusEnum('status').notNull().default('borrowed'),
		processedBy: integer('processed_by')
			.notNull()
			.references(() => users.id),
		submissionId: uuid('submission_id').notNull(),
		...timestamps()
	},
	(t) => [
		uniqueIndex('asset_loans_number_unique').on(t.loanNumber),
		uniqueIndex('asset_loans_submission_unique').on(t.submissionId),
		index('asset_loans_asset_idx').on(t.assetId),
		index('asset_loans_status_idx').on(t.status),
		index('asset_loans_expected_return_idx').on(t.expectedReturnDate),
		check('asset_loans_return_after_borrow', sql`${t.expectedReturnDate} >= ${t.borrowingDate}`),
		check(
			'asset_loans_actual_return_after_borrow',
			sql`${t.actualReturnDate} IS NULL OR ${t.actualReturnDate} >= ${t.borrowingDate}`
		)
	]
);

export const assetMaintenances = pgTable(
	'asset_maintenances',
	{
		id: serial('id').primaryKey(),
		maintenanceNumber: text('maintenance_number').notNull(),
		assetId: integer('asset_id')
			.notNull()
			.references(() => assets.id),
		reportedBy: integer('reported_by')
			.notNull()
			.references(() => users.id),
		locationId: integer('location_id')
			.notNull()
			.references(() => locations.id),
		locationName: text('location_name').notNull(),
		problemDescription: text('problem_description').notNull(),
		maintenanceType: maintenanceTypeEnum('maintenance_type').notNull().default('corrective'),
		technician: text('technician'),
		startDate: date('start_date'),
		completionDate: date('completion_date'),
		repairDescription: text('repair_description'),
		repairCost: numeric('repair_cost', { precision: 14, scale: 2 }),
		vendor: text('vendor'),
		status: maintenanceStatusEnum('status').notNull().default('reported'),
		previousAssetStatus: assetStatusEnum('previous_asset_status'),
		photoPath: text('photo_path'),
		cancelledReason: text('cancelled_reason'),
		submissionId: uuid('submission_id').notNull(),
		...timestamps()
	},
	(t) => [
		uniqueIndex('asset_maintenances_number_unique').on(t.maintenanceNumber),
		uniqueIndex('asset_maintenances_submission_unique').on(t.submissionId),
		index('asset_maintenances_asset_idx').on(t.assetId),
		index('asset_maintenances_status_idx').on(t.status),
		index('asset_maintenances_location_idx').on(t.locationId),
		index('asset_maintenances_created_idx').on(t.createdAt),
		check(
			'asset_maintenances_repair_cost_non_negative',
			sql`${t.repairCost} IS NULL OR ${t.repairCost} >= 0`
		)
	]
);

export const maintenanceParts = pgTable(
	'maintenance_parts',
	{
		id: serial('id').primaryKey(),
		maintenanceId: integer('maintenance_id')
			.notNull()
			.references(() => assetMaintenances.id),
		itemId: integer('item_id')
			.notNull()
			.references(() => inventoryItems.id),
		quantity: integer('quantity').notNull(),
		stockTransactionId: integer('stock_transaction_id').references(() => stockTransactions.id),
		notes: text('notes'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		check('maintenance_parts_quantity_positive', sql`${t.quantity} > 0`),
		index('maintenance_parts_maintenance_idx').on(t.maintenanceId),
		index('maintenance_parts_item_idx').on(t.itemId)
	]
);

export const disposals = pgTable(
	'disposals',
	{
		id: serial('id').primaryKey(),
		disposalNumber: text('disposal_number').notNull(),
		assetId: integer('asset_id')
			.notNull()
			.references(() => assets.id),
		disposalDate: date('disposal_date').notNull(),
		reason: disposalReasonEnum('reason').notNull(),
		finalConditionId: integer('final_condition_id')
			.notNull()
			.references(() => assetConditions.id),
		description: text('description'),
		recordedBy: integer('recorded_by')
			.notNull()
			.references(() => users.id),
		previousAssetStatus: assetStatusEnum('previous_asset_status').notNull(),
		status: disposalStatusEnum('status').notNull().default('completed'),
		cancelledReason: text('cancelled_reason'),
		cancelledBy: integer('cancelled_by').references(() => users.id),
		cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
		submissionId: uuid('submission_id').notNull(),
		...timestamps()
	},
	(t) => [
		uniqueIndex('disposals_number_unique').on(t.disposalNumber),
		uniqueIndex('disposals_submission_unique').on(t.submissionId),
		index('disposals_asset_idx').on(t.assetId),
		index('disposals_date_idx').on(t.disposalDate),
		index('disposals_reason_idx').on(t.reason),
		index('disposals_status_idx').on(t.status)
	]
);
