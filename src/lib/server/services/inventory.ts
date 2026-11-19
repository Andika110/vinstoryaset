import { and, asc, desc, eq, ilike, inArray, isNotNull, or, sql, type SQL } from 'drizzle-orm';
import { writeAudit } from '#lib/server/audit.js';
import { assertCan, scopeToUser, type Scope } from '#lib/server/auth/permissions.js';
import type { AuthUser } from '#lib/server/auth/session.js';
import { db } from '#lib/server/db/index.js';
import { isUniqueViolation, uniqueConstraintName } from '#lib/server/db/errors.js';
import {
	brands,
	inventoryCategories,
	inventoryItems,
	locations,
	outlets,
	stockBalances,
	stockDocuments,
	stockTransactions,
	units,
	users
} from '#lib/server/db/schema/index.js';
import { DomainError } from '#lib/server/errors.js';
import { MESSAGES } from '#lib/messages.js';

export type StockTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export type InventoryOption = {
	id: number;
	label: string;
	outletId?: number | null;
};

export type InventoryFormOptions = {
	categories: InventoryOption[];
	brands: InventoryOption[];
	units: InventoryOption[];
	locations: InventoryOption[];
};

export type InventoryListItem = {
	id: number;
	itemCode: string;
	name: string;
	categoryName: string;
	brandName: string | null;
	unitName: string;
	stock: number;
	minStockTotal: number;
	lowCount: number;
	outCount: number;
	isActive: boolean;
	statusLabel: string;
	statusTone: StockTone;
	canEdit: boolean;
};

export type InventoryListFilter = {
	search?: string;
	categoryId?: number | null;
	locationId?: number | null;
	stock?: string;
	page?: number;
	pageSize?: number;
};

export type InventoryListResult = {
	items: InventoryListItem[];
	page: number;
	pageSize: number;
	total: number;
	filters: {
		categories: InventoryOption[];
		locations: InventoryOption[];
	};
};

export type InventoryBalanceRow = {
	locationId: number;
	locationName: string;
	outletName: string;
	qty: number;
	minStock: number | null;
	statusLabel: string;
	statusTone: StockTone;
};

export type InventoryTransactionRow = {
	id: number;
	documentNumber: string;
	typeLabel: string;
	tone: StockTone;
	qtyLabel: string;
	locationName: string;
	performedByName: string;
	dateLabel: string;
	notes: string | null;
};

export type InventoryDetail = {
	id: number;
	itemCode: string;
	name: string;
	categoryId: number;
	brandId: number | null;
	unitId: number;
	categoryName: string;
	brandName: string | null;
	unitName: string;
	description: string | null;
	isActive: boolean;
	totalStock: number;
	statusLabel: string;
	statusTone: StockTone;
	lowCount: number;
	outCount: number;
	balances: InventoryBalanceRow[];
	transactions: InventoryTransactionRow[];
	canEdit: boolean;
};

export type InventoryEditResult = {
	item: InventoryDetail;
	options: InventoryFormOptions;
	minStocks: Record<string, number | null>;
	quantities: Record<string, number>;
};

export type InventoryInput = {
	itemCode: string;
	name: string;
	categoryId: number | null;
	brandId: number | null;
	unitId: number | null;
	description: string | null;
	isActive: boolean;
	minStocks: Record<string, number | null>;
};

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('id-ID', {
	dateStyle: 'medium',
	timeStyle: 'short',
	timeZone: 'Asia/Jakarta'
});

const TRANSACTION_LABEL: Record<string, { label: string; tone: StockTone }> = {
	opening_balance: { label: 'Saldo awal', tone: 'info' },
	stock_in: { label: 'Stok masuk', tone: 'success' },
	stock_out: { label: 'Stok keluar', tone: 'warning' },
	transfer_out: { label: 'Transfer keluar', tone: 'info' },
	transfer_in: { label: 'Transfer masuk', tone: 'info' },
	adjustment: { label: 'Penyesuaian', tone: 'neutral' }
};

function text(value: unknown): string {
	return String(value ?? '').trim();
}

function optionalText(value: unknown): string | null {
	const result = text(value);
	return result.length > 0 ? result : null;
}

function integer(value: unknown, label: string, required = false): number | null {
	const raw = text(value);
	if (!raw) {
		if (required) throw new DomainError('VALIDASI', `${label} wajib diisi.`);
		return null;
	}
	if (!/^\d+$/.test(raw)) throw new DomainError('VALIDASI', `${label} tidak valid.`);
	return Number(raw);
}

