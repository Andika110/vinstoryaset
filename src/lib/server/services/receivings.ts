import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm';
import { writeAudit } from '#lib/server/audit.js';
import { assertCan } from '#lib/server/auth/permissions.js';
import type { AuthUser } from '#lib/server/auth/session.js';
import { db } from '#lib/server/db/index.js';
import { uniqueConstraintName } from '#lib/server/db/errors.js';
import {
	assetCategories,
	assetConditions,
	assetModels,
	assets,
	brands,
	inventoryItems,
	locations,
	outlets,
	receivingLines,
	receivings,
	receivingTypeEnum,
	stockBalances,
	stockDocuments,
	stockTransactions,
	suppliers,
	units,
	users
} from '#lib/server/db/schema/index.js';
import { ASSET_STATUS_LABEL } from '#lib/server/domain/transitions.js';
import { DomainError } from '#lib/server/errors.js';
import { nextNumber } from '#lib/server/document-number.js';

export type ReceivingType = (typeof receivingTypeEnum.enumValues)[number];
export type ReceivingLineType = 'asset' | 'inventory';
export type ReceivingTone = 'success' | 'info' | 'warning' | 'neutral';

export const RECEIVING_TYPE_LABEL: Record<ReceivingType, string> = {
	purchase: 'Purchase',
	opening_balance: 'Saldo Awal',
	transfer_in: 'Transfer Masuk',
	other: 'Lainnya'
};

const RECEIVING_TYPE_TONE: Record<ReceivingType, ReceivingTone> = {
	purchase: 'success',
	opening_balance: 'info',
	transfer_in: 'warning',
	other: 'neutral'
};

export type ReceivingOption = { id: number; label: string };
export type ReceivingFormOptions = {
	suppliers: ReceivingOption[];
	locations: ReceivingOption[];
	inventoryItems: (ReceivingOption & { unitName: string })[];
	categories: ReceivingOption[];
	brands: ReceivingOption[];
	models: (ReceivingOption & { categoryId: number; brandId: number | null })[];
	conditions: ReceivingOption[];
};

export type ReceivingInput = {
	receivingType: ReceivingType;
	receiptDate: string;
	supplierId: number | null;
	locationId: number | null;
	referenceNumber: string | null;
	notes: string | null;
	lineType: ReceivingLineType;
	inventoryItemId: number | null;
	quantity: number;
	unitCost: string | null;
	assetName: string | null;
	categoryId: number | null;
	brandId: number | null;
	modelId: number | null;
	conditionId: number | null;
	serialNumber: string | null;
	warrantyExpiration: string | null;
	assetDescription: string | null;
	submissionId: string;
};

export type ReceivingListItem = {
	id: number;
	receiptNumber: string;
	receiptDateLabel: string;
	typeLabel: string;
	typeTone: ReceivingTone;
	supplierName: string | null;
	locationName: string;
	outletName: string;
	referenceNumber: string | null;
	lineCount: number;
	totalQuantity: number;
};

export type ReceivingListFilter = {
	search?: string;
	type?: string;
	from?: string;
	to?: string;
	page?: number;
	pageSize?: number;
};

export type ReceivingListResult = {
	items: ReceivingListItem[];
	page: number;
	pageSize: number;
	total: number;
	filters: { suppliers: ReceivingOption[]; locations: ReceivingOption[] };
};

export type ReceivingLineRow = {
	id: number;
	lineType: ReceivingLineType;
	quantity: number;
	unitCost: string | null;
	notes: string | null;
	assetId: number | null;
	assetCode: string | null;
	assetName: string | null;
	assetStatusLabel: string | null;
	inventoryItemId: number | null;
	itemCode: string | null;
	itemName: string | null;
	unitName: string | null;
};

export type ReceivingDetail = {
	id: number;
	receiptNumber: string;
	receiptDateLabel: string;
	typeLabel: string;
	typeTone: ReceivingTone;
	receivingType: ReceivingType;
	supplierName: string | null;
	locationName: string;
	outletName: string;
	referenceNumber: string | null;
	notes: string | null;
	receivedByName: string;
	createdAtLabel: string;
	lines: ReceivingLineRow[];
	summary: {
		lineCount: number;
		assetUnits: number;
		inventoryQty: number;
		totalUnits: number;
	};
};

const DATE_FORMAT = new Intl.DateTimeFormat('id-ID', {
	dateStyle: 'medium',
	timeZone: 'Asia/Jakarta'
});
const DATE_TIME_FORMAT = new Intl.DateTimeFormat('id-ID', {
	dateStyle: 'medium',
	timeStyle: 'short',
	timeZone: 'Asia/Jakarta'
});

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

