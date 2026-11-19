import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { withAudit } from '#lib/server/audit.js';
import { login } from '#lib/server/auth/service.js';
import { db } from '#lib/server/db/index.js';
import {
	auditLogs,
	docCounters,
	itemRequests,
	stockBalances,
	stockDocuments,
	stockTransactions
} from '#lib/server/db/schema/index.js';
import { nextNumber } from '#lib/server/document-number.js';
import { createAsset, listAssets } from '#lib/server/services/assets.js';
import { createReceiving } from '#lib/server/services/receivings.js';
import { createRequest } from '#lib/server/services/requests.js';
import { createStockDocument } from '#lib/server/services/stock.js';
import { seedBaseFixtures, type TestFixtures } from './helpers/fixtures.js';
import { resetTestDatabase } from './helpers/test-db.js';

let fx: TestFixtures;

beforeEach(async () => {
	await resetTestDatabase();
	fx = await seedBaseFixtures();
});

afterAll(async () => {
	await resetTestDatabase();
});

async function adminActor() {
	return (await login(fx.adminUsername, fx.password)).user;
}

async function outletActor() {
	return (await login(fx.outletUsername, fx.password)).user;
}

function assetInput(code: string, locationId: number) {
	return {
		assetCode: code,
		name: `QA ${code}`,
		categoryId: fx.assetCategoryId,
		brandId: null,
		modelId: null,
		serialNumber: `${code}-SERIAL`,
		purchaseDate: '2026-01-10',
		warrantyExpiration: null,
		acquisitionSource: null,
		acquisitionCost: null,
		locationId,
		conditionId: fx.conditionId,
		description: null
	};
}

function receivingInput(quantity: number) {
	return {
		receivingType: 'purchase' as const,
		receiptDate: '2026-11-19',
		supplierId: null,
		locationId: fx.hoLocationId,
		referenceNumber: null,
		notes: 'QA integration receiving',
		lineType: 'inventory' as const,
		inventoryItemId: fx.itemId,
		quantity,
		unitCost: '1000',
		assetName: null,
		categoryId: null,
		brandId: null,
		modelId: null,
		conditionId: null,
		serialNumber: null,
		warrantyExpiration: null,
		assetDescription: null,
		submissionId: randomUUID()
	};
}

function stockOutInput(quantity: number, submissionId = randomUUID()) {
	return {
		type: 'stock_out' as const,
		itemId: fx.itemId,
		locationId: fx.hoLocationId,
		destinationLocationId: null,
		quantity,
		direction: 'out' as const,
		reason: 'QA integration stock out',
		notes: null,
		submissionId
	};
}

async function auditActions(): Promise<string[]> {
	const rows = await db.select({ action: auditLogs.action }).from(auditLogs);
	return rows.map((row) => row.action);
}

describe('login & outlet isolation', () => {
	test('akun nyata tiap role dan scope outlet', async () => {
		const admin = await adminActor();
		expect(admin.role).toBe('admin');

		const outlet = await outletActor();
		expect(outlet.role).toBe('outlet');
		expect(outlet.outletId).toBe(fx.outletId);

		await createAsset(admin, assetInput('QA-SCOPE-HO', fx.hoLocationId));
		await createAsset(admin, assetInput('QA-SCOPE-OUT', fx.outletLocationId));

		const adminList = await listAssets(admin, { search: 'QA-SCOPE', pageSize: 50 });
		const outletList = await listAssets(outlet, { search: 'QA-SCOPE', pageSize: 50 });

		expect(adminList.total).toBe(2);
		expect(outletList.total).toBe(1);
		expect(outletList.items[0]?.assetCode).toBe('QA-SCOPE-OUT');

		await expect(createAsset(outlet, assetInput('QA-DENIED', fx.outletLocationId))).rejects.toThrow(
			'akses'
		);
	});
});

