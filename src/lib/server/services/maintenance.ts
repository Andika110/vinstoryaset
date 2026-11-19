import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm';
import { writeAudit } from '#lib/server/audit.js';
import { assertCan, scopeToUser } from '#lib/server/auth/permissions.js';
import type { AuthUser } from '#lib/server/auth/session.js';
import { db } from '#lib/server/db/index.js';
import { uniqueConstraintName } from '#lib/server/db/errors.js';
import {
	assetMaintenances,
	assets,
	inventoryItems,
	locations,
	maintenanceParts,
	maintenanceStatusEnum,
	maintenanceTypeEnum,
	outlets,
	stockBalances,
	stockDocuments,
	stockTransactions,
	units,
	users
} from '#lib/server/db/schema/index.js';
import {
	ASSET_STATUS_LABEL,
	MAINTENANCE_TRANSITIONS,
	assertMaintenanceTransition,
	type AssetStatus
} from '#lib/server/domain/transitions.js';
import { DomainError } from '#lib/server/errors.js';
import { nextNumber } from '#lib/server/document-number.js';
import { deleteStoredUpload, saveImageUpload } from '#lib/server/files.js';

export type MaintenanceTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';
export type MaintenanceStatus = (typeof maintenanceStatusEnum.enumValues)[number];
export type MaintenanceType = (typeof maintenanceTypeEnum.enumValues)[number];

export const MAINTENANCE_STATUS_LABEL: Record<MaintenanceStatus, string> = {
	reported: 'Dilaporkan',
	in_progress: 'Dikerjakan',
	waiting_parts: 'Menunggu Sparepart',
	completed: 'Selesai',
	cancelled: 'Dibatalkan'
};

const STATUS_TONE: Record<MaintenanceStatus, MaintenanceTone> = {
	reported: 'warning',
	in_progress: 'info',
	waiting_parts: 'warning',
	completed: 'success',
	cancelled: 'neutral'
};

const TYPE_LABEL: Record<MaintenanceType, string> = {
	corrective: 'Corrective',
	preventive: 'Preventive',
	other: 'Lainnya'
};

export type MaintenanceOption = { id: number; label: string };
export type MaintenanceReportOptions = {
	assets: { id: number; label: string; statusLabel: string; locationLabel: string }[];
};

export type MaintenanceReportInput = {
	assetId: number | null;
	maintenanceType: string;
	problemDescription: string;
	photo?: File | null;
	submissionId: string;
};

export type MaintenanceListItem = {
	id: number;
	maintenanceNumber: string;
	assetId: number;
	assetCode: string;
	assetName: string;
	problemDescription: string;
	statusLabel: string;
	statusTone: MaintenanceTone;
	locationName: string;
	outletName: string;
	reportedAtLabel: string;
};

export type MaintenanceListFilter = {
	search?: string;
	status?: string;
	locationId?: number | null;
	from?: string;
	to?: string;
	page?: number;
	pageSize?: number;
};

export type MaintenanceListResult = {
	items: MaintenanceListItem[];
	page: number;
	pageSize: number;
	total: number;
	filters: { locations: MaintenanceOption[] };
};

export type MaintenancePart = {
	id: number;
	itemId: number;
	itemCode: string;
	itemName: string;
	unitName: string;
	quantity: number;
};

export type MaintenanceTimeline = {
	id: string;
	label: string;
	tone: MaintenanceTone;
	description: string;
	meta: string;
};