function normalizeCost(value: unknown): string | null {
	const raw = text(value).replace(',', '.');
	if (!raw) return null;
	const parsed = Number(raw);
	if (!Number.isFinite(parsed) || parsed < 0) {
		throw new DomainError('VALIDASI', 'Biaya satuan tidak valid.');
	}
	return parsed.toFixed(2);
}

function isReceivingType(value: string): value is ReceivingType {
	return receivingTypeEnum.enumValues.includes(value as ReceivingType);
}

function isLineType(value: string): value is ReceivingLineType {
	return value === 'asset' || value === 'inventory';
}

function assertDate(value: string, label: string): string {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
		throw new DomainError('VALIDASI', `${label} tidak valid.`);
	}
	return value;
}

function formatDate(value: string): string {
	const date = new Date(`${value}T00:00:00+07:00`);
	return Number.isNaN(date.getTime()) ? value : DATE_FORMAT.format(date);
}

function formatDateTime(value: Date): string {
	return DATE_TIME_FORMAT.format(value);
}

function todayJakarta(): string {
	return new Intl.DateTimeFormat('en-CA', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		timeZone: 'Asia/Jakarta'
	}).format(new Date());
}

export function receivingDefaultDate(): string {
	return todayJakarta();
}

export async function getReceivingFormOptions(actor: AuthUser): Promise<ReceivingFormOptions> {
	assertCan(actor, 'stock:in');

	const [supplierRows, locationRows, itemRows, categoryRows, brandRows, modelRows, conditionRows] =
		await Promise.all([
			db
				.select({ id: suppliers.id, name: suppliers.name })
				.from(suppliers)
				.where(eq(suppliers.isActive, true))
				.orderBy(asc(suppliers.name)),
			db
				.select({ id: locations.id, name: locations.name, outletName: outlets.name })
				.from(locations)
				.innerJoin(outlets, eq(locations.outletId, outlets.id))
				.where(eq(locations.isActive, true))
				.orderBy(asc(outlets.name), asc(locations.name)),
			db
				.select({
					id: inventoryItems.id,
					itemCode: inventoryItems.itemCode,
					name: inventoryItems.name,
					unitName: units.abbreviation
				})
				.from(inventoryItems)
				.innerJoin(units, eq(inventoryItems.unitId, units.id))
				.where(eq(inventoryItems.isActive, true))
				.orderBy(asc(inventoryItems.name)),
			db
				.select({ id: assetCategories.id, name: assetCategories.name })
				.from(assetCategories)
				.where(eq(assetCategories.isActive, true))
				.orderBy(asc(assetCategories.name)),
			db
				.select({ id: brands.id, name: brands.name })
				.from(brands)
				.where(eq(brands.isActive, true))
				.orderBy(asc(brands.name)),
			db
				.select({
					id: assetModels.id,
					name: assetModels.name,
					categoryId: assetModels.categoryId,
					brandId: assetModels.brandId
				})
				.from(assetModels)
				.where(eq(assetModels.isActive, true))
				.orderBy(asc(assetModels.name)),
			db
				.select({ id: assetConditions.id, name: assetConditions.name })
				.from(assetConditions)
				.where(eq(assetConditions.isActive, true))
				.orderBy(asc(assetConditions.name))
		]);

	return {
		suppliers: supplierRows.map((row) => ({ id: row.id, label: row.name })),
		locations: locationRows.map((row) => ({
			id: row.id,
			label: `${row.outletName} · ${row.name}`
		})),
		inventoryItems: itemRows.map((row) => ({
			id: row.id,
			label: `${row.itemCode} · ${row.name}`,
			unitName: row.unitName
		})),
		categories: categoryRows.map((row) => ({ id: row.id, label: row.name })),
		brands: brandRows.map((row) => ({ id: row.id, label: row.name })),
		models: modelRows.map((row) => ({
			id: row.id,
			label: row.name,
			categoryId: row.categoryId,
			brandId: row.brandId
		})),
		conditions: conditionRows.map((row) => ({ id: row.id, label: row.name }))
	};
}

async function findExistingReceiving(submissionId: string): Promise<number | null> {
	const [existing] = await db
		.select({ id: receivings.id })
		.from(receivings)
		.where(eq(receivings.submissionId, submissionId))
		.limit(1);
	return existing?.id ?? null;
}

