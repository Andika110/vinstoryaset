import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm';
import { writeAudit } from '#lib/server/audit.js';
import { assertCan } from '#lib/server/auth/permissions.js';
import type { AuthUser } from '#lib/server/auth/session.js';
import { db } from '#lib/server/db/index.js';
import { uniqueConstraintName } from '#lib/server/db/errors.js';
import {
	inventoryItems,
	itemRequests,
	locations,
	outlets,
	requestLines,
	requestStatusEnum,
	stockBalances,
	stockDocuments,
	stockTransactions,
	units,
	users
} from '#lib/server/db/schema/index.js';
import { DomainError } from '#lib/server/errors.js';
import { MESSAGES } from '#lib/messages.js';
import { nextNumber } from '#lib/server/document-number.js';
import { assertRequestTransition } from '#lib/server/domain/transitions.js';

export type RequestStatus = (typeof requestStatusEnum.enumValues)[number];
export type RequestTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

const STATUS_LABEL: Record<RequestStatus, string> = {
	submitted: 'Menunggu',
	processing: 'Diproses',
	partially_fulfilled: 'Terpenuhi Sebagian',
	fulfilled: 'Selesai',
	rejected: 'Ditolak',
	cancelled: 'Dibatalkan'
};

const STATUS_TONE: Record<RequestStatus, RequestTone> = {
	submitted: 'warning',
	processing: 'info',
	partially_fulfilled: 'info',
	fulfilled: 'success',
	rejected: 'danger',
	cancelled: 'neutral'
};

export type RequestItemOption = {
	id: number;
	label: string;
	unitName: string;
	availableStock: number;
};

export type RequestFormOptions = {
	items: RequestItemOption[];
	outletName: string;
};

export type RequestLineInput = {
	itemId: number;
	quantity: number;
	notes: string | null;
};

export type RequestInput = {
	reason: string | null;
	notes: string | null;
	lines: RequestLineInput[];
	submissionId: string;
};

export type RequestListItem = {
	id: number;
	requestNumber: string;
	outletName: string;
	requestedByName: string;
	statusLabel: string;
	statusTone: RequestTone;
	dateLabel: string;
	lineCount: number;
	totalRequested: number;
	totalFulfilled: number;
};

export type RequestListFilter = {
	search?: string;
	status?: string;
	outletId?: number | null;
	from?: string;
	to?: string;
	page?: number;
	pageSize?: number;
};

export type RequestListResult = {
	items: RequestListItem[];
	page: number;
	pageSize: number;
	total: number;
	filters: { outlets: { id: number; label: string }[] };
};

export type RequestDetailLine = {
	id: number;
	itemId: number;
	itemCode: string;
	itemName: string;
	unitName: string;
	requestedQty: number;
	fulfilledQty: number;
	remainingQty: number;
	notes: string | null;
};

export type RequestTimeline = {
	id: string;
	label: string;
	tone: RequestTone;
	description: string;
	meta: string;
};

