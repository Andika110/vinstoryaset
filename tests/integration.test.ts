import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { withAudit } from '#lib/server/audit.js';
import { login } from '#lib/server/auth/service.js';
import { db } from '#lib/server/db/index.js';
import {
	assetModels,
	assets,
	auditLogs,
	brands,
	docCounters,
	inventoryCategories,
	inventoryItems,
	itemRequests,
	stockBalances,
	stockDocuments,
	stockTransactions,
	units
} from '#lib/server/db/schema/index.js';
import { nextNumber } from '#lib/server/document-number.js';
import { createAsset, listAssets } from '#lib/server/services/assets.js';
import {
	createImportPreview,
	confirmImport,
	getImportType,
	parseImportFile
} from '#lib/server/services/imports.js';
import { createOpname, scanOpnameAsset, startOpname } from '#lib/server/services/opnames.js';
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

describe('opname scan', () => {
	test('menandai aset sesuai saat scan dan mendeteksi duplikat', async () => {
		const admin = await adminActor();

		const assetId = await createAsset(admin, {
			assetCode: 'QA-SCAN-1',
			name: 'QA Scan Asset',
			categoryId: fx.assetCategoryId,
			brandId: null,
			modelId: null,
			serialNumber: 'SN-QA-SCAN-1',
			purchaseDate: '2026-01-10',
			warrantyExpiration: null,
			acquisitionSource: null,
			acquisitionCost: null,
			locationId: fx.hoLocationId,
			conditionId: fx.conditionId,
			description: null
		});
		expect(assetId).toBeGreaterThan(0);

		const opnameId = await createOpname(admin, {
			locationId: fx.hoLocationId,
			itemType: 'asset',
			notes: null
		});
		await startOpname(admin, opnameId);

		const first = await scanOpnameAsset(admin, opnameId, 'QA-SCAN-1');
		expect(first.kind).toBe('matched');
		if (first.kind === 'matched') {
			expect(first.alreadyChecked).toBe(false);
			expect(first.line.isChecked).toBe(true);
			expect(first.line.result).toBe('matched');
			expect(first.summary.checked).toBe(1);
		}

		const second = await scanOpnameAsset(admin, opnameId, 'QA-SCAN-1');
		expect(second.kind).toBe('matched');
		if (second.kind === 'matched') {
			expect(second.alreadyChecked).toBe(true);
		}
	});

	test('mengembalikan outside untuk aset di lokasi lain', async () => {
		const admin = await adminActor();

		await createAsset(admin, {
			assetCode: 'QA-SCAN-OUT',
			name: 'QA Outside Asset',
			categoryId: fx.assetCategoryId,
			brandId: null,
			modelId: null,
			serialNumber: 'SN-QA-SCAN-OUT',
			purchaseDate: '2026-01-10',
			warrantyExpiration: null,
			acquisitionSource: null,
			acquisitionCost: null,
			locationId: fx.outletLocationId,
			conditionId: fx.conditionId,
			description: null
		});

		await createAsset(admin, {
			assetCode: 'QA-SCAN-HO',
			name: 'QA HO Asset',
			categoryId: fx.assetCategoryId,
			brandId: null,
			modelId: null,
			serialNumber: 'SN-QA-SCAN-HO',
			purchaseDate: '2026-01-10',
			warrantyExpiration: null,
			acquisitionSource: null,
			acquisitionCost: null,
			locationId: fx.hoLocationId,
			conditionId: fx.conditionId,
			description: null
		});

		const opnameId = await createOpname(admin, {
			locationId: fx.hoLocationId,
			itemType: 'asset',
			notes: null
		});
		await startOpname(admin, opnameId);

		const outcome = await scanOpnameAsset(admin, opnameId, 'QA-SCAN-OUT');
		expect(outcome.kind).toBe('outside');
	});

	test('mengembalikan unknown untuk kode yang tidak dikenal', async () => {
		const admin = await adminActor();

		await createAsset(admin, {
			assetCode: 'QA-SCAN-HO2',
			name: 'QA HO Asset 2',
			categoryId: fx.assetCategoryId,
			brandId: null,
			modelId: null,
			serialNumber: 'SN-QA-SCAN-HO2',
			purchaseDate: '2026-01-10',
			warrantyExpiration: null,
			acquisitionSource: null,
			acquisitionCost: null,
			locationId: fx.hoLocationId,
			conditionId: fx.conditionId,
			description: null
		});

		const opnameId = await createOpname(admin, {
			locationId: fx.hoLocationId,
			itemType: 'asset',
			notes: null
		});
		await startOpname(admin, opnameId);

		const outcome = await scanOpnameAsset(admin, opnameId, 'NOPE-999');
		expect(outcome.kind).toBe('unknown');
	});

	test('menolak opname non-aset', async () => {
		const admin = await adminActor();
		const opnameId = await createOpname(admin, {
			locationId: fx.hoLocationId,
			itemType: 'inventory',
			notes: null
		});
		await expect(scanOpnameAsset(admin, opnameId, 'QA-SCAN-1')).rejects.toThrow();
	});

	test('outlet tidak dapat scan sesi outlet lain', async () => {
		const admin = await adminActor();
		const outlet = await outletActor();

		await createAsset(admin, {
			assetCode: 'QA-SCAN-HO3',
			name: 'QA HO Asset 3',
			categoryId: fx.assetCategoryId,
			brandId: null,
			modelId: null,
			serialNumber: 'SN-QA-SCAN-HO3',
			purchaseDate: '2026-01-10',
			warrantyExpiration: null,
			acquisitionSource: null,
			acquisitionCost: null,
			locationId: fx.hoLocationId,
			conditionId: fx.conditionId,
			description: null
		});

		const opnameId = await createOpname(admin, {
			locationId: fx.hoLocationId,
			itemType: 'asset',
			notes: null
		});
		await startOpname(admin, opnameId);

		await expect(scanOpnameAsset(outlet, opnameId, 'QA-SCAN-HO3')).rejects.toThrow();
	});
});

