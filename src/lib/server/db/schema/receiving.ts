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
import { receivingLineTypeEnum, receivingTypeEnum } from './enums';
import { inventoryItems } from './inventory';
import { assets } from './assets';
import { suppliers } from './master-data';
import { locations } from './organization';
import { users } from './users';

export const receivings = pgTable(
	'receivings',
	{
		id: serial('id').primaryKey(),
		receiptNumber: text('receipt_number').notNull(),
		receiptDate: date('receipt_date').notNull(),
		receivingType: receivingTypeEnum('receiving_type').notNull(),
		supplierId: integer('supplier_id').references(() => suppliers.id),
		locationId: integer('location_id')
			.notNull()
			.references(() => locations.id),
		referenceNumber: text('reference_number'),
		notes: text('notes'),
		receivedBy: integer('received_by')
			.notNull()
			.references(() => users.id),
		submissionId: uuid('submission_id').notNull(),
		...timestamps()
	},
	(t) => [
		uniqueIndex('receivings_number_unique').on(t.receiptNumber),
		uniqueIndex('receivings_submission_unique').on(t.submissionId),
		index('receivings_date_idx').on(t.receiptDate),
		index('receivings_type_idx').on(t.receivingType),
		index('receivings_location_idx').on(t.locationId)
	]
);

export const receivingLines = pgTable(
	'receiving_lines',
	{
		id: serial('id').primaryKey(),
		receivingId: integer('receiving_id')
			.notNull()
			.references(() => receivings.id),
		lineType: receivingLineTypeEnum('line_type').notNull(),
		inventoryItemId: integer('inventory_item_id').references(() => inventoryItems.id),
		assetId: integer('asset_id').references(() => assets.id),
		quantity: integer('quantity').notNull(),
		unitCost: numeric('unit_cost', { precision: 14, scale: 2 }),
		notes: text('notes'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		check('receiving_lines_quantity_positive', sql`${t.quantity} > 0`),
		check(
			'receiving_lines_item_reference',
			sql`(
				(${t.lineType}::text = 'asset' AND ${t.assetId} IS NOT NULL AND ${t.inventoryItemId} IS NULL)
				OR
				(${t.lineType}::text = 'inventory' AND ${t.inventoryItemId} IS NOT NULL AND ${t.assetId} IS NULL)
			)`
		),
		index('receiving_lines_receiving_idx').on(t.receivingId),
		index('receiving_lines_item_idx').on(t.inventoryItemId),
		index('receiving_lines_asset_idx').on(t.assetId)
	]
);