describe('critical path smoke', () => {
	test('login, create asset, stock in/out, request + audit', async () => {
		const admin = await adminActor();
		const outlet = await outletActor();

		const assetId = await createAsset(admin, assetInput('QA-SMOKE-ASSET', fx.hoLocationId));
		expect(assetId).toBeGreaterThan(0);

		const receivingId = await createReceiving(admin, receivingInput(10));
		expect(receivingId).toBeGreaterThan(0);

		const stockOutId = await createStockDocument(admin, stockOutInput(4));
		expect(stockOutId).toBeGreaterThan(0);

		const requestId = await createRequest(outlet, {
			reason: 'QA integration request',
			notes: null,
			lines: [{ itemId: fx.itemId, quantity: 2, notes: null }],
			submissionId: randomUUID()
		});
		expect(requestId).toBeGreaterThan(0);

		const [balance] = await db
			.select({ qty: stockBalances.qty })
			.from(stockBalances)
			.where(eq(stockBalances.itemId, fx.itemId));
		expect(balance.qty).toBe(6);

		const [ledger] = await db
			.select({ total: sql<number>`coalesce(sum(${stockTransactions.signedQty}), 0)::int` })
			.from(stockTransactions)
			.where(eq(stockTransactions.itemId, fx.itemId));
		expect(ledger.total).toBe(6);

		const [request] = await db
			.select({ id: itemRequests.id })
			.from(itemRequests)
			.where(eq(itemRequests.id, requestId));
		expect(request.id).toBe(requestId);

		const actions = await auditActions();
		expect(actions).toContain('asset_created');
		expect(actions).toContain('receiving_created');
		expect(actions).toContain('inventory_stock_in');
		expect(actions).toContain('stock_out_created');
		expect(actions).toContain('request_created');
	});
});

describe('parallel stock out', () => {
	test('stok terbatas: satu sukses, satu ditolak, saldo tidak negatif', async () => {
		const admin = await adminActor();
		await createReceiving(admin, receivingInput(10));

		const results = await Promise.allSettled([
			createStockDocument(admin, stockOutInput(7)),
			createStockDocument(admin, stockOutInput(7))
		]);

		const fulfilled = results.filter((result) => result.status === 'fulfilled');
		const rejected = results.filter((result) => result.status === 'rejected');
		expect(fulfilled).toHaveLength(1);
		expect(rejected).toHaveLength(1);

		const reason = (rejected[0] as PromiseRejectedResult).reason as { code?: string };
		expect(reason.code).toBe('STOK_TIDAK_CUKUP');

		const [balance] = await db
			.select({ qty: stockBalances.qty })
			.from(stockBalances)
			.where(eq(stockBalances.itemId, fx.itemId));
		expect(balance.qty).toBe(3);
		expect(balance.qty).toBeGreaterThanOrEqual(0);

		const [ledger] = await db
			.select({ total: sql<number>`coalesce(sum(${stockTransactions.signedQty}), 0)::int` })
			.from(stockTransactions)
			.where(eq(stockTransactions.itemId, fx.itemId));
		expect(ledger.total).toBe(3);

		const actions = await auditActions();
		expect(actions.filter((action) => action === 'stock_out_created')).toHaveLength(1);

		const stockOutDocs = await db
			.select({ id: stockDocuments.id })
			.from(stockDocuments)
			.where(eq(stockDocuments.documentType, 'stock_out'));
		expect(stockOutDocs).toHaveLength(1);

		const [counter] = await db
			.select({ last: docCounters.last })
			.from(docCounters)
			.where(eq(docCounters.kind, 'SOT'));
		expect(counter.last).toBe(1);
	});
});

describe('idempotency & document numbers', () => {
	test('submission ganda tidak menggandakan stok/audit', async () => {
		const admin = await adminActor();
		await createReceiving(admin, receivingInput(10));
		const submissionId = randomUUID();

		const first = await createStockDocument(admin, stockOutInput(2, submissionId));
		const second = await createStockDocument(admin, stockOutInput(2, submissionId));
		expect(second).toBe(first);

		const [balance] = await db
			.select({ qty: stockBalances.qty })
			.from(stockBalances)
			.where(eq(stockBalances.itemId, fx.itemId));
		expect(balance.qty).toBe(8);

		const actions = await auditActions();
		expect(actions.filter((action) => action === 'stock_out_created')).toHaveLength(1);
	});

	test('rollback nomor dokumen tidak menaikkan counter', async () => {
		await expect(
			db.transaction(async (tx) => {
				await nextNumber(tx, 'LN');
				throw new Error('force rollback');
			})
		).rejects.toThrow('force rollback');

		const rows = await db
			.select({ last: docCounters.last })
			.from(docCounters)
			.where(eq(docCounters.kind, 'LN'));
		expect(rows).toHaveLength(0);
	});

	test('withAudit menolak operasi tanpa audit', async () => {
		const admin = await adminActor();
		await expect(withAudit(admin, async () => 1)).rejects.toThrow('tanpa entri audit');
	});
});