export type RequestDetail = {
	id: number;
	requestNumber: string;
	outletId: number;
	outletName: string;
	status: RequestStatus;
	statusLabel: string;
	statusTone: RequestTone;
	requestedByName: string;
	reason: string | null;
	notes: string | null;
	rejectionReason: string | null;
	createdAtLabel: string;
	updatedAtLabel: string;
	lines: RequestDetailLine[];
	timeline: RequestTimeline[];
	totalRequested: number;
	totalFulfilled: number;
	canCancel: boolean;
	canProcess: boolean;
	canFulfill: boolean;
	canReject: boolean;
	sourceLocations: { id: number; label: string }[];
	balances: { itemId: number; locationId: number; qty: number }[];
	fulfillmentDefaults: { submissionId: string };
};

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('id-ID', {
	dateStyle: 'medium',
	timeStyle: 'short',
	timeZone: 'Asia/Jakarta'
});
const YEAR_FORMAT = new Intl.DateTimeFormat('en-CA', {
	year: 'numeric',
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

function isStatus(value: string): value is RequestStatus {
	return requestStatusEnum.enumValues.includes(value as RequestStatus);
}

function assertTransition(from: RequestStatus, to: RequestStatus): void {
	assertRequestTransition(from, to);
}

export async function getRequestFormOptions(actor: AuthUser): Promise<RequestFormOptions> {
	if (actor.role !== 'outlet') {
		throw new DomainError('DILARANG', 'Hanya outlet yang dapat membuat request.');
	}
	assertCan(actor, 'request:create');
	if (actor.outletId === null) {
		throw new DomainError('DILARANG', 'Akun outlet belum memiliki outlet.');
	}

	const rows = await db
		.select({
			id: inventoryItems.id,
			itemCode: inventoryItems.itemCode,
			name: inventoryItems.name,
			unitName: units.abbreviation,
			availableStock: sql<number>`coalesce(sum(${stockBalances.qty}), 0)::int`
		})
		.from(inventoryItems)
		.innerJoin(units, eq(inventoryItems.unitId, units.id))
		.leftJoin(stockBalances, eq(stockBalances.itemId, inventoryItems.id))
		.where(eq(inventoryItems.isActive, true))
		.groupBy(inventoryItems.id, inventoryItems.itemCode, inventoryItems.name, units.abbreviation)
		.orderBy(asc(inventoryItems.name));

	return {
		outletName: actor.outletName ?? 'Outlet',
		items: rows.map((row) => ({
			id: row.id,
			label: `${row.itemCode} · ${row.name} (${row.unitName})`,
			unitName: row.unitName,
			availableStock: row.availableStock
		}))
	};
}

async function findExistingRequest(submissionId: string): Promise<number | null> {
	const [existing] = await db
		.select({ id: itemRequests.id })
		.from(itemRequests)
		.where(eq(itemRequests.submissionId, submissionId))
		.limit(1);
	return existing?.id ?? null;
}

export async function createRequest(actor: AuthUser, input: RequestInput): Promise<number> {
	if (actor.role !== 'outlet') {
		throw new DomainError('DILARANG', 'Hanya outlet yang dapat membuat request.');
	}
	assertCan(actor, 'request:create');
	if (actor.outletId === null) {
		throw new DomainError('DILARANG', 'Akun outlet belum memiliki outlet.');
	}

	const submissionId = text(input.submissionId);
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(submissionId)) {
		throw new DomainError('VALIDASI', 'Token idempotensi tidak valid.');
	}
	if (input.lines.length === 0) {
		throw new DomainError('VALIDASI', 'Request harus memiliki minimal satu item.');
	}

	const existing = await findExistingRequest(submissionId);
	if (existing !== null) return existing;

	const seen = new Set<number>();
	for (const line of input.lines) {
		if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
			throw new DomainError('VALIDASI', 'Jumlah item harus lebih dari 0.');
		}
		if (seen.has(line.itemId)) {
			throw new DomainError('VALIDASI', 'Item request tidak boleh duplikat.');
		}
		seen.add(line.itemId);
	}

	const itemIds = input.lines.map((line) => line.itemId);
	const items = await db
		.select({ id: inventoryItems.id, isActive: inventoryItems.isActive })
		.from(inventoryItems)
		.where(inArray(inventoryItems.id, itemIds));
	if (items.length !== itemIds.length || items.some((item) => !item.isActive)) {
		throw new DomainError('VALIDASI', 'Item request tidak ditemukan atau nonaktif.');
	}

	try {
		return await db.transaction(async (tx) => {
			const requestNumber = await nextNumber(tx, 'REQ');
			const [request] = await tx
				.insert(itemRequests)
				.values({
					requestNumber,
					outletId: actor.outletId!,
					requestedBy: actor.id,
					reason: optionalText(input.reason),
					notes: optionalText(input.notes),
					status: 'submitted',
					submissionId
				})
				.returning({ id: itemRequests.id });

			await tx.insert(requestLines).values(
				input.lines.map((line) => ({
					requestId: request.id,
					itemId: line.itemId,
					requestedQty: line.quantity,
					fulfilledQty: 0,
					notes: optionalText(line.notes)
				}))
			);

			await writeAudit(tx, actor, {
				module: 'request',
				action: 'request_created',
				recordId: String(request.id),
				newValue: {
					requestNumber,
					outletId: actor.outletId,
					lines: input.lines.map((line) => ({
						itemId: line.itemId,
						quantity: line.quantity
					})),
					reason: optionalText(input.reason)
				}
			});

			return request.id;
		});
	} catch (error) {
		if (uniqueConstraintName(error) === 'item_requests_submission_unique') {
			const duplicate = await findExistingRequest(submissionId);
			if (duplicate !== null) return duplicate;
		}
		throw error;
	}
}