export async function createReceiving(actor: AuthUser, input: ReceivingInput): Promise<number> {
	assertCan(actor, 'stock:in');

	const receivingType = text(input.receivingType);
	const receiptDate = assertDate(text(input.receiptDate), 'Tanggal penerimaan');
	const lineType = text(input.lineType);
	const quantity = integer(input.quantity, 'Jumlah', true)!;
	const submissionId = text(input.submissionId);
	const locationId = integer(input.locationId, 'Lokasi', true)!;

	if (!isReceivingType(receivingType)) {
		throw new DomainError('VALIDASI', 'Jenis penerimaan tidak valid.');
	}
	if (!isLineType(lineType)) {
		throw new DomainError('VALIDASI', 'Jenis item tidak valid.');
	}
	if (quantity <= 0) {
		throw new DomainError('VALIDASI', 'Jumlah harus lebih dari 0.');
	}
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(submissionId)) {
		throw new DomainError('VALIDASI', 'Token idempotensi tidak valid.');
	}

	const existing = await findExistingReceiving(submissionId);
	if (existing !== null) return existing;

	const supplierId = integer(input.supplierId, 'Supplier');
	const unitCost = normalizeCost(input.unitCost);

	const [location] = await db
		.select({ id: locations.id, name: locations.name, isActive: locations.isActive })
		.from(locations)
		.where(eq(locations.id, locationId))
		.limit(1);
	if (!location || !location.isActive) {
		throw new DomainError('VALIDASI', 'Lokasi tidak ditemukan atau nonaktif.');
	}

	if (supplierId !== null) {
		const [supplier] = await db
			.select({ id: suppliers.id, isActive: suppliers.isActive })
			.from(suppliers)
			.where(eq(suppliers.id, supplierId))
			.limit(1);
		if (!supplier || !supplier.isActive) {
			throw new DomainError('VALIDASI', 'Supplier tidak ditemukan atau nonaktif.');
		}
	}

	let inventoryItemId: number | null = null;
	let assetData: {
		name: string;
		categoryId: number;
		brandId: number | null;
		modelId: number | null;
		conditionId: number;
		serialNumber: string | null;
		warrantyExpiration: string | null;
		description: string | null;
	} | null = null;

	if (lineType === 'inventory') {
		inventoryItemId = integer(input.inventoryItemId, 'Item inventory', true);
		const [item] = await db
			.select({ id: inventoryItems.id, isActive: inventoryItems.isActive })
			.from(inventoryItems)
			.where(eq(inventoryItems.id, inventoryItemId!))
			.limit(1);
		if (!item || !item.isActive) {
			throw new DomainError('VALIDASI', 'Item inventory tidak ditemukan atau nonaktif.');
		}
	} else {
		const name = text(input.assetName);
		const categoryId = integer(input.categoryId, 'Kategori aset', true)!;
		const conditionId = integer(input.conditionId, 'Kondisi aset', true)!;
		const brandId = integer(input.brandId, 'Brand');
		const modelId = integer(input.modelId, 'Model');
		const serialNumber = optionalText(input.serialNumber);
		const warrantyExpiration = optionalText(input.warrantyExpiration)
			? assertDate(optionalText(input.warrantyExpiration)!, 'Tanggal garansi')
			: null;

		if (!name) throw new DomainError('VALIDASI', 'Nama aset wajib diisi.');
		if (quantity > 1 && serialNumber) {
			throw new DomainError('VALIDASI', 'Serial number hanya dapat diisi jika jumlah aset 1 unit.');
		}

		const [category] = await db
			.select({ id: assetCategories.id, isActive: assetCategories.isActive })
			.from(assetCategories)
			.where(eq(assetCategories.id, categoryId))
			.limit(1);
		if (!category || !category.isActive) {
			throw new DomainError('VALIDASI', 'Kategori aset tidak ditemukan atau nonaktif.');
		}
		const [condition] = await db
			.select({ id: assetConditions.id, isActive: assetConditions.isActive })
			.from(assetConditions)
			.where(eq(assetConditions.id, conditionId))
			.limit(1);
		if (!condition || !condition.isActive) {
			throw new DomainError('VALIDASI', 'Kondisi aset tidak ditemukan atau nonaktif.');
		}
		if (brandId !== null) {
			const [brand] = await db
				.select({ id: brands.id })
				.from(brands)
				.where(eq(brands.id, brandId))
				.limit(1);
			if (!brand) throw new DomainError('VALIDASI', 'Brand tidak ditemukan.');
		}
		if (modelId !== null) {
			const [model] = await db
				.select({
					id: assetModels.id,
					categoryId: assetModels.categoryId,
					brandId: assetModels.brandId,
					isActive: assetModels.isActive
				})
				.from(assetModels)
				.where(eq(assetModels.id, modelId))
				.limit(1);
			if (!model || !model.isActive) {
				throw new DomainError('VALIDASI', 'Model tidak ditemukan atau nonaktif.');
			}
			if (model.categoryId !== categoryId) {
				throw new DomainError('VALIDASI', 'Model tidak sesuai dengan kategori aset.');
			}
			if (brandId !== null && model.brandId !== brandId) {
				throw new DomainError('VALIDASI', 'Model tidak sesuai dengan brand yang dipilih.');
			}
		}

		assetData = {
			name,
			categoryId,
			brandId,
			modelId,
			conditionId,
			serialNumber,
			warrantyExpiration,
			description: optionalText(input.assetDescription)
		};
	}

	try {
		return await db.transaction(async (tx) => {
			const receiptNumber = await nextNumber(tx, 'RCV');
			const year = new Date().getFullYear();
			const [receipt] = await tx
				.insert(receivings)
				.values({
					receiptNumber,
					receiptDate,
					receivingType,
					supplierId,
					locationId,
					referenceNumber: optionalText(input.referenceNumber),
					notes: optionalText(input.notes),
					receivedBy: actor.id,
					submissionId
				})
				.returning({ id: receivings.id });

			if (lineType === 'inventory') {
				await tx.insert(receivingLines).values({
					receivingId: receipt.id,
					lineType: 'inventory',
					inventoryItemId,
					quantity,
					unitCost,
					notes: optionalText(input.notes)
				});

				await tx
					.insert(stockBalances)
					.values({ itemId: inventoryItemId!, locationId, qty: quantity, minStock: null })
					.onConflictDoUpdate({
						target: [stockBalances.itemId, stockBalances.locationId],
						set: {
							qty: sql`${stockBalances.qty} + ${quantity}`,
							updatedAt: new Date()
						}
					});

				const [document] = await tx
					.insert(stockDocuments)
					.values({
						documentNumber: `TMP-${randomUUID()}`,
						documentType: 'stock_in',
						destinationLocationId: locationId,
						reason: `Receiving ${receiptNumber}`,
						referenceType: 'receiving',
						referenceId: receipt.id,
						notes: optionalText(input.notes),
						performedBy: actor.id,
						submissionId: randomUUID()
					})
					.returning({ id: stockDocuments.id });

				await tx
					.update(stockDocuments)
					.set({ documentNumber: `STI-${year}-${String(document.id).padStart(4, '0')}` })
					.where(eq(stockDocuments.id, document.id));

				await tx.insert(stockTransactions).values({
					documentId: document.id,
					itemId: inventoryItemId!,
					locationId,
					transactionType: 'stock_in',
					signedQty: quantity,
					notes: optionalText(input.notes)
				});

				await writeAudit(tx, actor, {
					module: 'receiving',
					action: 'receiving_created',
					recordId: String(receipt.id),
					newValue: {
						receiptNumber,
						lineType,
						inventoryItemId,
						quantity,
						locationId,
						receivingType
					}
				});
				await writeAudit(tx, actor, {
					module: 'inventory',
					action: 'inventory_stock_in',
					recordId: String(inventoryItemId),
					newValue: { quantity, locationId, receiptNumber }
				});
			} else {
				for (let index = 0; index < quantity; index += 1) {
					const [asset] = await tx
						.insert(assets)
						.values({
							assetCode: `TMP-${randomUUID()}`,
							name: assetData!.name,
							categoryId: assetData!.categoryId,
							brandId: assetData!.brandId,
							modelId: assetData!.modelId,
							serialNumber: quantity === 1 ? assetData!.serialNumber : null,
							purchaseDate: receiptDate,
							warrantyExpiration: assetData!.warrantyExpiration,
							acquisitionSource: RECEIVING_TYPE_LABEL[receivingType],
							acquisitionCost: unitCost,
							locationId,
							conditionId: assetData!.conditionId,
							description: assetData!.description,
							status: 'available',
							createdBy: actor.id,
							updatedBy: actor.id
						})
						.returning({ id: assets.id });

					const assetCode = `AST-${year}-${String(asset.id).padStart(4, '0')}`;
					await tx.update(assets).set({ assetCode }).where(eq(assets.id, asset.id));

					await tx.insert(receivingLines).values({
						receivingId: receipt.id,
						lineType: 'asset',
						assetId: asset.id,
						quantity: 1,
						unitCost,
						notes: optionalText(input.notes)
					});

					await writeAudit(tx, actor, {
						module: 'asset',
						action: 'asset_created',
						recordId: String(asset.id),
						newValue: {
							assetCode,
							name: assetData!.name,
							categoryId: assetData!.categoryId,
							locationId,
							conditionId: assetData!.conditionId,
							status: 'available',
							source: `receiving:${receiptNumber}`
						}
					});
				}

				await writeAudit(tx, actor, {
					module: 'receiving',
					action: 'receiving_created',
					recordId: String(receipt.id),
					newValue: {
						receiptNumber,
						lineType,
						assetName: assetData!.name,
						quantity,
						locationId,
						receivingType
					}
				});
			}

			return receipt.id;
		});
	} catch (error) {
		if (uniqueConstraintName(error) === 'receivings_submission_unique') {
			const duplicate = await findExistingReceiving(submissionId);
			if (duplicate !== null) return duplicate;
		}
		throw error;
	}
}

