import { and, asc, desc, eq, gte, ilike, inArray, lte, ne, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { writeAudit } from '#lib/server/audit.js';
import { assertCan, scopeToUser } from '#lib/server/auth/permissions.js';
import type { AuthUser } from '#lib/server/auth/session.js';
import { db } from '#lib/server/db/index.js';
import {
	assetConditions,
	assets,
	inventoryItems,
	locations,
	opnameLines,
	opnameResultEnum,
	opnameStatusEnum,
	outlets,
	stockBalances,
	stockOpnames,
	units,
	users
} from '#lib/server/db/schema/index.js';
import { DomainError } from '#lib/server/errors.js';
import { nextNumber } from '#lib/server/document-number.js';

export type OpnameStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled';
export type OpnameItemType = 'asset' | 'inventory';
export type OpnameResult = 'matched' | 'other_location' | 'condition_changed' | 'not_found';
export type BadgeTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

export const OPNAME_STATUS_LABEL: Record<OpnameStatus, string> = {
	draft: 'Draft',
	in_progress: 'In Progress',
	completed: 'Completed',
	cancelled: 'Cancelled'
};

export const OPNAME_STATUS_TONE: Record<OpnameStatus, BadgeTone> = {
	draft: 'neutral',
	in_progress: 'info',
	completed: 'success',
	cancelled: 'danger'
};

export const OPNAME_TYPE_LABEL: Record<OpnameItemType, string> = {
	asset: 'Aset',
	inventory: 'Inventory'
};

export const OPNAME_RESULT_LABEL: Record<OpnameResult, string> = {
	matched: 'Sesuai',
	other_location: 'Lokasi lain',
	condition_changed: 'Kondisi berbeda',
	not_found: 'Tidak ditemukan'
};

const OPNAME_RESULT_TONE: Record<OpnameResult, BadgeTone> = {
	matched: 'success',
	other_location: 'info',
	condition_changed: 'warning',
	not_found: 'danger'
};

export const OPNAME_RESULT_OPTIONS: { value: OpnameResult; label: string }[] = (
	opnameResultEnum.enumValues as OpnameResult[]
).map((value) => ({ value, label: OPNAME_RESULT_LABEL[value] }));

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('id-ID', {
	dateStyle: 'medium',
	timeStyle: 'short',
	timeZone: 'Asia/Jakarta'
});

function formatDateTime(value: Date | null | undefined): string {
	return value ? DATE_TIME_FORMAT.format(value) : '—';
}

function canManage(actor: AuthUser): boolean {
	return actor.role === 'admin' || actor.role === 'support';
}

function assertRead(actor: AuthUser): void {
	if (actor.role === 'outlet') {
		assertCan(actor, 'opname:assist');
		return;
	}
	assertCan(actor, 'opname:write');
}

function assertManage(actor: AuthUser): void {
	if (!canManage(actor)) {
		throw new DomainError(
			'DILARANG',
			'Hanya IT Administrator atau IT Support yang dapat mengelola sesi opname.'
		);
	}
	assertCan(actor, 'opname:write');
}

function assertScope(actor: AuthUser, outletId: number): void {
	if (actor.role === 'outlet' && actor.outletId !== outletId) {
		throw new DomainError('TIDAK_DITEMUKAN', 'Sesi opname tidak ditemukan.');
	}
}

type OpnameHeaderRow = {
	id: number;
	opnameNumber: string;
	locationId: number;
	locationName: string;
	outletId: number;
	outletName: string;
	itemType: OpnameItemType;
	status: OpnameStatus;
	notes: string | null;
	createdAt: Date;
	startedAt: Date | null;
	completedAt: Date | null;
	createdByName: string;
};

async function loadHeader(actor: AuthUser, id: number): Promise<OpnameHeaderRow> {
	assertRead(actor);
	const scope = scopeToUser(actor);
	const [row] = await db
		.select({
			id: stockOpnames.id,
			opnameNumber: stockOpnames.opnameNumber,
			locationId: stockOpnames.locationId,
			locationName: locations.name,
			outletId: outlets.id,
			outletName: outlets.name,
			itemType: stockOpnames.itemType,
			status: stockOpnames.status,
			notes: stockOpnames.notes,
			createdAt: stockOpnames.createdAt,
			startedAt: stockOpnames.startedAt,
			completedAt: stockOpnames.completedAt,
			createdByName: users.fullName
		})
		.from(stockOpnames)
		.innerJoin(locations, eq(stockOpnames.locationId, locations.id))
		.innerJoin(outlets, eq(locations.outletId, outlets.id))
		.innerJoin(users, eq(stockOpnames.createdBy, users.id))
		.where(
			and(
				eq(stockOpnames.id, id),
				scope.allOutlets ? undefined : eq(locations.outletId, scope.outletId!)
			)
		)
		.limit(1);

	if (!row) throw new DomainError('TIDAK_DITEMUKAN', 'Sesi opname tidak ditemukan.');
	return row;
}

export type OpnameLocationOption = { id: number; label: string };

export async function getOpnameFormOptions(actor: AuthUser): Promise<{
	locations: OpnameLocationOption[];
}> {
	assertManage(actor);
	const rows = await db
		.select({
			id: locations.id,
			name: locations.name,
			outletName: outlets.name,
			code: locations.code
		})
		.from(locations)
		.innerJoin(outlets, eq(locations.outletId, outlets.id))
		.where(eq(locations.isActive, true))
		.orderBy(asc(outlets.name), asc(locations.name));

	return {
		locations: rows.map((row) => ({
			id: row.id,
			label: `${row.outletName} · ${row.name} (${row.code})`
		}))
	};
}

export type OpnameListFilter = {
	search?: string;
	status?: string;
	locationId?: number | null;
	itemType?: string;
	from?: string;
	to?: string;
	page?: number;
	pageSize?: number;
};

export type OpnameListItem = {
	id: number;
	opnameNumber: string;
	locationName: string;
	outletName: string;
	itemType: OpnameItemType;
	itemTypeLabel: string;
	status: OpnameStatus;
	statusLabel: string;
	statusTone: BadgeTone;
	createdAtLabel: string;
	totalLines: number;
	checkedLines: number;
};

export type OpnameListResult = {
	items: OpnameListItem[];
	page: number;
	pageSize: number;
	total: number;
	filters: {
		locations: OpnameLocationOption[];
		statuses: { value: OpnameStatus; label: string }[];
		types: { value: OpnameItemType; label: string }[];
	};
};

function isStatus(value: string | undefined): value is OpnameStatus {
	return Boolean(value) && opnameStatusEnum.enumValues.includes(value as OpnameStatus);
}

function isItemType(value: string | undefined): value is OpnameItemType {
	return value === 'asset' || value === 'inventory';
}

export async function listOpnames(
	actor: AuthUser,
	filter: OpnameListFilter = {}
): Promise<OpnameListResult> {
	assertRead(actor);
	const scope = scopeToUser(actor);
	const search = (filter.search ?? '').trim();
	const term = `%${search}%`;
	const pageSize = Math.min(50, Math.max(5, filter.pageSize ?? 15));
	const status = isStatus(filter.status) ? filter.status : undefined;
	const itemType = isItemType(filter.itemType) ? filter.itemType : undefined;
	const locationId = filter.locationId ?? null;
	const fromValue = filter.from && /^\d{4}-\d{2}-\d{2}$/.test(filter.from) ? filter.from : null;
	const toValue = filter.to && /^\d{4}-\d{2}-\d{2}$/.test(filter.to) ? filter.to : null;
	const fromDate = fromValue ? new Date(`${fromValue}T00:00:00+07:00`) : null;
	const toDate = toValue ? new Date(`${toValue}T23:59:59.999+07:00`) : null;

	const where = and(
		scope.allOutlets ? undefined : eq(locations.outletId, scope.outletId!),
		status ? eq(stockOpnames.status, status) : undefined,
		itemType ? eq(stockOpnames.itemType, itemType) : undefined,
		locationId ? eq(stockOpnames.locationId, locationId) : undefined,
		fromDate ? gte(stockOpnames.createdAt, fromDate) : undefined,
		toDate ? lte(stockOpnames.createdAt, toDate) : undefined,
		search
			? or(
					ilike(stockOpnames.opnameNumber, term),
					ilike(locations.name, term),
					ilike(outlets.name, term)
				)
			: undefined
	);

	const [{ total }] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(stockOpnames)
		.innerJoin(locations, eq(stockOpnames.locationId, locations.id))
		.innerJoin(outlets, eq(locations.outletId, outlets.id))
		.where(where);

	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const page = Math.min(Math.max(filter.page ?? 1, 1), totalPages);
	const offset = (page - 1) * pageSize;

	const rows = await db
		.select({
			id: stockOpnames.id,
			opnameNumber: stockOpnames.opnameNumber,
			locationName: locations.name,
			outletName: outlets.name,
			itemType: stockOpnames.itemType,
			status: stockOpnames.status,
			createdAt: stockOpnames.createdAt
		})
		.from(stockOpnames)
		.innerJoin(locations, eq(stockOpnames.locationId, locations.id))
		.innerJoin(outlets, eq(locations.outletId, outlets.id))
		.where(where)
		.orderBy(desc(stockOpnames.createdAt), desc(stockOpnames.id))
		.limit(pageSize)
		.offset(offset);

	const ids = rows.map((row) => row.id);
	const counts =
		ids.length > 0
			? await db
					.select({
						opnameId: opnameLines.opnameId,
						totalLines: sql<number>`count(*)::int`,
						checkedLines: sql<number>`(count(*) filter (where ${opnameLines.checkedAt} is not null))::int`
					})
					.from(opnameLines)
					.where(inArray(opnameLines.opnameId, ids))
					.groupBy(opnameLines.opnameId)
			: [];
	const countMap = new Map(counts.map((row) => [row.opnameId, row]));

	const [locationRows, statusRows] = await Promise.all([
		db
			.select({
				id: locations.id,
				name: locations.name,
				outletName: outlets.name
			})
			.from(locations)
			.innerJoin(outlets, eq(locations.outletId, outlets.id))
			.where(
				and(
					eq(locations.isActive, true),
					scope.allOutlets ? undefined : eq(locations.outletId, scope.outletId!)
				)
			)
			.orderBy(asc(outlets.name), asc(locations.name)),
		Promise.resolve(
			(opnameStatusEnum.enumValues as OpnameStatus[]).map((value) => ({
				value,
				label: OPNAME_STATUS_LABEL[value]
			}))
		)
	]);

	return {
		items: rows.map((row) => {
			const count = countMap.get(row.id);
			return {
				id: row.id,
				opnameNumber: row.opnameNumber,
				locationName: row.locationName,
				outletName: row.outletName,
				itemType: row.itemType,
				itemTypeLabel: OPNAME_TYPE_LABEL[row.itemType],
				status: row.status,
				statusLabel: OPNAME_STATUS_LABEL[row.status],
				statusTone: OPNAME_STATUS_TONE[row.status],
				createdAtLabel: formatDateTime(row.createdAt),
				totalLines: count?.totalLines ?? 0,
				checkedLines: count?.checkedLines ?? 0
			};
		}),
		page,
		pageSize,
		total,
		filters: {
			locations: locationRows.map((row) => ({
				id: row.id,
				label: `${row.outletName} · ${row.name}`
			})),
			statuses: statusRows,
			types: (['asset', 'inventory'] as OpnameItemType[]).map((value) => ({
				value,
				label: OPNAME_TYPE_LABEL[value]
			}))
		}
	};
}

export type OpnameLineView = {
	id: number;
	itemType: OpnameItemType;
	itemCode: string;
	itemName: string;
	unitName: string | null;
	systemQty: number;
	physicalQty: number | null;
	variance: number | null;
	systemConditionId: number | null;
	systemConditionName: string | null;
	physicalConditionId: number | null;
	physicalConditionName: string | null;
	result: OpnameResult | null;
	resultLabel: string;
	resultTone: BadgeTone;
	checkedByName: string | null;
	checkedAtLabel: string;
	notes: string | null;
	isChecked: boolean;
};

export type OpnameSummary = {
	total: number;
	checked: number;
	unchecked: number;
	matched: number;
	variance: number;
	notFound: number;
	conditionChanged: number;
	otherLocation: number;
};

export type OpnameDetail = {
	opname: {
		id: number;
		opnameNumber: string;
		locationId: number;
		locationName: string;
		outletId: number;
		outletName: string;
		itemType: OpnameItemType;
		itemTypeLabel: string;
		status: OpnameStatus;
		statusLabel: string;
		statusTone: BadgeTone;
		notes: string | null;
		createdByName: string;
		createdAtLabel: string;
		startedAtLabel: string;
		completedAtLabel: string;
	};
	lines: OpnameLineView[];
	summary: OpnameSummary;
	canManage: boolean;
	canCount: boolean;
	conditions: { id: number; label: string }[];
};

async function loadLines(opnameId: number): Promise<OpnameLineView[]> {
	const systemCondition = alias(assetConditions, 'system_condition');
	const physicalCondition = alias(assetConditions, 'physical_condition');

	const rows = await db
		.select({
			id: opnameLines.id,
			itemType: opnameLines.itemType,
			systemQty: opnameLines.systemQty,
			physicalQty: opnameLines.physicalQty,
			result: opnameLines.result,
			notes: opnameLines.notes,
			checkedAt: opnameLines.checkedAt,
			checkedByName: users.fullName,
			assetCode: assets.assetCode,
			assetName: assets.name,
			systemConditionId: assets.conditionId,
			systemConditionName: systemCondition.name,
			physicalConditionId: opnameLines.conditionId,
			physicalConditionName: physicalCondition.name,
			itemCode: inventoryItems.itemCode,
			itemName: inventoryItems.name,
			unitName: units.name
		})
		.from(opnameLines)
		.leftJoin(assets, eq(opnameLines.assetId, assets.id))
		.leftJoin(systemCondition, eq(assets.conditionId, systemCondition.id))
		.leftJoin(physicalCondition, eq(opnameLines.conditionId, physicalCondition.id))
		.leftJoin(inventoryItems, eq(opnameLines.inventoryItemId, inventoryItems.id))
		.leftJoin(units, eq(inventoryItems.unitId, units.id))
		.leftJoin(users, eq(opnameLines.checkedBy, users.id))
		.where(eq(opnameLines.opnameId, opnameId))
		.orderBy(asc(opnameLines.id));

	return rows.map((row) => {
		const result = (row.result as OpnameResult | null) ?? null;
		const isInventory = row.itemType === 'inventory';
		const variance = row.physicalQty === null ? null : row.physicalQty - row.systemQty;

		let resultLabel: string;
		let resultTone: BadgeTone;
		if (row.checkedAt === null) {
			resultLabel = 'Belum dicek';
			resultTone = 'neutral';
		} else if (isInventory && result === null) {
			resultLabel = row.physicalQty === 0 ? 'Tidak ditemukan' : 'Selisih';
			resultTone = row.physicalQty === 0 ? 'danger' : 'warning';
		} else if (result) {
			resultLabel = OPNAME_RESULT_LABEL[result];
			resultTone = OPNAME_RESULT_TONE[result];
		} else {
			resultLabel = 'Sesuai';
			resultTone = 'success';
		}

		return {
			id: row.id,
			itemType: row.itemType,
			itemCode: row.assetCode ?? row.itemCode ?? '',
			itemName: row.assetName ?? row.itemName ?? '',
			unitName: row.unitName,
			systemQty: row.systemQty,
			physicalQty: row.physicalQty,
			variance,
			systemConditionId: row.systemConditionId,
			systemConditionName: row.systemConditionName,
			physicalConditionId: row.physicalConditionId,
			physicalConditionName: row.physicalConditionName,
			result,
			resultLabel,
			resultTone,
			checkedByName: row.checkedByName,
			checkedAtLabel: formatDateTime(row.checkedAt),
			notes: row.notes,
			isChecked: row.checkedAt !== null
		};
	});
}

function summarise(lines: OpnameLineView[]): OpnameSummary {
	const checked = lines.filter((line) => line.isChecked).length;
	return {
		total: lines.length,
		checked,
		unchecked: lines.length - checked,
		matched: lines.filter((line) => line.result === 'matched').length,
		variance: lines.filter((line) => line.variance !== null && line.variance !== 0).length,
		notFound: lines.filter((line) => line.result === 'not_found').length,
		conditionChanged: lines.filter((line) => line.result === 'condition_changed').length,
		otherLocation: lines.filter((line) => line.result === 'other_location').length
	};
}

export async function getOpnameDetail(actor: AuthUser, id: number): Promise<OpnameDetail> {
	const header = await loadHeader(actor, id);
	assertScope(actor, header.outletId);
	const lines = await loadLines(header.id);
	const conditionRows = await db
		.select({ id: assetConditions.id, name: assetConditions.name })
		.from(assetConditions)
		.where(eq(assetConditions.isActive, true))
		.orderBy(asc(assetConditions.name));

	return {
		opname: {
			id: header.id,
			opnameNumber: header.opnameNumber,
			locationId: header.locationId,
			locationName: header.locationName,
			outletId: header.outletId,
			outletName: header.outletName,
			itemType: header.itemType,
			itemTypeLabel: OPNAME_TYPE_LABEL[header.itemType],
			status: header.status,
			statusLabel: OPNAME_STATUS_LABEL[header.status],
			statusTone: OPNAME_STATUS_TONE[header.status],
			notes: header.notes,
			createdByName: header.createdByName,
			createdAtLabel: formatDateTime(header.createdAt),
			startedAtLabel: formatDateTime(header.startedAt),
			completedAtLabel: formatDateTime(header.completedAt)
		},
		lines,
		summary: summarise(lines),
		canManage: canManage(actor),
		canCount: header.status === 'in_progress',
		conditions: conditionRows.map((row) => ({ id: row.id, label: row.name }))
	};
}

export type OpnameCreateInput = {
	locationId: number | null;
	itemType: string;
	notes: string | null;
};

export async function createOpname(actor: AuthUser, input: OpnameCreateInput): Promise<number> {
	assertManage(actor);
	if (!input.locationId) throw new DomainError('VALIDASI', 'Lokasi wajib dipilih.');
	const itemType = input.itemType;
	if (!isItemType(itemType)) {
		throw new DomainError('VALIDASI', 'Jenis opname harus Aset atau Inventory.');
	}

	const [location] = await db
		.select({ id: locations.id })
		.from(locations)
		.where(eq(locations.id, input.locationId))
		.limit(1);
	if (!location) throw new DomainError('VALIDASI', 'Lokasi tidak ditemukan.');

	const id = await db.transaction(async (tx) => {
		const opnameNumber = await nextNumber(tx, 'OPN');
		const [created] = await tx
			.insert(stockOpnames)
			.values({
				opnameNumber,
				locationId: input.locationId!,
				itemType,
				status: 'draft',
				notes: input.notes,
				createdBy: actor.id
			})
			.returning({ id: stockOpnames.id });

		await writeAudit(tx, actor, {
			module: 'opname',
			action: 'opname_created',
			recordId: String(created.id),
			newValue: {
				opnameNumber,
				locationId: input.locationId,
				itemType
			}
		});

		return created.id;
	});

	return id;
}

export async function startOpname(actor: AuthUser, id: number): Promise<void> {
	const header = await loadHeader(actor, id);
	assertManage(actor);
	assertScope(actor, header.outletId);
	if (header.status !== 'draft') {
		throw new DomainError('INVALID_STATUS', 'Hanya sesi draft yang dapat dimulai.');
	}

	await db.transaction(async (tx) => {
		const [updated] = await tx
			.update(stockOpnames)
			.set({ status: 'in_progress', startedAt: new Date(), updatedAt: new Date() })
			.where(and(eq(stockOpnames.id, id), eq(stockOpnames.status, 'draft')))
			.returning({ id: stockOpnames.id });
		if (!updated) throw new DomainError('INVALID_STATUS', 'Sesi opname sudah diproses.');

		let count: number;
		if (header.itemType === 'asset') {
			const assetRows = await tx
				.select({ id: assets.id })
				.from(assets)
				.where(and(eq(assets.locationId, header.locationId), ne(assets.status, 'disposed')))
				.orderBy(asc(assets.assetCode));
			count = assetRows.length;
			if (count === 0) {
				throw new DomainError('VALIDASI', 'Tidak ada aset aktif pada lokasi ini.');
			}
			await tx.insert(opnameLines).values(
				assetRows.map((row) => ({
					opnameId: id,
					itemType: 'asset' as const,
					assetId: row.id,
					systemQty: 1
				}))
			);
		} else {
			const balanceRows = await tx
				.select({ itemId: stockBalances.itemId, qty: stockBalances.qty })
				.from(stockBalances)
				.innerJoin(inventoryItems, eq(stockBalances.itemId, inventoryItems.id))
				.where(
					and(eq(stockBalances.locationId, header.locationId), eq(inventoryItems.isActive, true))
				)
				.orderBy(asc(inventoryItems.itemCode));
			count = balanceRows.length;
			if (count === 0) {
				throw new DomainError('VALIDASI', 'Tidak ada item inventory pada lokasi ini.');
			}
			await tx.insert(opnameLines).values(
				balanceRows.map((row) => ({
					opnameId: id,
					itemType: 'inventory' as const,
					inventoryItemId: row.itemId,
					systemQty: row.qty
				}))
			);
		}

		await writeAudit(tx, actor, {
			module: 'opname',
			action: 'opname_started',
			recordId: String(id),
			newValue: { itemType: header.itemType, lines: count }
		});
	});
}

export type OpnameCountInput = {
	lineId: number;
	result: string;
	conditionId: number | null;
	physicalQty: number | null;
	notes: string | null;
};

export async function saveOpnameCount(
	actor: AuthUser,
	id: number,
	inputs: OpnameCountInput[]
): Promise<void> {
	const header = await loadHeader(actor, id);
	assertScope(actor, header.outletId);
	if (!canManage(actor)) assertCan(actor, 'opname:assist');
	else assertCan(actor, 'opname:write');
	if (header.status !== 'in_progress') {
		throw new DomainError('INVALID_STATUS', 'Sesi opname tidak dapat diubah pada status ini.');
	}

	await db.transaction(async (tx) => {
		const lineRows = await tx
			.select({
				id: opnameLines.id,
				itemType: opnameLines.itemType,
				systemQty: opnameLines.systemQty,
				assetId: opnameLines.assetId,
				systemConditionId: assets.conditionId
			})
			.from(opnameLines)
			.leftJoin(assets, eq(opnameLines.assetId, assets.id))
			.where(eq(opnameLines.opnameId, id));

		const lineMap = new Map(lineRows.map((row) => [row.id, row]));
		const conditionIds = new Set(
			(
				await tx
					.select({ id: assetConditions.id })
					.from(assetConditions)
					.where(eq(assetConditions.isActive, true))
			).map((row) => row.id)
		);

		for (const input of inputs) {
			const line = lineMap.get(input.lineId);
			if (!line) throw new DomainError('VALIDASI', 'Baris opname tidak dikenal.');

			const notes = input.notes?.trim() ? input.notes.trim() : null;
			if (notes && notes.length > 500) {
				throw new DomainError('VALIDASI', 'Catatan maksimal 500 karakter.');
			}

			if (line.itemType === 'asset') {
				const result = input.result ? (input.result as OpnameResult) : null;
				if (result === null && input.conditionId === null) {
					await tx
						.update(opnameLines)
						.set({
							physicalQty: null,
							conditionId: null,
							result: null,
							checkedBy: null,
							checkedAt: null,
							notes
						})
						.where(eq(opnameLines.id, line.id));
					continue;
				}
				if (!result || !opnameResultEnum.enumValues.includes(result)) {
					throw new DomainError('VALIDASI', 'Hasil pengecekan aset tidak valid.');
				}
				if (result === 'not_found' || result === 'other_location') {
					await tx
						.update(opnameLines)
						.set({
							physicalQty: 0,
							conditionId: null,
							result,
							checkedBy: actor.id,
							checkedAt: new Date(),
							notes
						})
						.where(eq(opnameLines.id, line.id));
					continue;
				}

				let conditionId = input.conditionId;
				if (!conditionId && result === 'matched') conditionId = line.systemConditionId ?? null;
				if (!conditionId || !conditionIds.has(conditionId)) {
					throw new DomainError(
						'VALIDASI',
						'Kondisi fisik wajib dipilih untuk aset yang ditemukan.'
					);
				}
				if (result === 'matched' && conditionId !== line.systemConditionId) {
					throw new DomainError(
						'VALIDASI',
						'Kondisi berbeda dengan sistem. Pilih hasil "Kondisi berbeda".'
					);
				}
				if (result === 'condition_changed' && conditionId === line.systemConditionId) {
					throw new DomainError(
						'VALIDASI',
						'Pilih kondisi fisik yang berbeda dari kondisi sistem.'
					);
				}

				await tx
					.update(opnameLines)
					.set({
						physicalQty: 1,
						conditionId,
						result,
						checkedBy: actor.id,
						checkedAt: new Date(),
						notes
					})
					.where(eq(opnameLines.id, line.id));
				continue;
			}

			if (input.physicalQty === null) {
				await tx
					.update(opnameLines)
					.set({
						physicalQty: null,
						conditionId: null,
						result: null,
						checkedBy: null,
						checkedAt: null,
						notes
					})
					.where(eq(opnameLines.id, line.id));
				continue;
			}
			if (!Number.isInteger(input.physicalQty) || input.physicalQty < 0) {
				throw new DomainError('VALIDASI', 'Jumlah fisik harus bilangan bulat >= 0.');
			}
			const result: OpnameResult | null =
				input.physicalQty === line.systemQty
					? 'matched'
					: input.physicalQty === 0
						? 'not_found'
						: null;
			await tx
				.update(opnameLines)
				.set({
					physicalQty: input.physicalQty,
					conditionId: null,
					result,
					checkedBy: actor.id,
					checkedAt: new Date(),
					notes
				})
				.where(eq(opnameLines.id, line.id));
		}
	});
}

export async function completeOpname(actor: AuthUser, id: number): Promise<void> {
	const header = await loadHeader(actor, id);
	assertManage(actor);
	assertScope(actor, header.outletId);
	if (header.status !== 'in_progress') {
		throw new DomainError('INVALID_STATUS', 'Hanya sesi in progress yang dapat diselesaikan.');
	}

	const lines = await loadLines(id);
	const unchecked = lines.filter((line) => !line.isChecked).length;
	if (unchecked > 0) {
		throw new DomainError(
			'VALIDASI',
			`Masih ada ${unchecked} item yang belum dicek. Lengkapi semua item sebelum menyelesaikan sesi.`
		);
	}

	await db.transaction(async (tx) => {
		const [updated] = await tx
			.update(stockOpnames)
			.set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
			.where(and(eq(stockOpnames.id, id), eq(stockOpnames.status, 'in_progress')))
			.returning({ id: stockOpnames.id });
		if (!updated) throw new DomainError('INVALID_STATUS', 'Sesi opname sudah diproses.');

		await writeAudit(tx, actor, {
			module: 'opname',
			action: 'opname_completed',
			recordId: String(id),
			newValue: summarise(lines)
		});
	});
}

export async function cancelOpname(actor: AuthUser, id: number, reason: string): Promise<void> {
	const header = await loadHeader(actor, id);
	assertManage(actor);
	assertScope(actor, header.outletId);
	if (header.status !== 'draft' && header.status !== 'in_progress') {
		throw new DomainError('INVALID_STATUS', 'Sesi ini tidak dapat dibatalkan.');
	}
	const trimmed = reason.trim();
	if (trimmed.length < 3) {
		throw new DomainError('VALIDASI', 'Alasan pembatalan wajib diisi minimal 3 karakter.');
	}

	await db.transaction(async (tx) => {
		const notes = header.notes
			? `${header.notes}\nDibatalkan: ${trimmed}`
			: `Dibatalkan: ${trimmed}`;
		await tx
			.update(stockOpnames)
			.set({ status: 'cancelled', completedAt: new Date(), notes, updatedAt: new Date() })
			.where(eq(stockOpnames.id, id));
		await writeAudit(tx, actor, {
			module: 'opname',
			action: 'opname_cancelled',
			recordId: String(id),
			newValue: { reason: trimmed }
		});
	});
}
