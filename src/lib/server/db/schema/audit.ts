import { sql } from 'drizzle-orm';
import {
	bigserial,
	check,
	index,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const auditLogs = pgTable(
	'audit_logs',
	{
		id: bigserial('id', { mode: 'number' }).primaryKey(),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id),
		action: text('action').notNull(),
		module: text('module').notNull(),
		recordId: text('record_id'),
		previousValue: jsonb('previous_value'),
		newValue: jsonb('new_value'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('audit_logs_user_idx').on(t.userId),
		index('audit_logs_module_idx').on(t.module),
		index('audit_logs_action_idx').on(t.action),
		index('audit_logs_created_idx').on(t.createdAt),
		index('audit_logs_record_idx').on(t.recordId)
	]
);

export const docCounters = pgTable(
	'doc_counters',
	{
		kind: text('kind').notNull(),
		year: integer('year').notNull(),
		last: integer('last').notNull().default(0)
	},
	(t) => [
		primaryKey({ columns: [t.kind, t.year] }),
		check('doc_counters_last_non_negative', sql`${t.last} >= 0`)
	]
);
