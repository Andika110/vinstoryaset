import { and, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/bun-sql';
import * as schema from '../src/lib/server/db/schema/index';
import {
	inventoryItems,
	locations,
	stockBalances,
	stockTransactions
} from '../src/lib/server/db/schema/index';

const databaseUrl = process.env.DATABASE_URL_MIGRATE ?? process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error('DATABASE_URL_MIGRATE belum diatur.');
}

const db = drizzle(databaseUrl, { schema });

const mismatches = await db
	.select({
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

if (mismatches.length === 0) {
	console.log('Stock invariant OK: semua saldo sama dengan ledger.');
	process.exit(0);
}

console.error(`Ditemukan ${mismatches.length} saldo tidak konsisten:`);
for (const row of mismatches) {
	console.error(
		`${row.itemCode} @ ${row.locationName}: saldo ${row.balance}, ledger ${row.ledger}`
	);
}
process.exit(1);
