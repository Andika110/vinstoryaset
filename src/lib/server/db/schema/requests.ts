import { sql } from 'drizzle-orm';
import {
	check,
	index,
	integer,
	pgTable,
	serial,
	text,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';
import { timestamps } from './columns';
import { requestStatusEnum } from './enums';
import { inventoryItems } from './inventory';
import { outlets } from './organization';
import { users } from './users';

export const itemRequests = pgTable(
	'item_requests',
	{
		id: serial('id').primaryKey(),
		requestNumber: text('request_number').notNull(),
		outletId: integer('outlet_id')
			.notNull()
			.references(() => outlets.id),
		requestedBy: integer('requested_by')
			.notNull()
			.references(() => users.id),
		reason: text('reason'),
		notes: text('notes'),
		status: requestStatusEnum('status').notNull().default('submitted'),
		processedBy: integer('processed_by').references(() => users.id),
		rejectionReason: text('rejection_reason'),
		submissionId: uuid('submission_id').notNull(),
		...timestamps()
	},
	(t) => [
		uniqueIndex('item_requests_number_unique').on(t.requestNumber),
		uniqueIndex('item_requests_submission_unique').on(t.submissionId),
		index('item_requests_outlet_idx').on(t.outletId),
		index('item_requests_status_idx').on(t.status),
		index('item_requests_created_idx').on(t.createdAt)
	]
);

export const requestLines = pgTable(
	'request_lines',
	{
		id: serial('id').primaryKey(),
		requestId: integer('request_id')
			.notNull()
			.references(() => itemRequests.id),
		itemId: integer('item_id')
			.notNull()
			.references(() => inventoryItems.id),
		requestedQty: integer('requested_qty').notNull(),
		fulfilledQty: integer('fulfilled_qty').notNull().default(0),
		notes: text('notes')
	},
	(t) => [
		uniqueIndex('request_lines_request_item_unique').on(t.requestId, t.itemId),
		index('request_lines_request_idx').on(t.requestId),
		index('request_lines_item_idx').on(t.itemId),
		check('request_lines_requested_positive', sql`${t.requestedQty} > 0`),
		check('request_lines_fulfilled_non_negative', sql`${t.fulfilledQty} >= 0`),
		check('request_lines_fulfilled_not_over_requested', sql`${t.fulfilledQty} <= ${t.requestedQty}`)
	]
);