export async function listReceivings(
	actor: AuthUser,
	filter: ReceivingListFilter = {}
): Promise<ReceivingListResult> {
	assertCan(actor, 'stock:in');
	const search = text(filter.search);
	const term = `%${search}%`;
	const pageSize = Math.min(100, Math.max(5, filter.pageSize ?? 10));
	const type = filter.type && isReceivingType(filter.type) ? filter.type : undefined;
	const fromDate = filter.from && /^\d{4}-\d{2}-\d{2}$/.test(filter.from) ? filter.from : null;
	const toDate = filter.to && /^\d{4}-\d{2}-\d{2}$/.test(filter.to) ? filter.to : null;

	const where = and(
		type ? eq(receivings.receivingType, type) : undefined,
		fromDate ? gte(receivings.receiptDate, fromDate) : undefined,
		toDate ? lte(receivings.receiptDate, toDate) : undefined,
		search
			? or(
					ilike(receivings.receiptNumber, term),
					ilike(suppliers.name, term),
					ilike(receivings.referenceNumber, term)
				)
			: undefined
	);

	const [{ total }] = await db
		.select({ total: sql<number>`count(distinct ${receivings.id})::int` })
		.from(receivings)
		.leftJoin(suppliers, eq(receivings.supplierId, suppliers.id))
		.leftJoin(receivingLines, eq(receivingLines.receivingId, receivings.id))
		.where(where);

	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const page = Math.min(Math.max(filter.page ?? 1, 1), totalPages);
	const offset = (page - 1) * pageSize;

	const rows = await db
		.select({
			id: receivings.id,
			receiptNumber: receivings.receiptNumber,
			receiptDate: receivings.receiptDate,
			receivingType: receivings.receivingType,
			supplierName: suppliers.name,
			referenceNumber: receivings.referenceNumber,
			locationName: locations.name,
			outletName: outlets.name,
			lineCount: sql<number>`count(${receivingLines.id})::int`,
			totalQuantity: sql<number>`coalesce(sum(${receivingLines.quantity}), 0)::int`
		})
		.from(receivings)
		.innerJoin(locations, eq(receivings.locationId, locations.id))
		.innerJoin(outlets, eq(locations.outletId, outlets.id))
		.leftJoin(suppliers, eq(receivings.supplierId, suppliers.id))
		.leftJoin(receivingLines, eq(receivingLines.receivingId, receivings.id))
		.where(where)
		.groupBy(
			receivings.id,
			receivings.receiptNumber,
			receivings.receiptDate,
			receivings.receivingType,
			receivings.referenceNumber,
			suppliers.name,
			locations.name,
			outlets.name
		)
		.orderBy(desc(receivings.receiptDate), desc(receivings.id))
		.limit(pageSize)
		.offset(offset);

	const [supplierRows, locationRows] = await Promise.all([
		db
			.select({ id: suppliers.id, name: suppliers.name })
			.from(suppliers)
			.where(eq(suppliers.isActive, true))
			.orderBy(asc(suppliers.name)),
		db
			.select({ id: locations.id, name: locations.name, outletName: outlets.name })
			.from(locations)
			.innerJoin(outlets, eq(locations.outletId, outlets.id))
			.where(eq(locations.isActive, true))
			.orderBy(asc(outlets.name), asc(locations.name))
	]);

	return {
		items: rows.map((row) => ({
			id: row.id,
			receiptNumber: row.receiptNumber,
			receiptDateLabel: formatDate(row.receiptDate),
			typeLabel: RECEIVING_TYPE_LABEL[row.receivingType],
			typeTone: RECEIVING_TYPE_TONE[row.receivingType],
			supplierName: row.supplierName,
			locationName: row.locationName,
			outletName: row.outletName,
			referenceNumber: row.referenceNumber,
			lineCount: row.lineCount,
			totalQuantity: row.totalQuantity
		})),
		page,
		pageSize,
		total,
		filters: {
			suppliers: supplierRows.map((row) => ({ id: row.id, label: row.name })),
			locations: locationRows.map((row) => ({
				id: row.id,
				label: `${row.outletName} · ${row.name}`
			}))
		}
	};
}