function formatDateTime(value: Date): string {
	return DATE_TIME_FORMAT.format(value);
}

function scopeCondition(scope: Scope): SQL | undefined {
	return scope.allOutlets ? undefined : eq(locations.outletId, scope.outletId!);
}

function stockStatus(qty: number, minStock: number | null): { label: string; tone: StockTone } {
	if (minStock === null) {
		return qty > 0
			? { label: 'Tersedia', tone: 'success' }
			: { label: 'Belum ada stok', tone: 'neutral' };
	}
	if (qty === 0) return { label: 'Habis', tone: 'danger' };
	if (qty <= minStock) return { label: 'Menipis', tone: 'warning' };
	return { label: 'Tersedia', tone: 'success' };
}

function itemOverallStatus(
	totalStock: number,
	balances: InventoryBalanceRow[]
): { label: string; tone: StockTone } {
	if (balances.length === 0) return { label: 'Belum ada stok', tone: 'neutral' };
	if (totalStock === 0) return { label: 'Habis', tone: 'danger' };
	const hasLow = balances.some(
		(row) => row.minStock !== null && row.qty > 0 && row.qty <= row.minStock
	);
	const hasOut = balances.some((row) => row.qty === 0);
	if (hasLow || hasOut) return { label: 'Menipis', tone: 'warning' };
	return { label: 'Tersedia', tone: 'success' };
}

function duplicateError(error: unknown): DomainError {
	if (uniqueConstraintName(error) === 'inventory_items_code_unique') {
		return new DomainError('DUPLIKAT', MESSAGES.duplicate('Item Code'));
	}
	return new DomainError('DUPLIKAT', MESSAGES.duplicate('Item Code'));
}

function buildStockAggregate(scope: Scope, locationId: number | null) {
	return db.$with('stock_agg').as(
		db
			.select({
				itemId: stockBalances.itemId,
				stock: sql<number>`coalesce(sum(${stockBalances.qty}), 0)::int`.as('stock'),
				minStockTotal: sql<number>`coalesce(sum(${stockBalances.minStock}), 0)::int`.as(
					'min_stock_total'
				),
				lowCount:
					sql<number>`count(*) filter (where ${stockBalances.minStock} is not null and ${stockBalances.qty} > 0 and ${stockBalances.qty} <= ${stockBalances.minStock})::int`.as(
						'low_count'
					),
				outCount: sql<number>`count(*) filter (where ${stockBalances.qty} = 0)::int`.as(
					'out_count'
				),
				balanceCount: sql<number>`count(*)::int`.as('balance_count')
			})
			.from(stockBalances)
			.innerJoin(locations, eq(stockBalances.locationId, locations.id))
			.where(
				and(
					scopeCondition(scope),
					locationId !== null ? eq(stockBalances.locationId, locationId) : undefined
				)
			)
			.groupBy(stockBalances.itemId)
	);
}

export async function getInventoryFormOptions(actor: AuthUser): Promise<InventoryFormOptions> {
	assertCan(actor, 'inventory:write');
	const scope = scopeToUser(actor);

	const [categoryRows, brandRows, unitRows, locationRows] = await Promise.all([
		db
			.select({ id: inventoryCategories.id, name: inventoryCategories.name })
			.from(inventoryCategories)
			.where(eq(inventoryCategories.isActive, true))
			.orderBy(asc(inventoryCategories.name)),
		db
			.select({ id: brands.id, name: brands.name })
			.from(brands)
			.where(eq(brands.isActive, true))
			.orderBy(asc(brands.name)),
		db
			.select({ id: units.id, name: units.name, abbreviation: units.abbreviation })
			.from(units)
			.where(eq(units.isActive, true))
			.orderBy(asc(units.name)),
		db
			.select({
				id: locations.id,
				name: locations.name,
				outletId: outlets.id,
				outletName: outlets.name
			})
			.from(locations)
			.innerJoin(outlets, eq(locations.outletId, outlets.id))
			.where(and(eq(locations.isActive, true), scopeCondition(scope)))
			.orderBy(asc(outlets.name), asc(locations.name))
	]);

	return {
		categories: categoryRows.map((row) => ({ id: row.id, label: row.name })),
		brands: brandRows.map((row) => ({ id: row.id, label: row.name })),
		units: unitRows.map((row) => ({ id: row.id, label: `${row.name} (${row.abbreviation})` })),
		locations: locationRows.map((row) => ({
			id: row.id,
			label: `${row.outletName} · ${row.name}`,
			outletId: row.outletId
		}))
	};
}