describe('import auto-create master data', () => {
	test('membuat kategori, satuan, dan brand yang belum ada saat autoCreate aktif', async () => {
		const admin = await adminActor();
		const csv = [
			'item_code,name,category,unit,brand,description,is_active',
			'QA-AUTO-1,QA Auto Item,NetAutoCat,netunit,NetBrand,desc,TRUE'
		].join('\n');

		const definition = getImportType('inventory-item');
		const parsed = await parseImportFile(definition, 'auto.csv', Buffer.from(csv));
		const preview = await createImportPreview(
			admin,
			'inventory-item',
			parsed.fileName,
			parsed.rows,
			true
		);

		expect(preview.validCount).toBe(1);
		expect(preview.autoCreated.inventoryCategories).toContain('NetAutoCat');
		expect(preview.autoCreated.units).toContain('netunit');
		expect(preview.autoCreated.brands).toContain('NetBrand');

		const { batchId } = await confirmImport(admin, preview.token);
		expect(batchId).toBeGreaterThan(0);

		const item = await db
			.select({ id: inventoryItems.id })
			.from(inventoryItems)
			.where(eq(inventoryItems.itemCode, 'QA-AUTO-1'));
		expect(item).toHaveLength(1);

		const category = await db
			.select({ id: inventoryCategories.id })
			.from(inventoryCategories)
			.where(eq(inventoryCategories.name, 'NetAutoCat'));
		expect(category).toHaveLength(1);

		const unit = await db.select({ id: units.id }).from(units).where(eq(units.name, 'netunit'));
		expect(unit).toHaveLength(1);

		const brand = await db
			.select({ id: brands.id })
			.from(brands)
			.where(eq(brands.name, 'NetBrand'));
		expect(brand).toHaveLength(1);
	});

	test('tanpa autoCreate, baris dengan master data tidak dikenal tetap invalid', async () => {
		const admin = await adminActor();
		const csv = [
			'item_code,name,category,unit,brand,description,is_active',
			'QA-AUTO-2,QA Auto Item 2,UnknownCat,unknownunit,,desc,TRUE'
		].join('\n');

		const definition = getImportType('inventory-item');
		const parsed = await parseImportFile(definition, 'auto2.csv', Buffer.from(csv));
		const preview = await createImportPreview(
			admin,
			'inventory-item',
			parsed.fileName,
			parsed.rows,
			false
		);

		expect(preview.validCount).toBe(0);
		expect(preview.invalidCount).toBe(1);
	});

	test('membuat model aset yang belum ada saat autoCreate aktif', async () => {
		const admin = await adminActor();
		const csv = [
			'asset_code,name,category,outlet_code,location_code,condition,brand,model',
			'QA-AUTO-ASET-1,QA Auto Asset,Laptop,HO,HO-IT,Baik,Dell,ProBook 440 G9'
		].join('\n');

		const definition = getImportType('asset');
		const parsed = await parseImportFile(definition, 'auto-asset.csv', Buffer.from(csv));
		const preview = await createImportPreview(admin, 'asset', parsed.fileName, parsed.rows, true);

		expect(preview.validCount).toBe(1);
		expect(preview.autoCreated.brands).toContain('Dell');
		expect(preview.autoCreated.models).toContain('ProBook 440 G9');

		const { batchId } = await confirmImport(admin, preview.token);
		expect(batchId).toBeGreaterThan(0);

		const asset = await db
			.select({ id: assets.id, modelId: assets.modelId })
			.from(assets)
			.where(eq(assets.assetCode, 'QA-AUTO-ASET-1'));
		expect(asset).toHaveLength(1);

		const model = await db
			.select({ id: assetModels.id })
			.from(assetModels)
			.where(eq(assetModels.name, 'ProBook 440 G9'));
		expect(model).toHaveLength(1);
		expect(asset[0].modelId).toBe(model[0].id);
	});
});
