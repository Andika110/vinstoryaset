import { and, asc, desc, eq, gte, ilike, lte, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { writeAudit } from '#lib/server/audit.js';
import { assertCan, scopeToUser, type Scope } from '#lib/server/auth/permissions.js';
import type { AuthUser } from '#lib/server/auth/session.js';
import { db } from '#lib/server/db/index.js';
import { uniqueConstraintName } from '#lib/server/db/errors.js';
import {
	assetMovements,
	assets,
	employees,
	locations,
	outlets,
	users
} from '#lib/server/db/schema/index.js';
import { ASSET_STATUS_LABEL } from '#lib/server/domain/transitions.js';
import { DomainError } from '#lib/server/errors.js';
import { nextNumber } from '#lib/server/document-number.js';

export type MutationAssetOption = {
	id: number;
	label: string;
	assetCode: string;
	name: string;
	currentLocationId: number;
	currentLocationLabel: string;
	outletId: number;
};

export type MutationFormOptions = {
	assets: MutationAssetOption[];
	locations: { id: number; label: string; outletId: number }[];
};

export type MutationInput = {
	assetId: number | null;
	destinationLocationId: number | null;
	mutationDate: string;
	reason: string | null;
	receivedByName: string | null;
	notes: string | null;
	submissionId: string;
};

export type MutationListItem = {
	id: number;
	movementNumber: string | null;
	dateLabel: string;
	assetId: number;
	assetLabel: string;
	assetCode: string;
	fromLabel: string;
	toLabel: string;
	receivedByName: string | null;
	performedByName: string;
};

export type MutationListFilter = {
	search?: string;
	locationId?: number | null;
	from?: string;
	to?: string;
	page?: number;
	pageSize?: number;
};

export type MutationListResult = {
	items: MutationListItem[];
	page: number;
	pageSize: number;
	total: number;
	filters: { locations: { id: number; label: string }[] };
};

export type MutationTimelineEntry = {
	id: number;
	typeLabel: string;
	tone: 'info' | 'warning' | 'success' | 'neutral';
	title: string;
	description: string;
	meta: string;
	date: string;
};

export type MutationDetail = {
	id: number;
	movementNumber: string | null;
	mutationDateLabel: string;
	createdAtLabel: string;
	assetId: number;
	assetCode: string;
	assetName: string;
	assetStatusLabel: string;
	fromLocationName: string | null;
	toLocationName: string | null;
	fromEmployeeName: string | null;
	toEmployeeName: string | null;
	reason: string | null;
	receivedByName: string | null;
	notes: string | null;
	performedByName: string;
	timeline: MutationTimelineEntry[];
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

function assertDate(value: string, label: string): string {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
		throw new DomainError('VALIDASI', `${label} tidak valid.`);
	}
	return value;
}

function dateToTimestamp(value: string): Date {
	return new Date(`${value}T12:00:00+07:00`);
}

function formatDateTime(value: Date): string {
	return DATE_TIME_FORMAT.format(value);
}

function formatDate(value: Date | string): string {
	const date = value instanceof Date ? value : new Date(`${value}T00:00:00+07:00`);
	return Number.isNaN(date.getTime()) ? String(value) : DATE_FORMAT.format(date);
}

function todayJakarta(): string {
	return new Intl.DateTimeFormat('en-CA', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		timeZone: 'Asia/Jakarta'
	}).format(new Date());
}

export function mutationDefaultDate(): string {
	return todayJakarta();
}

function outletCondition(scope: Scope): SQL | undefined {
	return scope.allOutlets ? undefined : eq(locations.outletId, scope.outletId!);
}

export async function getMutationFormOptions(actor: AuthUser): Promise<MutationFormOptions> {
	assertCan(actor, 'asset:mutate');
	const scope = scopeToUser(actor);

	const [assetRows, locationRows] = await Promise.all([
		db
			.select({
				id: assets.id,
				assetCode: assets.assetCode,
				name: assets.name,
				status: assets.status,
				locationId: assets.locationId,
				locationName: locations.name,
				outletId: outlets.id,
				outletName: outlets.name
			})
			.from(assets)
			.innerJoin(locations, eq(assets.locationId, locations.id))
			.innerJoin(outlets, eq(locations.outletId, outlets.id))
			.where(
				and(
					scope.allOutlets ? undefined : eq(locations.outletId, scope.outletId!),
					sql`${assets.status}::text not in ('disposed','on_loan')`
				)
			)
			.orderBy(asc(assets.assetCode)),
		db
			.select({
				id: locations.id,
				name: locations.name,
				outletId: locations.outletId,
				outletName: outlets.name
			})
			.from(locations)
			.innerJoin(outlets, eq(locations.outletId, outlets.id))
			.where(and(eq(locations.isActive, true), outletCondition(scope)))
			.orderBy(asc(outlets.name), asc(locations.name))
	]);

	return {
		assets: assetRows.map((row) => ({
			id: row.id,
			assetCode: row.assetCode,
			name: row.name,
			label: `${row.assetCode} · ${row.name} · ${ASSET_STATUS_LABEL[row.status]}`,
			currentLocationId: row.locationId,
			currentLocationLabel: `${row.outletName} · ${row.locationName}`,
			outletId: row.outletId
		})),
		locations: locationRows.map((row) => ({
			id: row.id,
			label: `${row.outletName} · ${row.name}`,
			outletId: row.outletId
		}))
	};
}

