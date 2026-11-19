import { and, eq, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.js';
import {
	inventoryItems,
	locations,
	stockBalances,
	stockTransactions
} from '#lib/server/db/schema/index.js';

export type StockInvariantMismatch = {
	itemId: number;
	locationId: number;
	itemCode: string;
	itemName: string;
	locationName: string;
	balance: number;
	ledger: number;
};

/**
 * Invariant stok: saldo tersimpan harus sama dengan jumlah ledger.
 * Hasil kosong berarti konsisten.
 */
export async function findStockInvariantMismatches(): Promise<StockInvariantMismatch[]> {
	const rows = await db
		.select({
			itemId: stockBalances.itemId,
			locationId: stockBalances.locationId,
			itemCode: inventoryItems.itemCode,
			itemName: inventoryItems.name,
			locationName: locations.name,
			balance: stockBalances.qty,
			ledger: sql<number>`coalesce(sum(${stockTransactions.signedQty}), 0)::int`
		})
		.from(stockBalances)
		.innerJoin(inventoryItems, eq(stockBalances.itemId, inventoryItems.id))
		.innerJoin(locations, eq(stockBalances.locationId, locations.id))
		.leftJoin(
			stockTransactions,
			and(
				eq(stockTransactions.itemId, stockBalances.itemId),
				eq(stockTransactions.locationId, stockBalances.locationId)
			)
		)
		.groupBy(
			stockBalances.itemId,
			stockBalances.locationId,
			stockBalances.qty,
			inventoryItems.itemCode,
			inventoryItems.name,
			locations.name
		)
		.having(sql`${stockBalances.qty} <> coalesce(sum(${stockTransactions.signedQty}), 0)`);

	return rows.map((row) => ({
		...row,
		balance: Number(row.balance),
		ledger: Number(row.ledger)
	}));
}