export type MaintenanceDetail = {
	id: number;
	maintenanceNumber: string;
	status: MaintenanceStatus;
	statusLabel: string;
	statusTone: MaintenanceTone;
	assetId: number;
	assetCode: string;
	assetName: string;
	assetStatusLabel: string;
	locationName: string;
	outletName: string;
	reportedByName: string;
	problemDescription: string;
	maintenanceType: string;
	maintenanceTypeLabel: string;
	technician: string | null;
	startDateLabel: string | null;
	completionDateLabel: string | null;
	repairDescription: string | null;
	repairCost: string | null;
	vendor: string | null;
	cancelledReason: string | null;
	photoUrl: string | null;
	createdAtLabel: string;
	canSeeCost: boolean;
	canProcess: boolean;
	allowedNext: MaintenanceStatus[];
	parts: MaintenancePart[];
	partOptions: MaintenanceOption[];
	timeline: MaintenanceTimeline[];
	returnDefaults: { startDate: string; completionDate: string };
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

function normalizeCost(value: unknown): string | null {
	const raw = text(value).replace(',', '.');
	if (!raw) return null;
	const parsed = Number(raw);
	if (!Number.isFinite(parsed) || parsed < 0) {
		throw new DomainError('VALIDASI', 'Biaya perbaikan tidak valid.');
	}
	return parsed.toFixed(2);
}

function assertDate(value: string, label: string): string {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
		throw new DomainError('VALIDASI', `${label} tidak valid.`);
	}
	return value;
}

function formatDate(value: string | null | undefined): string | null {
	if (!value) return null;
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

export function maintenanceDefaultDate(): string {
	return todayJakarta();
}

function isStatus(value: string): value is MaintenanceStatus {
	return maintenanceStatusEnum.enumValues.includes(value as MaintenanceStatus);
}

function isType(value: string): value is MaintenanceType {
	return maintenanceTypeEnum.enumValues.includes(value as MaintenanceType);
}

function assertTransition(from: MaintenanceStatus, to: MaintenanceStatus): void {
	assertMaintenanceTransition(from, to);
}

function assertReportPermission(actor: AuthUser): void {
	if (actor.role === 'outlet') {
		assertCan(actor, 'maintenance:report');
		return;
	}
	assertCan(actor, 'maintenance:write');
}

export async function getMaintenanceReportOptions(
	actor: AuthUser
): Promise<MaintenanceReportOptions> {
	assertReportPermission(actor);
	const scope = scopeToUser(actor);

	const rows = await db
		.select({
			id: assets.id,
			assetCode: assets.assetCode,
			name: assets.name,
			status: assets.status,
			locationName: locations.name,
			outletName: outlets.name
		})
		.from(assets)
		.innerJoin(locations, eq(assets.locationId, locations.id))
		.innerJoin(outlets, eq(locations.outletId, outlets.id))
		.where(
			and(
				scope.allOutlets ? undefined : eq(locations.outletId, scope.outletId!),
				inArray(assets.status, ['available', 'in_use', 'damaged'])
			)
		)
		.orderBy(asc(assets.assetCode));

	return {
		assets: rows.map((row) => ({
			id: row.id,
			label: `${row.assetCode} · ${row.name} · ${ASSET_STATUS_LABEL[row.status]}`,
			statusLabel: ASSET_STATUS_LABEL[row.status],
			locationLabel: `${row.outletName} · ${row.locationName}`
		}))
	};
}

async function findExistingMaintenance(submissionId: string): Promise<number | null> {
	const [existing] = await db
		.select({ id: assetMaintenances.id })
		.from(assetMaintenances)
		.where(eq(assetMaintenances.submissionId, submissionId))
		.limit(1);
	return existing?.id ?? null;
}

export async function reportMaintenance(
	actor: AuthUser,
	input: MaintenanceReportInput
): Promise<number> {
	assertReportPermission(actor);
	const assetId = integer(input.assetId, 'Aset', true)!;
	const problemDescription = text(input.problemDescription);
	const maintenanceType = text(input.maintenanceType);
	const submissionId = text(input.submissionId);

	if (!problemDescription) {
		throw new DomainError('VALIDASI', 'Deskripsi masalah wajib diisi.');
	}
	if (!isType(maintenanceType)) {
		throw new DomainError('VALIDASI', 'Jenis maintenance tidak valid.');
	}
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(submissionId)) {
		throw new DomainError('VALIDASI', 'Token idempotensi tidak valid.');
	}

	const existing = await findExistingMaintenance(submissionId);
	if (existing !== null) return existing;

	let photoPath: string | null = null;
	if (input.photo && input.photo.size > 0) {
		photoPath = await saveImageUpload(input.photo);
	}

	try {
		return await db.transaction(async (tx) => {
			const [asset] = await tx
				.select({
					id: assets.id,
					assetCode: assets.assetCode,
					name: assets.name,
					status: assets.status,
					locationId: assets.locationId,
					locationName: locations.name,
					outletId: locations.outletId
				})
				.from(assets)
				.innerJoin(locations, eq(assets.locationId, locations.id))
				.where(eq(assets.id, assetId))
				.limit(1)
				.for('update');

			if (!asset) throw new DomainError('TIDAK_DITEMUKAN', 'Aset tidak ditemukan.');
			if (actor.role === 'outlet' && asset.outletId !== actor.outletId) {
				throw new DomainError('TIDAK_DITEMUKAN', 'Aset tidak ditemukan.');
			}
			if (asset.status === 'disposed') {
				throw new DomainError('VALIDASI', 'Aset disposed tidak dapat dilaporkan.');
			}
			if (asset.status === 'on_loan') {
				throw new DomainError('VALIDASI', 'Aset yang dipinjam tidak dapat dilaporkan rusak.');
			}
			if (asset.status === 'under_maintenance') {
				throw new DomainError('VALIDASI', 'Aset sudah berada dalam maintenance.');
			}

			const previousStatus = asset.status;
			await tx
				.update(assets)
				.set({ status: 'damaged', updatedBy: actor.id, updatedAt: new Date() })
				.where(eq(assets.id, assetId));

			const maintenanceNumber = await nextNumber(tx, 'MNT');
			const [created] = await tx
				.insert(assetMaintenances)
				.values({
					maintenanceNumber,
					assetId,
					reportedBy: actor.id,
					locationId: asset.locationId,
					locationName: asset.locationName,
					problemDescription,
					maintenanceType,
					status: 'reported',
					previousAssetStatus: previousStatus,
					photoPath,
					submissionId
				})
				.returning({ id: assetMaintenances.id });

			await writeAudit(tx, actor, {
				module: 'maintenance',
				action: 'maintenance_reported',
				recordId: String(created.id),
				newValue: {
					maintenanceNumber,
					assetId,
					assetCode: asset.assetCode,
					problemDescription,
					maintenanceType,
					previousAssetStatus: previousStatus,
					photoPath
				}
			});

			return created.id;
		});
	} catch (error) {
		if (photoPath) await deleteStoredUpload(photoPath);
		if (uniqueConstraintName(error) === 'asset_maintenances_submission_unique') {
			const duplicate = await findExistingMaintenance(submissionId);
			if (duplicate !== null) return duplicate;
		}
		throw error;
	}
}

