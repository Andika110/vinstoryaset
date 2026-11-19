import { and, asc, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { writeAudit, withAudit } from '#lib/server/audit.js';
import { assertCan } from '#lib/server/auth/permissions.js';
import type { AuthUser } from '#lib/server/auth/session.js';
import { db } from '#lib/server/db/index.js';
import { uniqueConstraintName } from '#lib/server/db/errors.js';
import {
	inventoryItems,
	locations,
	outlets,
	receivings,
	stockBalances,
	stockDocuments,
	stockDocumentTypeEnum,
	stockTransactions,
	units,
	users
} from '#lib/server/db/schema/index.js';
import { DomainError } from '#lib/server/errors.js';
import { MESSAGES } from '#lib/messages.js';
import { nextNumber, type DocumentKind } from '#lib/server/document-number.js';
import { requireSubmissionId } from '#lib/server/idempotency.js';

export type StockDocumentType = 'stock_out' | 'transfer' | 'adjustment';
export type StockTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

export const STOCK_DOCUMENT_LABEL: Record<string, string> = {
	stock_in: 'Stock In',
	stock_out: 'Stock Out',
	transfer: 'Transfer',
	adjustment: 'Penyesuaian',
	opening_balance: 'Saldo Awal'
};

const STOCK_DOCUMENT_TONE: Record<string, StockTone> = {
	stock_in: 'success',
	stock_out: 'warning',
	transfer: 'info',
	adjustment: 'neutral',
	opening_balance: 'info'
};

const TRANSACTION_LABEL: Record<string, string> = {
	opening_balance: 'Saldo awal',
	stock_in: 'Stok masuk',
	stock_out: 'Stok keluar',
	transfer_out: 'Transfer keluar',
	transfer_in: 'Transfer masuk',
	adjustment: 'Penyesuaian'
};

export type StockOption = { id: number; label: string; unitName?: string; code?: string };
export type StockBalanceOption = { itemId: number; locationId: number; qty: number };

export type StockFormOptions = {
	items: StockOption[];
	locations: StockOption[];
	balances: StockBalanceOption[];
};

export type StockInput = {
	type: StockDocumentType;
	itemId: number | null;
	locationId: number | null;
	destinationLocationId: number | null;
	quantity: number;
	direction: 'in' | 'out';
	reason: string | null;
	notes: string | null;
	submissionId: string;
};

export type StockListFilter = {
	search?: string;
	type?: string;
	locationId?: number | null;
	from?: string;
	to?: string;
	page?: number;
	pageSize?: number;
};

export type StockListItem = {
	id: number;
	documentNumber: string;
	dateLabel: string;
	typeLabel: string;
	typeTone: StockTone;
	itemSummary: string;
	lineCount: number;
	locationLabel: string;
	performedByName: string;
};

export type StockListResult = {
	items: StockListItem[];
	page: number;
	pageSize: number;
	total: number;
	filters: { locations: StockOption[] };
};

export type StockLine = {
	id: number;
	transactionType: string;
	typeLabel: string;
	signedQty: number;
	qtyLabel: string;
	itemId: number;
	itemCode: string;
	itemName: string;
	unitName: string;
	locationName: string;
	notes: string | null;
};

export type StockDetail = {
	id: number;
	documentNumber: string;
	dateLabel: string;
	createdAtLabel: string;
	typeLabel: string;
	typeTone: StockTone;
	documentType: string;
	reason: string | null;
	notes: string | null;
	performedByName: string;
	sourceLocationName: string | null;
	destinationLocationName: string | null;
	referenceType: string | null;
	referenceLabel: string | null;
	referenceHref: string | null;
	lines: StockLine[];
	totalQty: number;
};

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('id-ID', {
	dateStyle: 'medium',
	timeStyle: 'short',
	timeZone: 'Asia/Jakarta'
});
const DATE_FORMAT = new Intl.DateTimeFormat('id-ID', {
	dateStyle: 'medium',
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

function formatDateTime(value: Date): string {
	return DATE_TIME_FORMAT.format(value);
}

function formatDate(value: Date): string {
	return DATE_FORMAT.format(value);
}

function prefixFor(type: StockDocumentType): DocumentKind {
	if (type === 'stock_out') return 'SOT';
	if (type === 'transfer') return 'TRF';
	return 'ADJ';
}

export async function getStockFormOptions(actor: AuthUser): Promise<StockFormOptions> {
	assertCan(actor, 'stock:out');

	const [itemRows, locationRows, balanceRows] = await Promise.all([
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
			.select({ id: locations.id, name: locations.name, outletName: outlets.name })
			.from(locations)
			.innerJoin(outlets, eq(locations.outletId, outlets.id))
			.where(eq(locations.isActive, true))
			.orderBy(asc(outlets.name), asc(locations.name)),
		db
			.select({
				itemId: stockBalances.itemId,
				locationId: stockBalances.locationId,
				qty: stockBalances.qty
			})
			.from(stockBalances)
	]);

	return {
		items: itemRows.map((row) => ({
			id: row.id,
			label: `${row.itemCode} · ${row.name}`,
			code: row.itemCode,
			unitName: row.unitName
		})),
		locations: locationRows.map((row) => ({
			id: row.id,
			label: `${row.outletName} · ${row.name}`
		})),
		balances: balanceRows
	};
}

async function findExistingDocument(submissionId: string): Promise<number | null> {
	const [existing] = await db
		.select({ id: stockDocuments.id })
		.from(stockDocuments)
		.where(eq(stockDocuments.submissionId, submissionId))
		.limit(1);
	return existing?.id ?? null;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function lockBalance(
	tx: Tx,
	itemId: number,
	locationId: number
): Promise<{ qty: number; exists: boolean }> {
	const [row] = await tx
		.select({ qty: stockBalances.qty })
		.from(stockBalances)
		.where(and(eq(stockBalances.itemId, itemId), eq(stockBalances.locationId, locationId)))
		.limit(1)
		.for('update');
	return { qty: row?.qty ?? 0, exists: Boolean(row) };
}

async function setBalance(
	tx: Tx,
	itemId: number,
	locationId: number,
	qty: number,
	exists: boolean
): Promise<void> {
	if (exists) {
		await tx
			.update(stockBalances)
			.set({ qty, updatedAt: new Date() })
			.where(and(eq(stockBalances.itemId, itemId), eq(stockBalances.locationId, locationId)));
		return;
	}
	await tx.insert(stockBalances).values({ itemId, locationId, qty, minStock: null });
}

async function insertDocument(
	tx: Tx,
	actor: AuthUser,
	input: {
		type: StockDocumentType;
		sourceLocationId: number | null;
		destinationLocationId: number | null;
		reason: string | null;
		notes: string | null;
		submissionId: string;
	}
): Promise<{ id: number; documentNumber: string }> {
	const documentNumber = await nextNumber(tx, prefixFor(input.type));
	const [document] = await tx
		.insert(stockDocuments)
		.values({
			documentNumber,
			documentType: input.type,
			sourceLocationId: input.sourceLocationId,
			destinationLocationId: input.destinationLocationId,
			reason: input.reason,
			referenceType: 'manual',
			notes: input.notes,
			performedBy: actor.id,
			submissionId: input.submissionId
		})
		.returning({ id: stockDocuments.id });

	return { id: document.id, documentNumber };
}

async function validateCommon(
	itemId: number | null,
	quantity: number,
	locationId: number | null,
	submissionId: string
): Promise<{ itemCode: string; itemName: string; locationName: string }> {
	if (!itemId) throw new DomainError('VALIDASI', 'Item inventory wajib dipilih.');
	if (!locationId) throw new DomainError('VALIDASI', 'Lokasi wajib dipilih.');
	if (!Number.isInteger(quantity) || quantity <= 0) {
		throw new DomainError('VALIDASI', 'Jumlah harus bilangan bulat lebih dari 0.');
	}
	requireSubmissionId(submissionId);
	const [item] = await db
		.select({
			itemCode: inventoryItems.itemCode,
			name: inventoryItems.name,
			isActive: inventoryItems.isActive
		})
		.from(inventoryItems)
		.where(eq(inventoryItems.id, itemId))
		.limit(1);
	if (!item || !item.isActive) {
		throw new DomainError('VALIDASI', 'Item inventory tidak ditemukan atau nonaktif.');
	}

	const [location] = await db
		.select({ name: locations.name, isActive: locations.isActive })
		.from(locations)
		.where(eq(locations.id, locationId))
		.limit(1);
	if (!location || !location.isActive) {
		throw new DomainError('VALIDASI', 'Lokasi tidak ditemukan atau nonaktif.');
	}

	return { itemCode: item.itemCode, itemName: item.name, locationName: location.name };
}

export async function createStockOut(actor: AuthUser, input: StockInput): Promise<number> {
	assertCan(actor, 'stock:out');
	const itemId = input.itemId;
	const locationId = integer(input.locationId, 'Lokasi', true)!;
	const quantity = input.quantity;
	const submissionId = text(input.submissionId);
	await validateCommon(itemId, quantity, locationId, submissionId);

	const existing = await findExistingDocument(submissionId);
	if (existing !== null) return existing;

	try {
		return await withAudit(actor, async (tx, audit) => {
			const balance = await lockBalance(tx, itemId!, locationId);
			if (balance.qty < quantity) {
				throw new DomainError(
					'STOK_TIDAK_CUKUP',
					MESSAGES.stockInsufficient(balance.qty, quantity)
				);
			}

			await setBalance(tx, itemId!, locationId, balance.qty - quantity, balance.exists);
			const document = await insertDocument(tx, actor, {
				type: 'stock_out',
				sourceLocationId: locationId,
				destinationLocationId: null,
				reason: optionalText(input.reason),
				notes: optionalText(input.notes),
				submissionId
			});

			await tx.insert(stockTransactions).values({
				documentId: document.id,
				itemId: itemId!,
				locationId,
				transactionType: 'stock_out',
				signedQty: -quantity,
				notes: optionalText(input.notes)
			});

			audit({
				module: 'stock',
				action: 'stock_out_created',
				recordId: String(document.id),
				previousValue: { qty: balance.qty },
				newValue: {
					documentNumber: document.documentNumber,
					itemId,
					locationId,
					quantity,
					qty: balance.qty - quantity
				}
			});

			return document.id;
		});
	} catch (error) {
		if (uniqueConstraintName(error) === 'stock_documents_submission_unique') {
			const duplicate = await findExistingDocument(submissionId);
			if (duplicate !== null) return duplicate;
		}
		throw error;
	}
}

export async function createStockTransfer(actor: AuthUser, input: StockInput): Promise<number> {
	assertCan(actor, 'stock:out');
	const itemId = input.itemId;
	const sourceLocationId = integer(input.locationId, 'Lokasi asal', true)!;
	const destinationLocationId = integer(input.destinationLocationId, 'Lokasi tujuan', true)!;
	const quantity = input.quantity;
	const submissionId = text(input.submissionId);

	if (sourceLocationId === destinationLocationId) {
		throw new DomainError('VALIDASI', 'Lokasi asal dan tujuan harus berbeda.');
	}
	await validateCommon(itemId, quantity, sourceLocationId, submissionId);

	const [destination] = await db
		.select({ name: locations.name, isActive: locations.isActive })
		.from(locations)
		.where(eq(locations.id, destinationLocationId))
		.limit(1);
	if (!destination || !destination.isActive) {
		throw new DomainError('VALIDASI', 'Lokasi tujuan tidak ditemukan atau nonaktif.');
	}

	const existing = await findExistingDocument(submissionId);
	if (existing !== null) return existing;

	try {
		return await db.transaction(async (tx) => {
			const firstId = Math.min(sourceLocationId, destinationLocationId);
			const secondId = Math.max(sourceLocationId, destinationLocationId);
			const first = await lockBalance(tx, itemId!, firstId);
			const second = await lockBalance(tx, itemId!, secondId);
			const source = sourceLocationId === firstId ? first : second;
			const destinationBalance = destinationLocationId === firstId ? first : second;

			if (source.qty < quantity) {
				throw new DomainError('STOK_TIDAK_CUKUP', MESSAGES.stockInsufficient(source.qty, quantity));
			}

			await setBalance(tx, itemId!, sourceLocationId, source.qty - quantity, source.exists);
			await setBalance(
				tx,
				itemId!,
				destinationLocationId,
				destinationBalance.qty + quantity,
				destinationBalance.exists
			);

			const document = await insertDocument(tx, actor, {
				type: 'transfer',
				sourceLocationId,
				destinationLocationId,
				reason: optionalText(input.reason),
				notes: optionalText(input.notes),
				submissionId
			});

			await tx.insert(stockTransactions).values([
				{
					documentId: document.id,
					itemId: itemId!,
					locationId: sourceLocationId,
					transactionType: 'transfer_out',
					signedQty: -quantity,
					notes: optionalText(input.notes)
				},
				{
					documentId: document.id,
					itemId: itemId!,
					locationId: destinationLocationId,
					transactionType: 'transfer_in',
					signedQty: quantity,
					notes: optionalText(input.notes)
				}
			]);

			await writeAudit(tx, actor, {
				module: 'stock',
				action: 'stock_transfer_created',
				recordId: String(document.id),
				previousValue: {
					sourceQty: source.qty,
					destinationQty: destinationBalance.qty
				},
				newValue: {
					documentNumber: document.documentNumber,
					itemId,
					sourceLocationId,
					destinationLocationId,
					quantity
				}
			});

			return document.id;
		});
	} catch (error) {
		if (uniqueConstraintName(error) === 'stock_documents_submission_unique') {
			const duplicate = await findExistingDocument(submissionId);
			if (duplicate !== null) return duplicate;
		}
		throw error;
	}
}

export async function createStockAdjustment(actor: AuthUser, input: StockInput): Promise<number> {
	assertCan(actor, 'stock:out');
	const itemId = input.itemId;
	const locationId = integer(input.locationId, 'Lokasi', true)!;
	const quantity = input.quantity;
	const submissionId = text(input.submissionId);
	const reason = optionalText(input.reason);

	if (!reason) throw new DomainError('VALIDASI', 'Alasan penyesuaian wajib diisi.');
	if (input.direction !== 'in' && input.direction !== 'out') {
		throw new DomainError('VALIDASI', 'Arah penyesuaian tidak valid.');
	}
	await validateCommon(itemId, quantity, locationId, submissionId);

	const existing = await findExistingDocument(submissionId);
	if (existing !== null) return existing;

	const signedQty = input.direction === 'in' ? quantity : -quantity;

	try {
		return await db.transaction(async (tx) => {
			const balance = await lockBalance(tx, itemId!, locationId);
			const nextQty = balance.qty + signedQty;
			if (nextQty < 0) {
				throw new DomainError(
					'STOK_TIDAK_CUKUP',
					MESSAGES.stockInsufficient(balance.qty, quantity)
				);
			}

			await setBalance(tx, itemId!, locationId, nextQty, balance.exists);
			const document = await insertDocument(tx, actor, {
				type: 'adjustment',
				sourceLocationId: locationId,
				destinationLocationId: null,
				reason,
				notes: optionalText(input.notes),
				submissionId
			});

			await tx.insert(stockTransactions).values({
				documentId: document.id,
				itemId: itemId!,
				locationId,
				transactionType: 'adjustment',
				signedQty,
				notes: optionalText(input.notes)
			});

			await writeAudit(tx, actor, {
				module: 'stock',
				action: 'stock_adjustment_created',
				recordId: String(document.id),
				previousValue: { qty: balance.qty },
				newValue: {
					documentNumber: document.documentNumber,
					itemId,
					locationId,
					signedQty,
					qty: nextQty,
					reason
				}
			});

			return document.id;
		});
	} catch (error) {
		if (uniqueConstraintName(error) === 'stock_documents_submission_unique') {
			const duplicate = await findExistingDocument(submissionId);
			if (duplicate !== null) return duplicate;
		}
		throw error;
	}
}

export async function createStockDocument(actor: AuthUser, input: StockInput): Promise<number> {
	if (input.type === 'stock_out') return createStockOut(actor, input);
	if (input.type === 'transfer') return createStockTransfer(actor, input);
	if (input.type === 'adjustment') return createStockAdjustment(actor, input);
	throw new DomainError('VALIDASI', 'Jenis transaksi tidak valid.');
}

export async function listStockDocuments(
	actor: AuthUser,
	filter: StockListFilter = {}
): Promise<StockListResult> {
	assertCan(actor, 'stock:in');
	const search = text(filter.search);
	const term = `%${search}%`;
	const pageSize = Math.min(100, Math.max(5, filter.pageSize ?? 10));
	const type =
		filter.type && stockDocumentTypeEnum.enumValues.includes(filter.type as never)
			? filter.type
			: undefined;
	const from = filter.from && /^\d{4}-\d{2}-\d{2}$/.test(filter.from) ? filter.from : null;
	const to = filter.to && /^\d{4}-\d{2}-\d{2}$/.test(filter.to) ? filter.to : null;
	const fromDate = from ? new Date(`${from}T00:00:00+07:00`) : null;
	const toDate = to ? new Date(`${to}T23:59:59.999+07:00`) : null;

	const where = and(
		type ? eq(stockDocuments.documentType, type as never) : undefined,
		fromDate ? gte(stockDocuments.createdAt, fromDate) : undefined,
		toDate ? lte(stockDocuments.createdAt, toDate) : undefined,
		filter.locationId
			? or(
					eq(stockDocuments.sourceLocationId, filter.locationId),
					eq(stockDocuments.destinationLocationId, filter.locationId)
				)
			: undefined,
		search
			? or(
					ilike(stockDocuments.documentNumber, term),
					ilike(stockDocuments.reason, term),
					ilike(inventoryItems.name, term),
					ilike(inventoryItems.itemCode, term)
				)
			: undefined
	);

	const [{ total }] = await db
		.select({ total: sql<number>`count(distinct ${stockDocuments.id})::int` })
		.from(stockDocuments)
		.leftJoin(stockTransactions, eq(stockTransactions.documentId, stockDocuments.id))
		.leftJoin(inventoryItems, eq(stockTransactions.itemId, inventoryItems.id))
		.where(where);

	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const page = Math.min(Math.max(filter.page ?? 1, 1), totalPages);
	const offset = (page - 1) * pageSize;

	const sourceLocation = alias(locations, 'source_location');
	const destinationLocation = alias(locations, 'destination_location');

	const rows = await db
		.select({
			id: stockDocuments.id,
			documentNumber: stockDocuments.documentNumber,
			documentType: stockDocuments.documentType,
			createdAt: stockDocuments.createdAt,
			sourceName: sourceLocation.name,
			destinationName: destinationLocation.name,
			performedByName: users.fullName,
			lineCount: sql<number>`count(${stockTransactions.id})::int`,
			itemSummary: sql<string>`coalesce(string_agg(distinct ${inventoryItems.itemCode} || ' · ' || ${inventoryItems.name}, ', '), '—')`
		})
		.from(stockDocuments)
		.leftJoin(stockTransactions, eq(stockTransactions.documentId, stockDocuments.id))
		.leftJoin(inventoryItems, eq(stockTransactions.itemId, inventoryItems.id))
		.leftJoin(sourceLocation, eq(stockDocuments.sourceLocationId, sourceLocation.id))
		.leftJoin(destinationLocation, eq(stockDocuments.destinationLocationId, destinationLocation.id))
		.innerJoin(users, eq(stockDocuments.performedBy, users.id))
		.where(where)
		.groupBy(
			stockDocuments.id,
			stockDocuments.documentNumber,
			stockDocuments.documentType,
			stockDocuments.createdAt,
			sourceLocation.name,
			destinationLocation.name,
			users.fullName
		)
		.orderBy(desc(stockDocuments.createdAt), desc(stockDocuments.id))
		.limit(pageSize)
		.offset(offset);

	const locationRows = await db
		.select({ id: locations.id, name: locations.name, outletName: outlets.name })
		.from(locations)
		.innerJoin(outlets, eq(locations.outletId, outlets.id))
		.where(eq(locations.isActive, true))
		.orderBy(asc(outlets.name), asc(locations.name));

	return {
		items: rows.map((row) => {
			const typeLabel = STOCK_DOCUMENT_LABEL[row.documentType] ?? row.documentType;
			const locationLabel =
				row.sourceName && row.destinationName
					? `${row.sourceName} → ${row.destinationName}`
					: (row.destinationName ?? row.sourceName ?? '—');
			return {
				id: row.id,
				documentNumber: row.documentNumber,
				dateLabel: formatDateTime(row.createdAt),
				typeLabel,
				typeTone: STOCK_DOCUMENT_TONE[row.documentType] ?? 'neutral',
				itemSummary: row.itemSummary,
				lineCount: row.lineCount,
				locationLabel,
				performedByName: row.performedByName
			};
		}),
		page,
		pageSize,
		total,
		filters: {
			locations: locationRows.map((row) => ({
				id: row.id,
				label: `${row.outletName} · ${row.name}`
			}))
		}
	};
}

export async function getStockDocumentDetail(actor: AuthUser, id: number): Promise<StockDetail> {
	assertCan(actor, 'stock:in');
	const sourceLocation = alias(locations, 'source_location');
	const destinationLocation = alias(locations, 'destination_location');

	const [header] = await db
		.select({
			id: stockDocuments.id,
			documentNumber: stockDocuments.documentNumber,
			documentType: stockDocuments.documentType,
			reason: stockDocuments.reason,
			notes: stockDocuments.notes,
			referenceType: stockDocuments.referenceType,
			referenceId: stockDocuments.referenceId,
			createdAt: stockDocuments.createdAt,
			sourceName: sourceLocation.name,
			destinationName: destinationLocation.name,
			performedByName: users.fullName
		})
		.from(stockDocuments)
		.leftJoin(sourceLocation, eq(stockDocuments.sourceLocationId, sourceLocation.id))
		.leftJoin(destinationLocation, eq(stockDocuments.destinationLocationId, destinationLocation.id))
		.innerJoin(users, eq(stockDocuments.performedBy, users.id))
		.where(eq(stockDocuments.id, id))
		.limit(1);

	if (!header) throw new DomainError('TIDAK_DITEMUKAN', 'Transaksi stok tidak ditemukan.');

	const lineRows = await db
		.select({
			id: stockTransactions.id,
			transactionType: stockTransactions.transactionType,
			signedQty: stockTransactions.signedQty,
			notes: stockTransactions.notes,
			itemId: stockTransactions.itemId,
			itemCode: inventoryItems.itemCode,
			itemName: inventoryItems.name,
			unitName: units.abbreviation,
			locationName: locations.name
		})
		.from(stockTransactions)
		.innerJoin(inventoryItems, eq(stockTransactions.itemId, inventoryItems.id))
		.innerJoin(units, eq(inventoryItems.unitId, units.id))
		.innerJoin(locations, eq(stockTransactions.locationId, locations.id))
		.where(eq(stockTransactions.documentId, id))
		.orderBy(asc(stockTransactions.id));

	let referenceLabel: string | null = null;
	let referenceHref: string | null = null;
	if (header.referenceType === 'receiving' && header.referenceId) {
		const [receipt] = await db
			.select({ id: receivings.id, receiptNumber: receivings.receiptNumber })
			.from(receivings)
			.where(eq(receivings.id, header.referenceId))
			.limit(1);
		if (receipt) {
			referenceLabel = receipt.receiptNumber;
			referenceHref = `/receiving/${receipt.id}`;
		}
	}

	const lines: StockLine[] = lineRows.map((row) => ({
		id: row.id,
		transactionType: row.transactionType,
		typeLabel: TRANSACTION_LABEL[row.transactionType] ?? row.transactionType,
		signedQty: row.signedQty,
		qtyLabel: `${row.signedQty > 0 ? '+' : ''}${row.signedQty} ${row.unitName}`,
		itemId: row.itemId,
		itemCode: row.itemCode,
		itemName: row.itemName,
		unitName: row.unitName,
		locationName: row.locationName,
		notes: row.notes
	}));

	return {
		id: header.id,
		documentNumber: header.documentNumber,
		dateLabel: formatDate(header.createdAt),
		createdAtLabel: formatDateTime(header.createdAt),
		typeLabel: STOCK_DOCUMENT_LABEL[header.documentType] ?? header.documentType,
		typeTone: STOCK_DOCUMENT_TONE[header.documentType] ?? 'neutral',
		documentType: header.documentType,
		reason: header.reason,
		notes: header.notes,
		performedByName: header.performedByName,
		sourceLocationName: header.sourceName,
		destinationLocationName: header.destinationName,
		referenceType: header.referenceType,
		referenceLabel,
		referenceHref,
		lines,
		totalQty: lines
			.filter((line) => line.transactionType !== 'transfer_out')
			.reduce((sum, line) => sum + Math.abs(line.signedQty), 0)
	};
}
