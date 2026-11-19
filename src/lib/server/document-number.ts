import { sql } from 'drizzle-orm';
import type { Tx } from './audit.js';
import { docCounters } from '#lib/server/db/schema/index.js';

/**
 * Prefix dokumen yang didukung `nextNumber`.
 * Counter disimpan per kind + tahun dan diperbarui di dalam transaksi dokumen.
 */
export type DocumentKind =
	| 'REQ'
	| 'LN'
	| 'MUT'
	| 'MNT'
	| 'DSP'
	| 'RCV'
	| 'ASG'
	| 'STO'
	| 'SOT'
	| 'TRF'
	| 'ADJ'
	| 'OB'
	| 'IMP'
	| 'OPN';

/**
 * Membuat nomor dokumen berikutnya, mis. `LN-2026-0001`.
 * Harus dipanggil di dalam transaksi yang sama dengan insert dokumen agar
 * counter ikut rollback saat transaksi gagal (tidak ada nomor bolong).
 */
export async function nextNumber(tx: Tx, kind: DocumentKind, date = new Date()): Promise<string> {
	const year = date.getFullYear();
	const [row] = await tx
		.insert(docCounters)
		.values({ kind, year, last: 1 })
		.onConflictDoUpdate({
			target: [docCounters.kind, docCounters.year],
			set: { last: sql`${docCounters.last} + 1` }
		})
		.returning({ last: docCounters.last });

	return `${kind}-${year}-${String(row.last).padStart(4, '0')}`;
}
