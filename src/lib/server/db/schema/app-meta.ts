import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Metadata kecil untuk menandai versi/informasi teknis aplikasi.
 * Tabel domain yang sebenarnya ditambahkan pada FND-08.
 */
export const appMeta = pgTable('app_meta', {
	key: text('key').primaryKey(),
	value: text('value').notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});