export async function getReceivingDetail(actor: AuthUser, id: number): Promise<ReceivingDetail> {
	assertCan(actor, 'stock:in');
	const [header] = await db
		.select({
			id: receivings.id,
			receiptNumber: receivings.receiptNumber,
			receiptDate: receivings.receiptDate,
			receivingType: receivings.receivingType,
			supplierName: suppliers.name,
			referenceNumber: receivings.referenceNumber,
			notes: receivings.notes,
			createdAt: receivings.createdAt,
			locationName: locations.name,
			outletName: outlets.name,
			receivedByName: users.fullName
		})
		.from(receivings)
		.innerJoin(locations, eq(receivings.locationId, locations.id))
		.innerJoin(outlets, eq(locations.outletId, outlets.id))
		.innerJoin(users, eq(receivings.receivedBy, users.id))
		.leftJoin(suppliers, eq(receivings.supplierId, suppliers.id))
		.where(eq(receivings.id, id))
		.limit(1);

	if (!header) throw new DomainError('TIDAK_DITEMUKAN', 'Penerimaan tidak ditemukan.');

	const lineRows = await db
		.select({
			id: receivingLines.id,
			lineType: receivingLines.lineType,
			quantity: receivingLines.quantity,
			unitCost: receivingLines.unitCost,
			notes: receivingLines.notes,
			assetId: receivingLines.assetId,
			assetCode: assets.assetCode,
			assetName: assets.name,
			assetStatus: assets.status,
			inventoryItemId: receivingLines.inventoryItemId,
			itemCode: inventoryItems.itemCode,
			itemName: inventoryItems.name,
			unitName: units.abbreviation
		})
		.from(receivingLines)
		.leftJoin(assets, eq(receivingLines.assetId, assets.id))
		.leftJoin(inventoryItems, eq(receivingLines.inventoryItemId, inventoryItems.id))
		.leftJoin(units, eq(inventoryItems.unitId, units.id))
		.where(eq(receivingLines.receivingId, id))
		.orderBy(asc(receivingLines.id));

	const lines: ReceivingLineRow[] = lineRows.map((row) => ({
		id: row.id,
		lineType: row.lineType,
		quantity: row.quantity,
		unitCost: row.unitCost,
		notes: row.notes,
		assetId: row.assetId,
		assetCode: row.assetCode,
		assetName: row.assetName,
		assetStatusLabel: row.assetStatus ? ASSET_STATUS_LABEL[row.assetStatus] : null,
		inventoryItemId: row.inventoryItemId,
		itemCode: row.itemCode,
		itemName: row.itemName,
		unitName: row.unitName
	}));

	const assetUnits = lines
		.filter((line) => line.lineType === 'asset')
		.reduce((sum, line) => sum + line.quantity, 0);
	const inventoryQty = lines
		.filter((line) => line.lineType === 'inventory')
		.reduce((sum, line) => sum + line.quantity, 0);

	return {
		id: header.id,
		receiptNumber: header.receiptNumber,
		receiptDateLabel: formatDate(header.receiptDate),
		typeLabel: RECEIVING_TYPE_LABEL[header.receivingType],
		typeTone: RECEIVING_TYPE_TONE[header.receivingType],
		receivingType: header.receivingType,
		supplierName: header.supplierName,
		locationName: header.locationName,
		outletName: header.outletName,
		referenceNumber: header.referenceNumber,
		notes: header.notes,
		receivedByName: header.receivedByName,
		createdAtLabel: formatDateTime(header.createdAt),
		lines,
		summary: {
			lineCount: lines.length,
			assetUnits,
			inventoryQty,
			totalUnits: assetUnits + inventoryQty
		}
	};
}