export async function listRequests(
	actor: AuthUser,
	filter: RequestListFilter = {}
): Promise<RequestListResult> {
	const search = text(filter.search);
	const term = `%${search}%`;
	const pageSize = Math.min(100, Math.max(5, filter.pageSize ?? 10));
	const status = filter.status && isStatus(filter.status) ? filter.status : undefined;
	const from = filter.from && /^\d{4}-\d{2}-\d{2}$/.test(filter.from) ? filter.from : null;
	const to = filter.to && /^\d{4}-\d{2}-\d{2}$/.test(filter.to) ? filter.to : null;
	const fromDate = from ? new Date(`${from}T00:00:00+07:00`) : null;
	const toDate = to ? new Date(`${to}T23:59:59.999+07:00`) : null;

	const where = and(
		actor.role === 'outlet'
			? eq(itemRequests.outletId, actor.outletId!)
			: filter.outletId
				? eq(itemRequests.outletId, filter.outletId)
				: undefined,
		status ? eq(itemRequests.status, status) : undefined,
		fromDate ? gte(itemRequests.createdAt, fromDate) : undefined,
		toDate ? lte(itemRequests.createdAt, toDate) : undefined,
		search
			? or(
					ilike(itemRequests.requestNumber, term),
					ilike(outlets.name, term),
					ilike(itemRequests.reason, term)
				)
			: undefined
	);

	const [{ total }] = await db
		.select({ total: sql<number>`count(distinct ${itemRequests.id})::int` })
		.from(itemRequests)
		.innerJoin(outlets, eq(itemRequests.outletId, outlets.id))
		.leftJoin(requestLines, eq(requestLines.requestId, itemRequests.id))
		.where(where);

	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const page = Math.min(Math.max(filter.page ?? 1, 1), totalPages);
	const offset = (page - 1) * pageSize;

	const rows = await db
		.select({
			id: itemRequests.id,
			requestNumber: itemRequests.requestNumber,
			status: itemRequests.status,
			createdAt: itemRequests.createdAt,
			outletName: outlets.name,
			requestedByName: users.fullName,
			lineCount: sql<number>`count(${requestLines.id})::int`,
			totalRequested: sql<number>`coalesce(sum(${requestLines.requestedQty}), 0)::int`,
			totalFulfilled: sql<number>`coalesce(sum(${requestLines.fulfilledQty}), 0)::int`
		})
		.from(itemRequests)
		.innerJoin(outlets, eq(itemRequests.outletId, outlets.id))
		.innerJoin(users, eq(itemRequests.requestedBy, users.id))
		.leftJoin(requestLines, eq(requestLines.requestId, itemRequests.id))
		.where(where)
		.groupBy(
			itemRequests.id,
			itemRequests.requestNumber,
			itemRequests.status,
			itemRequests.createdAt,
			outlets.name,
			users.fullName
		)
		.orderBy(
			sql`case when ${itemRequests.status}::text = 'submitted' then 0 when ${itemRequests.status}::text = 'processing' then 1 else 2 end`,
			desc(itemRequests.createdAt)
		)
		.limit(pageSize)
		.offset(offset);

	const outletRows =
		actor.role === 'outlet'
			? []
			: await db
					.select({ id: outlets.id, name: outlets.name })
					.from(outlets)
					.where(eq(outlets.isActive, true))
					.orderBy(asc(outlets.name));

	return {
		items: rows.map((row) => ({
			id: row.id,
			requestNumber: row.requestNumber,
			outletName: row.outletName,
			requestedByName: row.requestedByName,
			statusLabel: STATUS_LABEL[row.status],
			statusTone: STATUS_TONE[row.status],
			dateLabel: formatDateTime(row.createdAt),
			lineCount: row.lineCount,
			totalRequested: row.totalRequested,
			totalFulfilled: row.totalFulfilled
		})),
		page,
		pageSize,
		total,
		filters: {
			outlets: outletRows.map((row) => ({ id: row.id, label: row.name }))
		}
	};
}