async function findExistingMutation(submissionId: string): Promise<number | null> {
	const [existing] = await db
		.select({ id: assetMovements.id })
		.from(assetMovements)
		.where(
			and(
				eq(assetMovements.submissionId, submissionId),
				eq(assetMovements.movementType, 'mutation')
			)
		)
		.limit(1);
	return existing?.id ?? null;
}

export async function createMutation(actor: AuthUser, input: MutationInput): Promise<number> {
	assertCan(actor, 'asset:mutate');
	const assetId = integer(input.assetId, 'Aset', true)!;
	const destinationLocationId = integer(input.destinationLocationId, 'Lokasi tujuan', true)!;
	const mutationDate = assertDate(text(input.mutationDate), 'Tanggal mutasi');
	const submissionId = text(input.submissionId);

	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(submissionId)) {
		throw new DomainError('VALIDASI', 'Token idempotensi tidak valid.');
	}

	const existing = await findExistingMutation(submissionId);
	if (existing !== null) return existing;

	try {
		return await db.transaction(async (tx) => {
			const [asset] = await tx
				.select({
					id: assets.id,
					assetCode: assets.assetCode,
					name: assets.name,
					status: assets.status,
					locationId: assets.locationId,
					assignedEmployeeId: assets.assignedEmployeeId
				})
				.from(assets)
				.where(eq(assets.id, assetId))
				.limit(1)
				.for('update');

			if (!asset) throw new DomainError('TIDAK_DITEMUKAN', 'Aset tidak ditemukan.');
			if (asset.status === 'disposed') {
				throw new DomainError('VALIDASI', 'Aset disposed tidak dapat dimutasi.');
			}
			if (asset.status === 'on_loan') {
				throw new DomainError('VALIDASI', 'Aset yang sedang dipinjam tidak dapat dimutasi.');
			}
			if (asset.locationId === destinationLocationId) {
				throw new DomainError('VALIDASI', 'Lokasi asal dan tujuan harus berbeda.');
			}

			const [fromLocation] = await tx
				.select({ name: locations.name })
				.from(locations)
				.where(eq(locations.id, asset.locationId))
				.limit(1);
			const [toLocation] = await tx
				.select({ name: locations.name, isActive: locations.isActive })
				.from(locations)
				.where(eq(locations.id, destinationLocationId))
				.limit(1);
			if (!toLocation || !toLocation.isActive) {
				throw new DomainError('VALIDASI', 'Lokasi tujuan tidak ditemukan atau nonaktif.');
			}

			const [employee] = asset.assignedEmployeeId
				? await tx
						.select({ name: employees.fullName })
						.from(employees)
						.where(eq(employees.id, asset.assignedEmployeeId))
						.limit(1)
				: [];

			await tx
				.update(assets)
				.set({
					locationId: destinationLocationId,
					updatedBy: actor.id,
					updatedAt: new Date()
				})
				.where(eq(assets.id, assetId));

			const movementNumber = await nextNumber(tx, 'MUT');
			const [movement] = await tx
				.insert(assetMovements)
				.values({
					movementNumber,
					movementType: 'mutation',
					movementDate: dateToTimestamp(mutationDate),
					assetId,
					fromLocationId: asset.locationId,
					toLocationId: destinationLocationId,
					fromEmployeeId: asset.assignedEmployeeId,
					toEmployeeId: asset.assignedEmployeeId,
					fromLocationName: fromLocation?.name ?? null,
					toLocationName: toLocation.name,
					fromEmployeeName: employee?.name ?? null,
					toEmployeeName: employee?.name ?? null,
					reason: optionalText(input.reason),
					receivedByName: optionalText(input.receivedByName),
					performedBy: actor.id,
					notes: optionalText(input.notes),
					submissionId
				})
				.returning({ id: assetMovements.id });

			await writeAudit(tx, actor, {
				module: 'mutation',
				action: 'asset_mutated',
				recordId: String(movement.id),
				previousValue: {
					assetId,
					locationId: asset.locationId,
					locationName: fromLocation?.name ?? null
				},
				newValue: {
					assetId,
					locationId: destinationLocationId,
					locationName: toLocation.name,
					movementNumber,
					receivedByName: optionalText(input.receivedByName)
				}
			});

			return movement.id;
		});
	} catch (error) {
		if (uniqueConstraintName(error) === 'asset_movements_submission_unique') {
			const duplicate = await findExistingMutation(submissionId);
			if (duplicate !== null) return duplicate;
		}
		throw error;
	}
}

