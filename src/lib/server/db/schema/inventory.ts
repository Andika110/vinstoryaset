import { sql } from 'drizzle-orm';
import {
	boolean,
	check,
	index,
	integer,
	pgTable,
	primaryKey,
	serial,
	text,
	timestamp,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';
import { timestamps } from './columns';
import { stockDocumentTypeEnum, stockTransactionTypeEnum } from './enums';
import { brands, inventoryCategories, units } from './master-data';
import { locations } from './organization';
import { users } from './users';

export const inventoryItems = pgTable(
	'inventory_items',
	{
		id: serial('id').primaryKey(),
		itemCode: text('item_code').notNull(),
		name: text('name').notNull(),
		categoryId: integer('category_id')
			.notNull()
			.references(() => inventoryCategories.id),
		brandId: integer('brand_id').references(() => brands.id),
		unitId: integer('unit_id')
			.notNull()
			.references(() => units.id),
		description: text('description'),
		isActive: boolean('is_active').notNull().default(true),
		...timestamps()
	},
	(t) => [
		uniqueIndex('inventory_items_code_unique').on(t.itemCode),
		index('inventory_items_name_idx').on(t.name),
		index('inventory_items_category_idx').on(t.categoryId),
		index('inventory_items_brand_idx').on(t.brandId),
		index('inventory_items_active_idx').on(t.isActive)
	]
);

export const stockBalances = pgTable(
	'stock_balances',
	{
		itemId: integer('item_id')
			.notNull()
			.references(() => inventoryItems.id),
		locationId: integer('location_id')
			.notNull()
			.references(() => locations.id),
		qty: integer('qty').notNull().default(0),
		minStock: integer('min_stock'),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		primaryKey({ columns: [t.itemId, t.locationId] }),
		check('stock_balances_qty_non_negative', sql`${t.qty} >= 0`),
		check(
			'stock_balances_min_stock_non_negative',
			sql`${t.minStock} IS NULL OR ${t.minStock} >= 0`
		),
		index('stock_balances_location_idx').on(t.locationId)
	]
);

export const stockDocuments = pgTable(
	'stock_documents',
	{
		id: serial('id').primaryKey(),
		documentNumber: text('document_number').notNull(),
		documentType: stockDocumentTypeEnum('document_type').notNull(),
		sourceLocationId: integer('source_location_id').references(() => locations.id),
		destinationLocationId: integer('destination_location_id').references(() => locations.id),
		reason: text('reason'),
		referenceType: text('reference_type'),
		referenceId: integer('reference_id'),
		notes: text('notes'),
		performedBy: integer('performed_by')
			.notNull()
			.references(() => users.id),
		submissionId: uuid('submission_id').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		uniqueIndex('stock_documents_number_unique').on(t.documentNumber),
		uniqueIndex('stock_documents_submission_unique').on(t.submissionId),
		index('stock_documents_type_idx').on(t.documentType),
		index('stock_documents_created_idx').on(t.createdAt),
		index('stock_documents_source_idx').on(t.sourceLocationId),
		index('stock_documents_destination_idx').on(t.destinationLocationId),
		index('stock_documents_reference_idx').on(t.referenceType, t.referenceId)
	]
);

export const stockTransactions = pgTable(
	'stock_transactions',
	{
		id: serial('id').primaryKey(),
		documentId: integer('document_id')
			.notNull()
			.references(() => stockDocuments.id),
		itemId: integer('item_id')
			.notNull()
			.references(() => inventoryItems.id),
		locationId: integer('location_id')
			.notNull()
			.references(() => locations.id),
		transactionType: stockTransactionTypeEnum('transaction_type').notNull(),
		signedQty: integer('signed_qty').notNull(),
		notes: text('notes'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		check('stock_transactions_signed_qty_non_zero', sql`${t.signedQty} <> 0`),
		index('stock_transactions_document_idx').on(t.documentId),
		index('stock_transactions_item_idx').on(t.itemId),
		index('stock_transactions_location_idx').on(t.locationId),
		index('stock_transactions_type_idx').on(t.transactionType),
		index('stock_transactions_created_idx').on(t.createdAt)
	]
);