export async function listInventoryItems(
	actor: AuthUser,
	filter: InventoryListFilter = {}
): Promise<InventoryListResult> {
	const scope = scopeToUser(actor);
	const search = text(filter.search);
	const term = `%${search}%`;
	const pageSize = Math.min(100, Math.max(5, filter.pageSize ?? 10));
	const locationId = filter.locationId ?? null;
	const stockFilter = ['low', 'out', 'available'].includes(filter.stock ?? '')
		? filter.stock
		: undefined;

	const stockAgg = buildStockAggregate(scope, locationId);
	const where = and(
		search ? or(ilike(inventoryItems.itemCode, term), ilike(inventoryItems.name, term)) : undefined,
		filter.categoryId !== null && filter.categoryId !== undefined
			? eq(inventoryItems.categoryId, filter.categoryId)
			: undefined,
		locationId !== null ? isNotNull(stockAgg.itemId) : undefined,
		scope.allOutlets ? undefined : isNotNull(stockAgg.itemId),
		stockFilter === 'low' ? sql`${stockAgg.lowCount} > 0` : undefined,
		stockFilter === 'out' ? sql`${stockAgg.outCount} > 0` : undefined,
		stockFilter === 'available' ? sql`${stockAgg.stock} > 0` : undefined
	);

	const [{ total }] = await db
		.with(stockAgg)
		.select({ total: sql<number>`count(*)::int` })
		.from(inventoryItems)
		.leftJoin(stockAgg, eq(inventoryItems.id, stockAgg.itemId))
		.where(where);

	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const page = Math.min(Math.max(filter.page ?? 1, 1), totalPages);
	const offset = (page - 1) * pageSize;

	const rows = await db
		.with(stockAgg)
		.select({
			id: inventoryItems.id,
			itemCode: inventoryItems.itemCode,
			name: inventoryItems.name,
			categoryName: inventoryCategories.name,
			brandName: brands.name,
			unitName: units.abbreviation,
			isActive: inventoryItems.isActive,
			stock: sql<number>`coalesce(${stockAgg.stock}, 0)::int`,
			minStockTotal: sql<number>`coalesce(${stockAgg.minStockTotal}, 0)::int`,
			lowCount: sql<number>`coalesce(${stockAgg.lowCount}, 0)::int`,
			outCount: sql<number>`coalesce(${stockAgg.outCount}, 0)::int`,
			balanceCount: sql<number>`coalesce(${stockAgg.balanceCount}, 0)::int`
		})
		.from(inventoryItems)
		.innerJoin(inventoryCategories, eq(inventoryItems.categoryId, inventoryCategories.id))
		.innerJoin(units, eq(inventoryItems.unitId, units.id))
		.leftJoin(brands, eq(inventoryItems.brandId, brands.id))
		.leftJoin(stockAgg, eq(inventoryItems.id, stockAgg.itemId))
		.where(where)
		.orderBy(asc(inventoryItems.name))
		.limit(pageSize)
		.offset(offset);

	const [categoryRows, locationRows] = await Promise.all([
		db
			.select({ id: inventoryCategories.id, name: inventoryCategories.name })
			.from(inventoryCategories)
			.where(eq(inventoryCategories.isActive, true))
			.orderBy(asc(inventoryCategories.name)),
		db
			.select({
				id: locations.id,
				name: locations.name,
				outletId: outlets.id,
				outletName: outlets.name
			})
			.from(locations)
			.innerJoin(outlets, eq(locations.outletId, outlets.id))
			.where(and(eq(locations.isActive, true), scopeCondition(scope)))
			.orderBy(asc(outlets.name), asc(locations.name))
	]);

	return {
		items: rows.map((row) => {
			const status =
				row.stock === 0
					? row.balanceCount > 0
						? { label: 'Habis', tone: 'danger' as const }
						: { label: 'Belum ada stok', tone: 'neutral' as const }
					: row.lowCount > 0 || row.outCount > 0
						? { label: 'Menipis', tone: 'warning' as const }
						: { label: 'Tersedia', tone: 'success' as const };
			return {
				id: row.id,
				itemCode: row.itemCode,
				name: row.name,
				categoryName: row.categoryName,
				brandName: row.brandName,
				unitName: row.unitName,
				stock: row.stock,
				minStockTotal: row.minStockTotal,
				lowCount: row.lowCount,
				outCount: row.outCount,
				isActive: row.isActive,
				statusLabel: status.label,
				statusTone: status.tone,
				canEdit: actor.role !== 'outlet'
			};
		}),
		page,
		pageSize,
		total,
		filters: {
			categories: categoryRows.map((row) => ({ id: row.id, label: row.name })),
			locations: locationRows.map((row) => ({
				id: row.id,
				label: `${row.outletName} · ${row.name}`,
				outletId: row.outletId
			}))
		}
	};
}

