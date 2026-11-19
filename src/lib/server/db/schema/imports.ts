import {
	bigserial,
	index,
	integer,
	jsonb,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { users } from './users';

/** Riwayat batch impor data awal. Append-only; baris hasil disimpan terpisah. */
export const importBatches = pgTable(
	'import_batches',
	{
		id: serial('id').primaryKey(),
		batchNumber: text('batch_number').notNull(),
		importType: text('import_type').notNull(),
		status: text('status').notNull(),
		totalRows: integer('total_rows').notNull().default(0),
		successCount: integer('success_count').notNull().default(0),
		failedCount: integer('failed_count').notNull().default(0),
		createdBy: integer('created_by')
			.notNull()
			.references(() => users.id),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		uniqueIndex('import_batches_number_unique').on(t.batchNumber),
		index('import_batches_type_idx').on(t.importType),
		index('import_batches_created_idx').on(t.createdAt),
		index('import_batches_user_idx').on(t.createdBy)
	]
);

/** Hasil per baris untuk satu batch impor. */
export const importBatchRows = pgTable(
	'import_batch_rows',
	{
		id: bigserial('id', { mode: 'number' }).primaryKey(),
		batchId: integer('batch_id')
			.notNull()
			.references(() => importBatches.id, { onDelete: 'cascade' }),
		rowNumber: integer('row_number').notNull(),
		status: text('status').notNull(),
		message: text('message'),
		data: jsonb('data'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('import_batch_rows_batch_idx').on(t.batchId),
		index('import_batch_rows_status_idx').on(t.status)
	]
);