export async function getRequestDetail(actor: AuthUser, id: number): Promise<RequestDetail> {
	const [row] = await db
		.select({
			id: itemRequests.id,
			requestNumber: itemRequests.requestNumber,
			status: itemRequests.status,
			outletId: itemRequests.outletId,
			outletName: outlets.name,
			requestedByName: users.fullName,
			reason: itemRequests.reason,
			notes: itemRequests.notes,
			rejectionReason: itemRequests.rejectionReason,
			createdAt: itemRequests.createdAt,
			updatedAt: itemRequests.updatedAt
		})
		.from(itemRequests)
		.innerJoin(outlets, eq(itemRequests.outletId, outlets.id))
		.innerJoin(users, eq(itemRequests.requestedBy, users.id))
		.where(eq(itemRequests.id, id))
		.limit(1);

	if (!row) throw new DomainError('TIDAK_DITEMUKAN', 'Request tidak ditemukan.');
	if (actor.role === 'outlet' && row.outletId !== actor.outletId) {
		throw new DomainError('TIDAK_DITEMUKAN', 'Request tidak ditemukan.');
	}

	const lineRows = await db
		.select({
			id: requestLines.id,
			itemId: inventoryItems.id,
			itemCode: inventoryItems.itemCode,
			itemName: inventoryItems.name,
			unitName: units.abbreviation,
			requestedQty: requestLines.requestedQty,
			fulfilledQty: requestLines.fulfilledQty,
			notes: requestLines.notes
		})
		.from(requestLines)
		.innerJoin(inventoryItems, eq(requestLines.itemId, inventoryItems.id))
		.innerJoin(units, eq(inventoryItems.unitId, units.id))
		.where(eq(requestLines.requestId, id))
		.orderBy(asc(requestLines.id));

	const lines: RequestDetailLine[] = lineRows.map((line) => ({
		...line,
		remainingQty: line.requestedQty - line.fulfilledQty
	}));

	const isSupport = actor.role !== 'outlet';
	const status = row.status;
	const canFulfill = isSupport && ['processing', 'partially_fulfilled'].includes(status);
	const sourceLocations = isSupport
		? await db
				.select({ id: locations.id, name: locations.name, outletName: outlets.name })
				.from(locations)
				.innerJoin(outlets, eq(locations.outletId, outlets.id))
				.where(eq(locations.isActive, true))
				.orderBy(asc(outlets.name), asc(locations.name))
		: [];

	let balances: { itemId: number; locationId: number; qty: number }[] = [];
	if (canFulfill && lines.length > 0) {
		balances = await db
			.select({
				itemId: stockBalances.itemId,
				locationId: stockBalances.locationId,
				qty: stockBalances.qty
			})
			.from(stockBalances)
			.where(
				inArray(
					stockBalances.itemId,
					lines.map((line) => line.itemId)
				)
			);
	}

	const fulfillmentRows = await db
		.select({
			id: stockTransactions.id,
			documentNumber: stockDocuments.documentNumber,
			quantity: stockTransactions.signedQty,
			createdAt: stockTransactions.createdAt,
			itemCode: inventoryItems.itemCode,
			itemName: inventoryItems.name,
			locationName: locations.name,
			performedByName: users.fullName
		})
		.from(stockDocuments)
		.innerJoin(stockTransactions, eq(stockTransactions.documentId, stockDocuments.id))
		.innerJoin(inventoryItems, eq(stockTransactions.itemId, inventoryItems.id))
		.innerJoin(locations, eq(stockTransactions.locationId, locations.id))
		.innerJoin(users, eq(stockDocuments.performedBy, users.id))
		.where(and(eq(stockDocuments.referenceType, 'request'), eq(stockDocuments.referenceId, id)))
		.orderBy(asc(stockTransactions.createdAt), asc(stockTransactions.id));

	const timeline: RequestTimeline[] = [
		{
			id: 'created',
			label: 'Request diajukan',
			tone: 'warning',
			description: `${row.requestedByName} · ${lines.length} item`,
			meta: formatDateTime(row.createdAt)
		},
		...fulfillmentRows.map((entry) => ({
			id: `fulfill-${entry.id}`,
			label: 'Fulfillment',
			tone: 'info' as RequestTone,
			description: `${entry.documentNumber ?? 'Stock Out'} · ${entry.itemCode} ${entry.itemName} · ${Math.abs(entry.quantity)} di ${entry.locationName}`,
			meta: `${formatDateTime(entry.createdAt)} · ${entry.performedByName}`
		}))
	];
	if (
		['processing', 'partially_fulfilled', 'fulfilled', 'rejected', 'cancelled'].includes(status)
	) {
		timeline.push({
			id: `status-${status}`,
			label: STATUS_LABEL[status],
			tone: STATUS_TONE[status],
			description:
				status === 'rejected'
					? (row.rejectionReason ?? 'Ditolak')
					: status === 'cancelled'
						? 'Dibatalkan'
						: 'Status request diperbarui',
			meta: formatDateTime(row.updatedAt)
		});
	}

	return {
		id: row.id,
		requestNumber: row.requestNumber,
		outletId: row.outletId,
		outletName: row.outletName,
		status,
		statusLabel: STATUS_LABEL[status],
		statusTone: STATUS_TONE[status],
		requestedByName: row.requestedByName,
		reason: row.reason,
		notes: row.notes,
		rejectionReason: row.rejectionReason,
		createdAtLabel: formatDateTime(row.createdAt),
		updatedAtLabel: formatDateTime(row.updatedAt),
		lines,
		timeline,
		totalRequested: lines.reduce((sum, line) => sum + line.requestedQty, 0),
		totalFulfilled: lines.reduce((sum, line) => sum + line.fulfilledQty, 0),
		canCancel: actor.role === 'outlet' && row.outletId === actor.outletId && status === 'submitted',
		canProcess: isSupport && status === 'submitted',
		canFulfill,
		canReject: isSupport && ['submitted', 'processing'].includes(status),
		sourceLocations: sourceLocations.map((location) => ({
			id: location.id,
			label: `${location.outletName} · ${location.name}`
		})),
		balances,
		fulfillmentDefaults: { submissionId: randomUUID() }
	};
}