async function loadBalances(actor: AuthUser, itemId: number): Promise<InventoryBalanceRow[]> {
	const scope = scopeToUser(actor);
	const rows = await db
		.select({
			locationId: locations.id,
			locationName: locations.name,
			outletName: outlets.name,
			qty: stockBalances.qty,
			minStock: stockBalances.minStock
		})
		.from(stockBalances)
		.innerJoin(locations, eq(stockBalances.locationId, locations.id))
		.innerJoin(outlets, eq(locations.outletId, outlets.id))
		.where(and(eq(stockBalances.itemId, itemId), scopeCondition(scope)))
		.orderBy(asc(outlets.name), asc(locations.name));

	return rows.map((row) => {
		const status = stockStatus(row.qty, row.minStock);
		return { ...row, statusLabel: status.label, statusTone: status.tone };
	});
}

export async function getInventoryDetail(actor: AuthUser, id: number): Promise<InventoryDetail> {
	const [item] = await db
		.select({
			id: inventoryItems.id,
			itemCode: inventoryItems.itemCode,
			name: inventoryItems.name,
			description: inventoryItems.description,
			isActive: inventoryItems.isActive,
			categoryId: inventoryItems.categoryId,
			brandId: inventoryItems.brandId,
			unitId: inventoryItems.unitId,
			categoryName: inventoryCategories.name,
			brandName: brands.name,
			unitName: units.abbreviation
		})
		.from(inventoryItems)
		.innerJoin(inventoryCategories, eq(inventoryItems.categoryId, inventoryCategories.id))
		.innerJoin(units, eq(inventoryItems.unitId, units.id))
		.leftJoin(brands, eq(inventoryItems.brandId, brands.id))
		.where(eq(inventoryItems.id, id))
		.limit(1);

	if (!item) throw new DomainError('TIDAK_DITEMUKAN', 'Item inventory tidak ditemukan.');

	const balances = await loadBalances(actor, id);
	if (actor.role === 'outlet' && balances.length === 0) {
		throw new DomainError('TIDAK_DITEMUKAN', 'Item inventory tidak ditemukan.');
	}

	const scope = scopeToUser(actor);
	const transactionRows = await db
		.select({
			id: stockTransactions.id,
			signedQty: stockTransactions.signedQty,
			transactionType: stockTransactions.transactionType,
			notes: stockTransactions.notes,
			createdAt: stockTransactions.createdAt,
			documentNumber: stockDocuments.documentNumber,
			locationName: locations.name,
			performedByName: users.fullName
		})
		.from(stockTransactions)
		.innerJoin(stockDocuments, eq(stockTransactions.documentId, stockDocuments.id))
		.innerJoin(locations, eq(stockTransactions.locationId, locations.id))
		.innerJoin(users, eq(stockDocuments.performedBy, users.id))
		.where(and(eq(stockTransactions.itemId, id), scopeCondition(scope)))
		.orderBy(desc(stockTransactions.createdAt), desc(stockTransactions.id));

	const totalStock = balances.reduce((sum, row) => sum + row.qty, 0);
	const overall = itemOverallStatus(totalStock, balances);

	return {
		id: item.id,
		itemCode: item.itemCode,
		name: item.name,
		categoryId: item.categoryId,
		brandId: item.brandId,
		unitId: item.unitId,
		categoryName: item.categoryName,
		brandName: item.brandName,
		unitName: item.unitName,
		description: item.description,
		isActive: item.isActive,
		totalStock,
		statusLabel: overall.label,
		statusTone: overall.tone,
		lowCount: balances.filter(
			(row) => row.minStock !== null && row.qty > 0 && row.qty <= row.minStock
		).length,
		outCount: balances.filter((row) => row.qty === 0).length,
		balances,
		transactions: transactionRows.map((row) => {
			const badge = TRANSACTION_LABEL[row.transactionType] ?? {
				label: row.transactionType,
				tone: 'neutral' as const
			};
			return {
				id: row.id,
				documentNumber: row.documentNumber,
				typeLabel: badge.label,
				tone: badge.tone,
				qtyLabel: `${row.signedQty > 0 ? '+' : ''}${row.signedQty}`,
				locationName: row.locationName,
				performedByName: row.performedByName,
				dateLabel: formatDateTime(row.createdAt),
				notes: row.notes
			};
		}),
		canEdit: actor.role !== 'outlet'
	};
}

