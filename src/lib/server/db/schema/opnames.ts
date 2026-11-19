import { sql } from 'drizzle-orm';
import {
	check,
	index,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { timestamps } from './columns';
import { opnameItemTypeEnum, opnameResultEnum, opnameStatusEnum } from './enums';
import { assets } from './assets';
import { inventoryItems } from './inventory';
import { assetConditions } from './master-data';
import { locations } from './organization';
import { users } from './users';

export const stockOpnames = pgTable(
	'stock_opnames',
	{
		id: serial('id').primaryKey(),
		opnameNumber: text('opname_number').notNull(),
		locationId: integer('location_id')
			.notNull()
			.references(() => locations.id),
		itemType: opnameItemTypeEnum('item_type').notNull(),
		status: opnameStatusEnum('status').notNull().default('draft'),
		startedAt: timestamp('started_at', { withTimezone: true }),
		completedAt: timestamp('completed_at', { withTimezone: true }),
		createdBy: integer('created_by')
			.notNull()
			.references(() => users.id),
		notes: text('notes'),
		...timestamps()
	},
	(t) => [
		uniqueIndex('stock_opnames_number_unique').on(t.opnameNumber),
		index('stock_opnames_location_idx').on(t.locationId),
		index('stock_opnames_status_idx').on(t.status),
		index('stock_opnames_created_idx').on(t.createdAt)
	]
);

export const opnameLines = pgTable(
	'opname_lines',
	{
		id: serial('id').primaryKey(),
		opnameId: integer('opname_id')
			.notNull()
			.references(() => stockOpnames.id),
		itemType: opnameItemTypeEnum('item_type').notNull(),
		inventoryItemId: integer('inventory_item_id').references(() => inventoryItems.id),
		assetId: integer('asset_id').references(() => assets.id),
		systemQty: integer('system_qty').notNull().default(0),
		physicalQty: integer('physical_qty'),
		conditionId: integer('condition_id').references(() => assetConditions.id),
		result: opnameResultEnum('result'),
		checkedBy: integer('checked_by').references(() => users.id),
		checkedAt: timestamp('checked_at', { withTimezone: true }),
		notes: text('notes'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		check('opname_lines_system_qty_non_negative', sql`${t.systemQty} >= 0`),
		check(
			'opname_lines_physical_qty_non_negative',
			sql`${t.physicalQty} IS NULL OR ${t.physicalQty} >= 0`
		),
		check(
			'opname_lines_item_reference',
			sql`(
				(${t.itemType}::text = 'asset' AND ${t.assetId} IS NOT NULL AND ${t.inventoryItemId} IS NULL)
				OR
				(${t.itemType}::text = 'inventory' AND ${t.inventoryItemId} IS NOT NULL AND ${t.assetId} IS NULL)
			)`
		),
		uniqueIndex('opname_lines_opname_item_unique')
			.on(t.opnameId, t.inventoryItemId)
			.where(sql`${t.inventoryItemId} IS NOT NULL`),
		uniqueIndex('opname_lines_opname_asset_unique')
			.on(t.opnameId, t.assetId)
			.where(sql`${t.assetId} IS NOT NULL`),
		index('opname_lines_opname_idx').on(t.opnameId),
		index('opname_lines_item_idx').on(t.inventoryItemId),
		index('opname_lines_asset_idx').on(t.assetId)
	]
);
