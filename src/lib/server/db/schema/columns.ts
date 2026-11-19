import { timestamp } from 'drizzle-orm/pg-core';

/** Kolom waktu standar; semua waktu disimpan sebagai timestamptz (UTC). */
export const timestamps = () => ({
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});