export async function listMutations(
	actor: AuthUser,
	filter: MutationListFilter = {}
): Promise<MutationListResult> {
	const scope = scopeToUser(actor);
	const search = text(filter.search);
	const term = `%${search}%`;
	const pageSize = Math.min(100, Math.max(5, filter.pageSize ?? 10));
	const fromDate = filter.from && /^\d{4}-\d{2}-\d{2}$/.test(filter.from) ? filter.from : null;
	const toDate = filter.to && /^\d{4}-\d{2}-\d{2}$/.test(filter.to) ? filter.to : null;
	const fromTimestamp = fromDate ? new Date(`${fromDate}T00:00:00+07:00`) : null;
	const toTimestamp = toDate ? new Date(`${toDate}T23:59:59.999+07:00`) : null;

	const fromLocation = alias(locations, 'from_location');
	const toLocation = alias(locations, 'to_location');

	const where = and(
		eq(assetMovements.movementType, 'mutation'),
		scope.allOutlets
			? undefined
			: or(eq(fromLocation.outletId, scope.outletId!), eq(toLocation.outletId, scope.outletId!)),
		search
			? or(
					ilike(assetMovements.movementNumber, term),
					ilike(assets.assetCode, term),
					ilike(assets.name, term)
				)
			: undefined,
		filter.locationId
			? or(
					eq(assetMovements.fromLocationId, filter.locationId),
					eq(assetMovements.toLocationId, filter.locationId)
				)
			: undefined,
		fromTimestamp ? gte(assetMovements.movementDate, fromTimestamp) : undefined,
		toTimestamp ? lte(assetMovements.movementDate, toTimestamp) : undefined
	);

	const [{ total }] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(assetMovements)
		.innerJoin(assets, eq(assetMovements.assetId, assets.id))
		.leftJoin(fromLocation, eq(assetMovements.fromLocationId, fromLocation.id))
		.leftJoin(toLocation, eq(assetMovements.toLocationId, toLocation.id))
		.where(where);

	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const page = Math.min(Math.max(filter.page ?? 1, 1), totalPages);
	const offset = (page - 1) * pageSize;

	const rows = await db
		.select({
			id: assetMovements.id,
			movementNumber: assetMovements.movementNumber,
			movementDate: assetMovements.movementDate,
			fromLocationName: assetMovements.fromLocationName,
			toLocationName: assetMovements.toLocationName,
			receivedByName: assetMovements.receivedByName,
			assetId: assets.id,
			assetCode: assets.assetCode,
			assetName: assets.name,
			performedByName: users.fullName
		})
		.from(assetMovements)
		.innerJoin(assets, eq(assetMovements.assetId, assets.id))
		.innerJoin(users, eq(assetMovements.performedBy, users.id))
		.leftJoin(fromLocation, eq(assetMovements.fromLocationId, fromLocation.id))
		.leftJoin(toLocation, eq(assetMovements.toLocationId, toLocation.id))
		.where(where)
		.orderBy(desc(assetMovements.movementDate), desc(assetMovements.id))
		.limit(pageSize)
		.offset(offset);

	const locationRows = await db
		.select({ id: locations.id, name: locations.name, outletName: outlets.name })
		.from(locations)
		.innerJoin(outlets, eq(locations.outletId, outlets.id))
		.where(and(eq(locations.isActive, true), outletCondition(scope)))
		.orderBy(asc(outlets.name), asc(locations.name));

	return {
		items: rows.map((row) => ({
			id: row.id,
			movementNumber: row.movementNumber,
			dateLabel: formatDate(row.movementDate),
			assetId: row.assetId,
			assetLabel: `${row.assetCode} · ${row.assetName}`,
			assetCode: row.assetCode,
			fromLabel: row.fromLocationName ?? '—',
			toLabel: row.toLocationName ?? '—',
			receivedByName: row.receivedByName,
			performedByName: row.performedByName
		})),
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

export async function getMutationDetail(actor: AuthUser, id: number): Promise<MutationDetail> {
	const scope = scopeToUser(actor);
	const fromLocation = alias(locations, 'from_location');
	const toLocation = alias(locations, 'to_location');

	const [row] = await db
		.select({
			id: assetMovements.id,
			movementNumber: assetMovements.movementNumber,
			mutationDate: assetMovements.movementDate,
			createdAt: assetMovements.createdAt,
			fromLocationName: assetMovements.fromLocationName,
			toLocationName: assetMovements.toLocationName,
			fromLocationOutletId: fromLocation.outletId,
			toLocationOutletId: toLocation.outletId,
			fromEmployeeName: assetMovements.fromEmployeeName,
			toEmployeeName: assetMovements.toEmployeeName,
			reason: assetMovements.reason,
			receivedByName: assetMovements.receivedByName,
			notes: assetMovements.notes,
			assetId: assets.id,
			assetCode: assets.assetCode,
			assetName: assets.name,
			assetStatus: assets.status,
			performedByName: users.fullName
		})
		.from(assetMovements)
		.innerJoin(assets, eq(assetMovements.assetId, assets.id))
		.innerJoin(users, eq(assetMovements.performedBy, users.id))
		.leftJoin(fromLocation, eq(assetMovements.fromLocationId, fromLocation.id))
		.leftJoin(toLocation, eq(assetMovements.toLocationId, toLocation.id))
		.where(and(eq(assetMovements.id, id), eq(assetMovements.movementType, 'mutation')))
		.limit(1);

	if (!row) throw new DomainError('TIDAK_DITEMUKAN', 'Mutasi tidak ditemukan.');
	if (
		!scope.allOutlets &&
		row.fromLocationOutletId !== scope.outletId &&
		row.toLocationOutletId !== scope.outletId
	) {
		throw new DomainError('TIDAK_DITEMUKAN', 'Mutasi tidak ditemukan.');
	}

	const timelineRows = await db
		.select({
			id: assetMovements.id,
			movementNumber: assetMovements.movementNumber,
			movementType: assetMovements.movementType,
			movementDate: assetMovements.movementDate,
			fromLocationName: assetMovements.fromLocationName,
			toLocationName: assetMovements.toLocationName,
			performedByName: users.fullName
		})
		.from(assetMovements)
		.innerJoin(users, eq(assetMovements.performedBy, users.id))
		.leftJoin(fromLocation, eq(assetMovements.fromLocationId, fromLocation.id))
		.leftJoin(toLocation, eq(assetMovements.toLocationId, toLocation.id))
		.where(
			and(
				eq(assetMovements.assetId, row.assetId),
				scope.allOutlets
					? undefined
					: or(eq(fromLocation.outletId, scope.outletId!), eq(toLocation.outletId, scope.outletId!))
			)
		)
		.orderBy(desc(assetMovements.movementDate), desc(assetMovements.id));

	return {
		id: row.id,
		movementNumber: row.movementNumber,
		mutationDateLabel: formatDate(row.mutationDate),
		createdAtLabel: formatDateTime(row.createdAt),
		assetId: row.assetId,
		assetCode: row.assetCode,
		assetName: row.assetName,
		assetStatusLabel: ASSET_STATUS_LABEL[row.assetStatus],
		fromLocationName: row.fromLocationName,
		toLocationName: row.toLocationName,
		fromEmployeeName: row.fromEmployeeName,
		toEmployeeName: row.toEmployeeName,
		reason: row.reason,
		receivedByName: row.receivedByName,
		notes: row.notes,
		performedByName: row.performedByName,
		timeline: timelineRows.map((entry) => {
			const isMutation = entry.movementType === 'mutation';
			return {
				id: entry.id,
				typeLabel: isMutation ? 'Mutasi' : 'Penempatan',
				tone: isMutation ? 'warning' : 'info',
				title: `${isMutation ? 'Mutasi' : 'Penempatan'}${entry.movementNumber ? ` · ${entry.movementNumber}` : ''}`,
				description: `${entry.fromLocationName ?? '—'} → ${entry.toLocationName ?? '—'}`,
				meta: formatDateTime(entry.movementDate),
				date: entry.movementDate.toISOString()
			};
		})
	};
}
