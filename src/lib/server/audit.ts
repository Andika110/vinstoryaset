import { db } from '#lib/server/db/index.js';
import { auditLogs } from '#lib/server/db/schema/index.js';
import type { AuthUser } from './auth/session.js';

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type AuditEntry = {
	module: string;
	action: string;
	recordId: string;
	previousValue?: unknown;
	newValue?: unknown;
};

export type AuditCollector = (entry: AuditEntry) => void;

export async function writeAudit(tx: Tx, actor: AuthUser, entry: AuditEntry): Promise<void> {
	await tx.insert(auditLogs).values({
		userId: actor.id,
		action: entry.action,
		module: entry.module,
		recordId: entry.recordId,
		previousValue: entry.previousValue ?? null,
		newValue: entry.newValue ?? null
	});
}

/**
 * Unit of work untuk operasi tulis: transaksi + audit di transaksi yang sama.
 * Operasi yang tidak menghasilkan satu pun entri audit akan dibatalkan.
 */
export async function withAudit<T>(
	actor: AuthUser,
	fn: (tx: Tx, audit: AuditCollector) => Promise<T>
): Promise<T> {
	return db.transaction(async (tx) => {
		const entries: AuditEntry[] = [];
		const result = await fn(tx, (entry) => entries.push(entry));

		if (entries.length === 0) {
			throw new Error('Operasi tulis tanpa entri audit.');
		}

		await tx.insert(auditLogs).values(
			entries.map((entry) => ({
				userId: actor.id,
				module: entry.module,
				action: entry.action,
				recordId: entry.recordId,
				previousValue: entry.previousValue ?? null,
				newValue: entry.newValue ?? null
			}))
		);

		return result;
	});
}