export async function processRequest(actor: AuthUser, id: number): Promise<void> {
	assertCan(actor, 'request:process');
	await db.transaction(async (tx) => {
		const [request] = await tx
			.select({ id: itemRequests.id, status: itemRequests.status })
			.from(itemRequests)
			.where(eq(itemRequests.id, id))
			.limit(1)
			.for('update');
		if (!request) throw new DomainError('TIDAK_DITEMUKAN', 'Request tidak ditemukan.');
		assertTransition(request.status, 'processing');
		await tx
			.update(itemRequests)
			.set({ status: 'processing', processedBy: actor.id, updatedAt: new Date() })
			.where(eq(itemRequests.id, id));
		await writeAudit(tx, actor, {
			module: 'request',
			action: 'request_processing',
			recordId: String(id),
			previousValue: { status: request.status },
			newValue: { status: 'processing' }
		});
	});
}

export type FulfillLineInput = { lineId: number; quantity: number };

export async function fulfillRequest(
	actor: AuthUser,
	id: number,
	input: { sourceLocationId: number | null; lines: FulfillLineInput[]; submissionId: string }
): Promise<void> {
	assertCan(actor, 'request:process');
	const sourceLocationId = integer(input.sourceLocationId, 'Lokasi stok', true)!;
	const submissionId = text(input.submissionId);
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(submissionId)) {
		throw new DomainError('VALIDASI', 'Token idempotensi tidak valid.');
	}
	const positive = input.lines.filter((line) => line.quantity > 0);
	if (positive.length === 0) {
		throw new DomainError('VALIDASI', 'Isi qty fulfillment minimal satu baris.');
	}

	const existingDocument = await db
		.select({ id: stockDocuments.id })
		.from(stockDocuments)
		.where(eq(stockDocuments.submissionId, submissionId))
		.limit(1);
	if (existingDocument.length > 0) return;

	const [location] = await db
		.select({ id: locations.id, name: locations.name, isActive: locations.isActive })
		.from(locations)
		.where(eq(locations.id, sourceLocationId))
		.limit(1);
	if (!location || !location.isActive) {
		throw new DomainError('VALIDASI', 'Lokasi stok tidak ditemukan atau nonaktif.');
	}

	await db.transaction(async (tx) => {
		const [request] = await tx
			.select({ id: itemRequests.id, status: itemRequests.status })
			.from(itemRequests)
			.where(eq(itemRequests.id, id))
			.limit(1)
			.for('update');
		if (!request) throw new DomainError('TIDAK_DITEMUKAN', 'Request tidak ditemukan.');
		if (!['processing', 'partially_fulfilled'].includes(request.status)) {
			throw new DomainError('VALIDASI', 'Request belum diproses atau sudah final.');
		}

		const lineRows = await tx
			.select({
				id: requestLines.id,
				itemId: requestLines.itemId,
				requestedQty: requestLines.requestedQty,
				fulfilledQty: requestLines.fulfilledQty
			})
			.from(requestLines)
			.where(eq(requestLines.requestId, id))
			.orderBy(asc(requestLines.id));
		const lineMap = new Map(lineRows.map((line) => [line.id, line]));

		for (const inputLine of positive) {
			const line = lineMap.get(inputLine.lineId);
			if (!line) throw new DomainError('VALIDASI', 'Baris request tidak valid.');
			const remaining = line.requestedQty - line.fulfilledQty;
			if (!Number.isInteger(inputLine.quantity) || inputLine.quantity <= 0) {
				throw new DomainError('VALIDASI', 'Qty fulfillment tidak valid.');
			}
			if (inputLine.quantity > remaining) {
				throw new DomainError(
					'VALIDASI',
					`Qty fulfillment melebihi sisa permintaan (${remaining}).`
				);
			}
		}

		const [document] = await tx
			.insert(stockDocuments)
			.values({
				documentNumber: `TMP-${randomUUID()}`,
				documentType: 'stock_out',
				sourceLocationId,
				reason: `Fulfillment request ${request.id}`,
				referenceType: 'request',
				referenceId: id,
				performedBy: actor.id,
				submissionId
			})
			.returning({ id: stockDocuments.id });
		const year = YEAR_FORMAT.format(new Date());
		const documentNumber = `STO-${year}-${String(document.id).padStart(4, '0')}`;
		await tx
			.update(stockDocuments)
			.set({ documentNumber })
			.where(eq(stockDocuments.id, document.id));

		for (const inputLine of positive.sort((a, b) => a.lineId - b.lineId)) {
			const line = lineMap.get(inputLine.lineId)!;
			const [balance] = await tx
				.select({ qty: stockBalances.qty })
				.from(stockBalances)
				.where(
					and(eq(stockBalances.itemId, line.itemId), eq(stockBalances.locationId, sourceLocationId))
				)
				.limit(1)
				.for('update');
			const available = balance?.qty ?? 0;
			if (available < inputLine.quantity) {
				throw new DomainError(
					'STOK_TIDAK_CUKUP',
					MESSAGES.stockInsufficient(available, inputLine.quantity)
				);
			}
			await tx
				.update(stockBalances)
				.set({ qty: available - inputLine.quantity, updatedAt: new Date() })
				.where(
					and(eq(stockBalances.itemId, line.itemId), eq(stockBalances.locationId, sourceLocationId))
				);

			await tx.insert(stockTransactions).values({
				documentId: document.id,
				itemId: line.itemId,
				locationId: sourceLocationId,
				transactionType: 'stock_out',
				signedQty: -inputLine.quantity,
				notes: `Fulfillment request ${id}`
			});

			await tx
				.update(requestLines)
				.set({ fulfilledQty: line.fulfilledQty + inputLine.quantity })
				.where(eq(requestLines.id, line.id));
		}

		const updatedLines = await tx
			.select({ requestedQty: requestLines.requestedQty, fulfilledQty: requestLines.fulfilledQty })
			.from(requestLines)
			.where(eq(requestLines.requestId, id));
		const allFulfilled = updatedLines.every((line) => line.fulfilledQty >= line.requestedQty);
		const nextStatus: RequestStatus = allFulfilled ? 'fulfilled' : 'partially_fulfilled';
		assertTransition(request.status, nextStatus);
		await tx
			.update(itemRequests)
			.set({ status: nextStatus, processedBy: actor.id, updatedAt: new Date() })
			.where(eq(itemRequests.id, id));

		await writeAudit(tx, actor, {
			module: 'request',
			action: 'request_fulfilled',
			recordId: String(id),
			previousValue: { status: request.status },
			newValue: {
				status: nextStatus,
				documentNumber,
				sourceLocationId,
				lines: positive.map((line) => ({
					lineId: line.lineId,
					quantity: line.quantity
				}))
			}
		});
		await writeAudit(tx, actor, {
			module: 'stock',
			action: 'stock_out_created',
			recordId: String(document.id),
			newValue: {
				documentNumber,
				requestId: id,
				lines: positive.map((line) => ({ lineId: line.lineId, quantity: line.quantity }))
			}
		});
	});
}