export async function listMaintenances(
	actor: AuthUser,
	filter: MaintenanceListFilter = {}
): Promise<MaintenanceListResult> {
	const scope = scopeToUser(actor);
	const search = text(filter.search);
	const term = `%${search}%`;
	const pageSize = Math.min(100, Math.max(5, filter.pageSize ?? 10));
	const status = filter.status && isStatus(filter.status) ? filter.status : undefined;
	const from = filter.from && /^\d{4}-\d{2}-\d{2}$/.test(filter.from) ? filter.from : null;
	const to = filter.to && /^\d{4}-\d{2}-\d{2}$/.test(filter.to) ? filter.to : null;
	const fromDate = from ? new Date(`${from}T00:00:00+07:00`) : null;
	const toDate = to ? new Date(`${to}T23:59:59.999+07:00`) : null;

	const where = and(
		scope.allOutlets ? undefined : eq(locations.outletId, scope.outletId!),
		status ? eq(assetMaintenances.status, status) : undefined,
		filter.locationId ? eq(assetMaintenances.locationId, filter.locationId) : undefined,
		fromDate ? gte(assetMaintenances.createdAt, fromDate) : undefined,
		toDate ? lte(assetMaintenances.createdAt, toDate) : undefined,
		search
			? or(
					ilike(assetMaintenances.maintenanceNumber, term),
					ilike(assets.assetCode, term),
					ilike(assets.name, term),
					ilike(assetMaintenances.problemDescription, term)
				)
			: undefined
	);

	const [{ total }] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(assetMaintenances)
		.innerJoin(assets, eq(assetMaintenances.assetId, assets.id))
		.innerJoin(locations, eq(assetMaintenances.locationId, locations.id))
		.where(where);

	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const page = Math.min(Math.max(filter.page ?? 1, 1), totalPages);
	const offset = (page - 1) * pageSize;

	const rows = await db
		.select({
			id: assetMaintenances.id,
			maintenanceNumber: assetMaintenances.maintenanceNumber,
			problemDescription: assetMaintenances.problemDescription,
			status: assetMaintenances.status,
			createdAt: assetMaintenances.createdAt,
			assetId: assets.id,
			assetCode: assets.assetCode,
			assetName: assets.name,
			locationName: locations.name,
			outletName: outlets.name
		})
		.from(assetMaintenances)
		.innerJoin(assets, eq(assetMaintenances.assetId, assets.id))
		.innerJoin(locations, eq(assetMaintenances.locationId, locations.id))
		.innerJoin(outlets, eq(locations.outletId, outlets.id))
		.where(where)
		.orderBy(desc(assetMaintenances.createdAt), desc(assetMaintenances.id))
		.limit(pageSize)
		.offset(offset);

	const locationRows = await db
		.select({ id: locations.id, name: locations.name, outletName: outlets.name })
		.from(locations)
		.innerJoin(outlets, eq(locations.outletId, outlets.id))
		.where(
			and(
				eq(locations.isActive, true),
				scope.allOutlets ? undefined : eq(locations.outletId, scope.outletId!)
			)
		)
		.orderBy(asc(outlets.name), asc(locations.name));

	return {
		items: rows.map((row) => ({
			id: row.id,
			maintenanceNumber: row.maintenanceNumber,
			assetId: row.assetId,
			assetCode: row.assetCode,
			assetName: row.assetName,
			problemDescription: row.problemDescription,
			statusLabel: MAINTENANCE_STATUS_LABEL[row.status],
			statusTone: STATUS_TONE[row.status],
			locationName: row.locationName,
			outletName: row.outletName,
			reportedAtLabel: formatDateTime(row.createdAt)
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

export async function getMaintenanceDetail(
	actor: AuthUser,
	id: number
): Promise<MaintenanceDetail> {
	const scope = scopeToUser(actor);
	const [row] = await db
		.select({
			id: assetMaintenances.id,
			maintenanceNumber: assetMaintenances.maintenanceNumber,
			status: assetMaintenances.status,
			problemDescription: assetMaintenances.problemDescription,
			maintenanceType: assetMaintenances.maintenanceType,
			technician: assetMaintenances.technician,
			startDate: assetMaintenances.startDate,
			completionDate: assetMaintenances.completionDate,
			repairDescription: assetMaintenances.repairDescription,
			repairCost: assetMaintenances.repairCost,
			vendor: assetMaintenances.vendor,
			cancelledReason: assetMaintenances.cancelledReason,
			photoPath: assetMaintenances.photoPath,
			createdAt: assetMaintenances.createdAt,
			updatedAt: assetMaintenances.updatedAt,
			assetId: assets.id,
			assetCode: assets.assetCode,
			assetName: assets.name,
			assetStatus: assets.status,
			locationName: locations.name,
			outletName: outlets.name,
			outletId: outlets.id,
			reportedByName: users.fullName
		})
		.from(assetMaintenances)
		.innerJoin(assets, eq(assetMaintenances.assetId, assets.id))
		.innerJoin(locations, eq(assetMaintenances.locationId, locations.id))
		.innerJoin(outlets, eq(locations.outletId, outlets.id))
		.innerJoin(users, eq(assetMaintenances.reportedBy, users.id))
		.where(eq(assetMaintenances.id, id))
		.limit(1);

	if (!row) throw new DomainError('TIDAK_DITEMUKAN', 'Maintenance tidak ditemukan.');
	if (!scope.allOutlets && row.outletId !== scope.outletId) {
		throw new DomainError('TIDAK_DITEMUKAN', 'Maintenance tidak ditemukan.');
	}

	const partRows = await db
		.select({
			id: maintenanceParts.id,
			itemId: inventoryItems.id,
			itemCode: inventoryItems.itemCode,
			itemName: inventoryItems.name,
			unitName: units.abbreviation,
			quantity: maintenanceParts.quantity
		})
		.from(maintenanceParts)
		.innerJoin(inventoryItems, eq(maintenanceParts.itemId, inventoryItems.id))
		.innerJoin(units, eq(inventoryItems.unitId, units.id))
		.where(eq(maintenanceParts.maintenanceId, id))
		.orderBy(asc(maintenanceParts.id));

	const itemRows = await db
		.select({
			id: inventoryItems.id,
			itemCode: inventoryItems.itemCode,
			name: inventoryItems.name,
			unitName: units.abbreviation
		})
		.from(inventoryItems)
		.innerJoin(units, eq(inventoryItems.unitId, units.id))
		.where(eq(inventoryItems.isActive, true))
		.orderBy(asc(inventoryItems.name));

	const canSeeCost = actor.role !== 'outlet';
	const canProcess = actor.role !== 'outlet';

	const timeline: MaintenanceTimeline[] = [
		{
			id: 'reported',
			label: 'Dilaporkan',
			tone: 'warning',
			description: row.problemDescription,
			meta: formatDateTime(row.createdAt)
		}
	];
	if (row.startDate) {
		timeline.push({
			id: 'started',
			label: 'Mulai dikerjakan',
			tone: 'info',
			description: row.technician ? `Teknisi: ${row.technician}` : 'Perbaikan dimulai',
			meta: formatDate(row.startDate) ?? '—'
		});
	}
	if (row.completionDate) {
		timeline.push({
			id: 'completed',
			label: row.status === 'cancelled' ? 'Dibatalkan' : 'Selesai',
			tone: row.status === 'cancelled' ? 'neutral' : 'success',
			description: row.repairDescription ?? row.cancelledReason ?? '—',
			meta: formatDate(row.completionDate) ?? '—'
		});
	}
	timeline.sort((a, b) => a.meta.localeCompare(b.meta));

	return {
		id: row.id,
		maintenanceNumber: row.maintenanceNumber,
		status: row.status,
		statusLabel: MAINTENANCE_STATUS_LABEL[row.status],
		statusTone: STATUS_TONE[row.status],
		assetId: row.assetId,
		assetCode: row.assetCode,
		assetName: row.assetName,
		assetStatusLabel: ASSET_STATUS_LABEL[row.assetStatus],
		locationName: row.locationName,
		outletName: row.outletName,
		reportedByName: row.reportedByName,
		problemDescription: row.problemDescription,
		maintenanceType: row.maintenanceType,
		maintenanceTypeLabel: TYPE_LABEL[row.maintenanceType],
		technician: row.technician,
		startDateLabel: formatDate(row.startDate),
		completionDateLabel: formatDate(row.completionDate),
		repairDescription: row.repairDescription,
		repairCost: canSeeCost ? row.repairCost : null,
		vendor: canSeeCost ? row.vendor : null,
		cancelledReason: row.cancelledReason,
		photoUrl: row.photoPath ? `/maintenance/${row.id}/photo?v=${row.updatedAt.getTime()}` : null,
		createdAtLabel: formatDateTime(row.createdAt),
		canSeeCost,
		canProcess,
		allowedNext: canProcess ? [...MAINTENANCE_TRANSITIONS[row.status]] : [],
		parts: partRows,
		partOptions: itemRows.map((item) => ({
			id: item.id,
			label: `${item.itemCode} · ${item.name} (${item.unitName})`
		})),
		returnDefaults: { startDate: todayJakarta(), completionDate: todayJakarta() },
		timeline
	};
}

export async function startMaintenance(
	actor: AuthUser,
	id: number,
	input: { technician?: string | null; startDate?: string | null }
): Promise<void> {
	assertCan(actor, 'maintenance:write');
	await db.transaction(async (tx) => {
		const [maintenance] = await tx
			.select({
				id: assetMaintenances.id,
				status: assetMaintenances.status,
				assetId: assetMaintenances.assetId,
				previousAssetStatus: assetMaintenances.previousAssetStatus,
				startDate: assetMaintenances.startDate
			})
			.from(assetMaintenances)
			.where(eq(assetMaintenances.id, id))
			.limit(1)
			.for('update');
		if (!maintenance) throw new DomainError('TIDAK_DITEMUKAN', 'Maintenance tidak ditemukan.');
		assertTransition(maintenance.status, 'in_progress');

		const [asset] = await tx
			.select({ id: assets.id, status: assets.status })
			.from(assets)
			.where(eq(assets.id, maintenance.assetId))
			.limit(1)
			.for('update');
		if (!asset) throw new DomainError('TIDAK_DITEMUKAN', 'Aset tidak ditemukan.');

		const startDate = input.startDate
			? assertDate(input.startDate, 'Tanggal mulai')
			: todayJakarta();
		const nextStartDate = maintenance.startDate ?? startDate;

		if (asset.status !== 'under_maintenance') {
			await tx
				.update(assets)
				.set({ status: 'under_maintenance', updatedBy: actor.id, updatedAt: new Date() })
				.where(eq(assets.id, asset.id));
		}

		await tx
			.update(assetMaintenances)
			.set({
				status: 'in_progress',
				technician: optionalText(input.technician) ?? undefined,
				startDate: nextStartDate,
				updatedAt: new Date()
			})
			.where(eq(assetMaintenances.id, id));

		await writeAudit(tx, actor, {
			module: 'maintenance',
			action: 'maintenance_started',
			recordId: String(id),
			previousValue: { status: maintenance.status, assetStatus: asset.status },
			newValue: {
				status: 'in_progress',
				assetStatus: 'under_maintenance',
				startDate: nextStartDate
			}
		});
	});
}

export async function markWaitingParts(actor: AuthUser, id: number): Promise<void> {
	assertCan(actor, 'maintenance:write');
	await db.transaction(async (tx) => {
		const [maintenance] = await tx
			.select({ id: assetMaintenances.id, status: assetMaintenances.status })
			.from(assetMaintenances)
			.where(eq(assetMaintenances.id, id))
			.limit(1)
			.for('update');
		if (!maintenance) throw new DomainError('TIDAK_DITEMUKAN', 'Maintenance tidak ditemukan.');
		assertTransition(maintenance.status, 'waiting_parts');

		await tx
			.update(assetMaintenances)
			.set({ status: 'waiting_parts', updatedAt: new Date() })
			.where(eq(assetMaintenances.id, id));

		await writeAudit(tx, actor, {
			module: 'maintenance',
			action: 'maintenance_waiting_parts',
			recordId: String(id),
			previousValue: { status: maintenance.status },
			newValue: { status: 'waiting_parts' }
		});
	});
}

export type MaintenancePartInput = { itemId: number; quantity: number };

export async function completeMaintenance(
	actor: AuthUser,
	id: number,
	input: {
		completionDate: string;
		repairDescription: string;
		repairCost: string | null;
		vendor: string | null;
		parts: MaintenancePartInput[];
	}
): Promise<void> {
	assertCan(actor, 'maintenance:write');
	const completionDate = assertDate(text(input.completionDate), 'Tanggal selesai');
	const repairDescription = text(input.repairDescription);
	if (!repairDescription) {
		throw new DomainError('VALIDASI', 'Deskripsi perbaikan wajib diisi.');
	}
	const repairCost = normalizeCost(input.repairCost);

	const partMap = new Map<number, number>();
	for (const part of input.parts) {
		if (!Number.isInteger(part.quantity) || part.quantity <= 0) {
			throw new DomainError('VALIDASI', 'Jumlah spare part harus lebih dari 0.');
		}
		if (partMap.has(part.itemId)) {
			throw new DomainError('VALIDASI', 'Item spare part tidak boleh duplikat.');
		}
		partMap.set(part.itemId, part.quantity);
	}

	await db.transaction(async (tx) => {
		const [maintenance] = await tx
			.select({
				id: assetMaintenances.id,
				maintenanceNumber: assetMaintenances.maintenanceNumber,
				status: assetMaintenances.status,
				assetId: assetMaintenances.assetId,
				locationId: assetMaintenances.locationId,
				previousAssetStatus: assetMaintenances.previousAssetStatus
			})
			.from(assetMaintenances)
			.where(eq(assetMaintenances.id, id))
			.limit(1)
			.for('update');
		if (!maintenance) throw new DomainError('TIDAK_DITEMUKAN', 'Maintenance tidak ditemukan.');
		assertTransition(maintenance.status, 'completed');

		const [asset] = await tx
			.select({ id: assets.id, status: assets.status })
			.from(assets)
			.where(eq(assets.id, maintenance.assetId))
			.limit(1)
			.for('update');
		if (!asset) throw new DomainError('TIDAK_DITEMUKAN', 'Aset tidak ditemukan.');

		const partEntries = [...partMap.entries()].sort((a, b) => a[0] - b[0]);
		let documentId: number | null = null;
		let documentNumber: string | null = null;

		if (partEntries.length > 0) {
			const [document] = await tx
				.insert(stockDocuments)
				.values({
					documentNumber: `TMP-${randomUUID()}`,
					documentType: 'stock_out',
					sourceLocationId: maintenance.locationId,
					reason: `Spare part maintenance ${maintenance.maintenanceNumber}`,
					referenceType: 'maintenance',
					referenceId: id,
					performedBy: actor.id,
					submissionId: randomUUID()
				})
				.returning({ id: stockDocuments.id });
			documentId = document.id;
			const year = YEAR_FORMAT.format(new Date());
			documentNumber = `STO-${year}-${String(document.id).padStart(4, '0')}`;
			await tx
				.update(stockDocuments)
				.set({ documentNumber })
				.where(eq(stockDocuments.id, document.id));

			for (const [itemId, quantity] of partEntries) {
				const [balance] = await tx
					.select({ qty: stockBalances.qty })
					.from(stockBalances)
					.where(
						and(
							eq(stockBalances.itemId, itemId),
							eq(stockBalances.locationId, maintenance.locationId)
						)
					)
					.limit(1)
					.for('update');
				const available = balance?.qty ?? 0;
				if (available < quantity) {
					throw new DomainError(
						'STOK_TIDAK_CUKUP',
						`Stok spare part tidak mencukupi. Tersedia ${available}, diminta ${quantity}.`
					);
				}

				if (balance) {
					await tx
						.update(stockBalances)
						.set({ qty: available - quantity, updatedAt: new Date() })
						.where(
							and(
								eq(stockBalances.itemId, itemId),
								eq(stockBalances.locationId, maintenance.locationId)
							)
						);
				}

				const [transaction] = await tx
					.insert(stockTransactions)
					.values({
						documentId: document.id,
						itemId,
						locationId: maintenance.locationId,
						transactionType: 'stock_out',
						signedQty: -quantity,
						notes: `Spare part ${maintenance.maintenanceNumber}`
					})
					.returning({ id: stockTransactions.id });

				await tx.insert(maintenanceParts).values({
					maintenanceId: id,
					itemId,
					quantity,
					stockTransactionId: transaction.id
				});
			}

			await writeAudit(tx, actor, {
				module: 'stock',
				action: 'stock_out_created',
				recordId: String(document.id),
				newValue: {
					documentNumber,
					maintenanceId: id,
					parts: partEntries.map(([itemId, quantity]) => ({ itemId, quantity }))
				}
			});
		}

		const restoreStatus = (maintenance.previousAssetStatus ?? 'available') as AssetStatus;
		await tx
			.update(assets)
			.set({ status: restoreStatus, updatedBy: actor.id, updatedAt: new Date() })
			.where(eq(assets.id, maintenance.assetId));

		await tx
			.update(assetMaintenances)
			.set({
				status: 'completed',
				completionDate,
				repairDescription,
				repairCost,
				vendor: optionalText(input.vendor),
				updatedAt: new Date()
			})
			.where(eq(assetMaintenances.id, id));

		await writeAudit(tx, actor, {
			module: 'maintenance',
			action: 'maintenance_completed',
			recordId: String(id),
			previousValue: { status: maintenance.status, assetStatus: asset.status },
			newValue: {
				status: 'completed',
				assetStatus: restoreStatus,
				completionDate,
				repairDescription,
				repairCost,
				vendor: optionalText(input.vendor),
				parts: partEntries.map(([itemId, quantity]) => ({ itemId, quantity })),
				documentId,
				documentNumber
			}
		});
	});
}

export async function cancelMaintenance(
	actor: AuthUser,
	id: number,
	reason: string
): Promise<void> {
	assertCan(actor, 'maintenance:write');
	const cancelledReason = text(reason);
	if (!cancelledReason) {
		throw new DomainError('VALIDASI', 'Alasan pembatalan wajib diisi.');
	}

	await db.transaction(async (tx) => {
		const [maintenance] = await tx
			.select({
				id: assetMaintenances.id,
				status: assetMaintenances.status,
				assetId: assetMaintenances.assetId,
				previousAssetStatus: assetMaintenances.previousAssetStatus
			})
			.from(assetMaintenances)
			.where(eq(assetMaintenances.id, id))
			.limit(1)
			.for('update');
		if (!maintenance) throw new DomainError('TIDAK_DITEMUKAN', 'Maintenance tidak ditemukan.');
		assertTransition(maintenance.status, 'cancelled');

		const [asset] = await tx
			.select({ id: assets.id, status: assets.status })
			.from(assets)
			.where(eq(assets.id, maintenance.assetId))
			.limit(1)
			.for('update');
		if (!asset) throw new DomainError('TIDAK_DITEMUKAN', 'Aset tidak ditemukan.');

		const restoreStatus = (maintenance.previousAssetStatus ?? 'available') as AssetStatus;
		await tx
			.update(assets)
			.set({ status: restoreStatus, updatedBy: actor.id, updatedAt: new Date() })
			.where(eq(assets.id, maintenance.assetId));

		await tx
			.update(assetMaintenances)
			.set({
				status: 'cancelled',
				cancelledReason,
				completionDate: todayJakarta(),
				updatedAt: new Date()
			})
			.where(eq(assetMaintenances.id, id));

		await writeAudit(tx, actor, {
			module: 'maintenance',
			action: 'maintenance_cancelled',
			recordId: String(id),
			previousValue: { status: maintenance.status, assetStatus: asset.status },
			newValue: { status: 'cancelled', assetStatus: restoreStatus, cancelledReason }
		});
	});
}

export async function getMaintenancePhotoPath(actor: AuthUser, id: number): Promise<string> {
	const scope = scopeToUser(actor);
	const [row] = await db
		.select({
			photoPath: assetMaintenances.photoPath,
			outletId: outlets.id
		})
		.from(assetMaintenances)
		.innerJoin(locations, eq(assetMaintenances.locationId, locations.id))
		.innerJoin(outlets, eq(locations.outletId, outlets.id))
		.where(eq(assetMaintenances.id, id))
		.limit(1);

	if (!row || !row.photoPath) {
		throw new DomainError('TIDAK_DITEMUKAN', 'Foto maintenance tidak ditemukan.');
	}
	if (!scope.allOutlets && row.outletId !== scope.outletId) {
		throw new DomainError('TIDAK_DITEMUKAN', 'Foto maintenance tidak ditemukan.');
	}
	return row.photoPath;
}