export async function getInventoryForEdit(
	actor: AuthUser,
	id: number
): Promise<InventoryEditResult> {
	assertCan(actor, 'inventory:write');
	const item = await getInventoryDetail(actor, id);
	const options = await getInventoryFormOptions(actor);

	const minStocks: Record<string, number | null> = {};
	const quantities: Record<string, number> = {};
	for (const balance of item.balances) {
		minStocks[String(balance.locationId)] = balance.minStock;
		quantities[String(balance.locationId)] = balance.qty;
	}

	return { item, options, minStocks, quantities };
}

async function validateReferences(input: {
	categoryId: number;
	brandId: number | null;
	unitId: number;
	locationIds: number[];
}): Promise<void> {
	const [category] = await db
		.select({ id: inventoryCategories.id, isActive: inventoryCategories.isActive })
		.from(inventoryCategories)
		.where(eq(inventoryCategories.id, input.categoryId))
		.limit(1);
	if (!category || !category.isActive) {
		throw new DomainError('VALIDASI', 'Kategori inventory tidak ditemukan atau nonaktif.');
	}

	const [unit] = await db
		.select({ id: units.id, isActive: units.isActive })
		.from(units)
		.where(eq(units.id, input.unitId))
		.limit(1);
	if (!unit || !unit.isActive) {
		throw new DomainError('VALIDASI', 'Unit tidak ditemukan atau nonaktif.');
	}

	if (input.brandId !== null) {
		const [brand] = await db
			.select({ id: brands.id })
			.from(brands)
			.where(eq(brands.id, input.brandId))
			.limit(1);
		if (!brand) throw new DomainError('VALIDASI', 'Brand tidak ditemukan.');
	}

	if (input.locationIds.length > 0) {
		const uniqueIds = [...new Set(input.locationIds)];
		const rows = await db
			.select({ id: locations.id, isActive: locations.isActive })
			.from(locations)
			.where(inArray(locations.id, uniqueIds));
		if (rows.length !== uniqueIds.length || rows.some((row) => !row.isActive)) {
			throw new DomainError('VALIDASI', 'Lokasi minimum stok tidak valid atau nonaktif.');
		}
	}
}

function normalizeInput(input: InventoryInput) {
	const itemCode = text(input.itemCode);
	const name = text(input.name);
	const categoryId = input.categoryId;
	const unitId = input.unitId;

	if (!itemCode) throw new DomainError('VALIDASI', 'Item Code wajib diisi.');
	if (!name) throw new DomainError('VALIDASI', 'Nama item wajib diisi.');
	if (categoryId === null) throw new DomainError('VALIDASI', 'Kategori wajib dipilih.');
	if (unitId === null) throw new DomainError('VALIDASI', 'Unit wajib dipilih.');

	const minStocks = new Map<number, number | null>();
	for (const [key, value] of Object.entries(input.minStocks)) {
		const locationId = integer(key, 'Lokasi', true)!;
		const parsed = value === null || value === undefined ? null : Number(value);
		if (parsed !== null && (!Number.isInteger(parsed) || parsed < 0)) {
			throw new DomainError('VALIDASI', 'Minimum stok tidak valid.');
		}
		minStocks.set(locationId, parsed);
	}

	return {
		itemCode,
		name,
		categoryId,
		brandId: input.brandId,
		unitId,
		description: optionalText(input.description),
		isActive: input.isActive,
		minStocks
	};
}

async function applyMinStocks(
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
	itemId: number,
	minStocks: Map<number, number | null>
): Promise<Record<string, number | null>> {
	const existing = await tx
		.select({
			locationId: stockBalances.locationId,
			qty: stockBalances.qty,
			minStock: stockBalances.minStock
		})
		.from(stockBalances)
		.where(eq(stockBalances.itemId, itemId));
	const existingMap = new Map(existing.map((row) => [row.locationId, row]));
	const changes: Record<string, number | null> = {};

	for (const [locationId, minStock] of minStocks) {
		const current = existingMap.get(locationId);
		if (current?.minStock === minStock) continue;
		changes[String(locationId)] = minStock;

		if (minStock !== null) {
			await tx
				.insert(stockBalances)
				.values({ itemId, locationId, qty: 0, minStock })
				.onConflictDoUpdate({
					target: [stockBalances.itemId, stockBalances.locationId],
					set: { minStock, updatedAt: new Date() }
				});
		} else if (current) {
			if (current.qty === 0) {
				await tx
					.delete(stockBalances)
					.where(and(eq(stockBalances.itemId, itemId), eq(stockBalances.locationId, locationId)));
			} else {
				await tx
					.update(stockBalances)
					.set({ minStock: null, updatedAt: new Date() })
					.where(and(eq(stockBalances.itemId, itemId), eq(stockBalances.locationId, locationId)));
			}
		}
	}

	return changes;
}