export async function rejectRequest(actor: AuthUser, id: number, reason: string): Promise<void> {
	assertCan(actor, 'request:process');
	const rejectionReason = text(reason);
	if (!rejectionReason) {
		throw new DomainError('VALIDASI', 'Alasan penolakan wajib diisi.');
	}
	await db.transaction(async (tx) => {
		const [request] = await tx
			.select({ id: itemRequests.id, status: itemRequests.status })
			.from(itemRequests)
			.where(eq(itemRequests.id, id))
			.limit(1)
			.for('update');
		if (!request) throw new DomainError('TIDAK_DITEMUKAN', 'Request tidak ditemukan.');
		assertTransition(request.status, 'rejected');
		await tx
			.update(itemRequests)
			.set({
				status: 'rejected',
				rejectionReason,
				processedBy: actor.id,
				updatedAt: new Date()
			})
			.where(eq(itemRequests.id, id));
		await writeAudit(tx, actor, {
			module: 'request',
			action: 'request_rejected',
			recordId: String(id),
			previousValue: { status: request.status },
			newValue: { status: 'rejected', rejectionReason }
		});
	});
}

export async function cancelRequest(actor: AuthUser, id: number): Promise<void> {
	await db.transaction(async (tx) => {
		const [request] = await tx
			.select({
				id: itemRequests.id,
				status: itemRequests.status,
				outletId: itemRequests.outletId
			})
			.from(itemRequests)
			.where(eq(itemRequests.id, id))
			.limit(1)
			.for('update');
		if (!request) throw new DomainError('TIDAK_DITEMUKAN', 'Request tidak ditemukan.');
		if (request.outletId !== actor.outletId) {
			throw new DomainError('TIDAK_DITEMUKAN', 'Request tidak ditemukan.');
		}
		assertCan(actor, 'request:cancel', { status: request.status });
		assertTransition(request.status, 'cancelled');
		await tx
			.update(itemRequests)
			.set({ status: 'cancelled', updatedAt: new Date() })
			.where(eq(itemRequests.id, id));
		await writeAudit(tx, actor, {
			module: 'request',
			action: 'request_cancelled',
			recordId: String(id),
			previousValue: { status: request.status },
			newValue: { status: 'cancelled' }
		});
	});
}