export async function createInventoryItem(actor: AuthUser, input: InventoryInput): Promise<number> {
	assertCan(actor, 'inventory:write');
	const normalized = normalizeInput(input);
	await validateReferences({
		categoryId: normalized.categoryId!,
		brandId: normalized.brandId,
		unitId: normalized.unitId!,
		locationIds: [...normalized.minStocks.keys()]
	});

	try {
		return await db.transaction(async (tx) => {
			const [created] = await tx
				.insert(inventoryItems)
				.values({
					itemCode: normalized.itemCode,
					name: normalized.name,
					categoryId: normalized.categoryId!,
					brandId: normalized.brandId,
					unitId: normalized.unitId!,
					description: normalized.description,
					isActive: normalized.isActive
				})
				.returning({ id: inventoryItems.id });

			const minChanges = await applyMinStocks(tx, created.id, normalized.minStocks);

			await writeAudit(tx, actor, {
				module: 'inventory',
				action: 'inventory_item_created',
				recordId: String(created.id),
				newValue: {
					itemCode: normalized.itemCode,
					name: normalized.name,
					categoryId: normalized.categoryId,
					unitId: normalized.unitId,
					isActive: normalized.isActive
				}
			});

			if (Object.keys(minChanges).length > 0) {
				await writeAudit(tx, actor, {
					module: 'inventory',
					action: 'inventory_min_stock_updated',
					recordId: String(created.id),
					previousValue: {},
					newValue: minChanges
				});
			}

			return created.id;
		});
	} catch (error) {
		if (isUniqueViolation(error)) throw duplicateError(error);
		throw error;
	}
}

export async function updateInventoryItem(
	actor: AuthUser,
	id: number,
	input: InventoryInput
): Promise<void> {
	assertCan(actor, 'inventory:write');
	const normalized = normalizeInput(input);
	await validateReferences({
		categoryId: normalized.categoryId!,
		brandId: normalized.brandId,
		unitId: normalized.unitId!,
		locationIds: [...normalized.minStocks.keys()]
	});

	const [target] = await db
		.select({
			itemCode: inventoryItems.itemCode,
			name: inventoryItems.name,
			categoryId: inventoryItems.categoryId,
			brandId: inventoryItems.brandId,
			unitId: inventoryItems.unitId,
			description: inventoryItems.description,
			isActive: inventoryItems.isActive
		})
		.from(inventoryItems)
		.where(eq(inventoryItems.id, id))
		.limit(1);

	if (!target) throw new DomainError('TIDAK_DITEMUKAN', 'Item inventory tidak ditemukan.');

	try {
		await db.transaction(async (tx) => {
			await tx
				.update(inventoryItems)
				.set({
					itemCode: normalized.itemCode,
					name: normalized.name,
					categoryId: normalized.categoryId!,
					brandId: normalized.brandId,
					unitId: normalized.unitId!,
					description: normalized.description,
					isActive: normalized.isActive,
					updatedAt: new Date()
				})
				.where(eq(inventoryItems.id, id));

			const minChanges = await applyMinStocks(tx, id, normalized.minStocks);

			await writeAudit(tx, actor, {
				module: 'inventory',
				action: 'inventory_item_updated',
				recordId: String(id),
				previousValue: target,
				newValue: {
					itemCode: normalized.itemCode,
					name: normalized.name,
					categoryId: normalized.categoryId,
					unitId: normalized.unitId,
					isActive: normalized.isActive
				}
			});

			if (Object.keys(minChanges).length > 0) {
				await writeAudit(tx, actor, {
					module: 'inventory',
					action: 'inventory_min_stock_updated',
					recordId: String(id),
					newValue: minChanges
				});
			}
		});
	} catch (error) {
		if (isUniqueViolation(error)) throw duplicateError(error);
		throw error;
	}
}
