import { and, asc, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import type { ResolvedPathname } from '$app/types';
import { writeAudit } from '#lib/server/audit.js';
import { assertCan, assertInScope, scopeToUser, type Scope } from '#lib/server/auth/permissions.js';
import type { AuthUser } from '#lib/server/auth/session.js';
import { db } from '#lib/server/db/index.js';
import { isUniqueViolation, uniqueConstraintName } from '#lib/server/db/errors.js';
import {
	assetCategories,
	assetConditions,
	assetLoans,
	assetMaintenances,
	assetMovements,
	assetModels,
	assetStatusEnum,
	assets,
	brands,
	employees,
	locations,
	outlets,
	users
} from '#lib/server/db/schema/index.js';
import {
	ASSET_STATUS_LABEL,
	ASSET_STATUS_TONE,
	ASSET_TRANSITIONS,
	type AssetStatus
} from '#lib/server/domain/transitions.js';
import { DomainError } from '#lib/server/errors.js';
import { MESSAGES } from '#lib/messages.js';
import { deleteStoredUpload, saveImageUpload } from '#lib/server/files.js';

export type AssetBadgeTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

export type AssetSelectOption = {
	id: number;
	label: string;
	categoryId?: number | null;
	brandId?: number | null;
	outletId?: number | null;
};

export type AssetFormOptions = {
	categories: AssetSelectOption[];
	brands: AssetSelectOption[];
	models: AssetSelectOption[];
	locations: AssetSelectOption[];
	conditions: AssetSelectOption[];
};

export type AssetFilterOptions = {
	categories: AssetSelectOption[];
	locations: AssetSelectOption[];
};

export type AssetListItem = {
	id: number;
	assetCode: string;
	name: string;
	serialNumber: string | null;
	categoryName: string;
	brandName: string | null;
	modelName: string | null;
	locationName: string;
	outletName: string;
	conditionName: string;
	status: AssetStatus;
	statusLabel: string;
	statusTone: AssetBadgeTone;
	canEdit: boolean;
};

export type AssetListFilter = {
	search?: string;
	categoryId?: number | null;
	locationId?: number | null;
	status?: string;
	page?: number;
	pageSize?: number;
};

export type AssetListResult = {
	items: AssetListItem[];
	page: number;
	pageSize: number;
	total: number;
	filters: AssetFilterOptions;
};

export type AssetInput = {
	assetCode: string;
	name: string;
	categoryId: number | null;
	brandId: number | null;
	modelId: number | null;
	serialNumber: string | null;
	purchaseDate: string | null;
	warrantyExpiration: string | null;
	acquisitionSource: string | null;
	acquisitionCost: string | null;
	locationId: number | null;
	conditionId: number | null;
	description: string | null;
	updatedAt?: string | null;
};

export type AssetHistoryEntry = {
	id: string;
	type: 'movement' | 'maintenance' | 'borrowing';
	typeLabel: string;
	tone: AssetBadgeTone;
	title: string;
	description: string;
	meta: string;
	date: string;
};

export type AssetHistory = {
	movements: AssetHistoryEntry[];
	maintenances: AssetHistoryEntry[];
	loans: AssetHistoryEntry[];
	timeline: AssetHistoryEntry[];
	counts: { movements: number; maintenances: number; loans: number };
};

export type AssetDetail = {
	id: number;
	assetCode: string;
	name: string;
	categoryId: number;
	brandId: number | null;
	modelId: number | null;
	locationId: number;
	conditionId: number;
	categoryName: string;
	brandName: string | null;
	modelName: string | null;
	serialNumber: string | null;
	purchaseDate: string | null;
	warrantyExpiration: string | null;
	acquisitionSource: string | null;
	acquisitionCost: string | null;
	description: string | null;
	locationName: string;
	locationLabel: string;
	outletName: string;
	assignedEmployeeName: string | null;
	conditionName: string;
	status: AssetStatus;
	statusLabel: string;
	statusTone: AssetBadgeTone;
	photoUrl: string | null;
	createdAt: string;
	updatedAt: string;
	updatedAtIso: string;
};

export type AssetActionFlags = {
	edit: boolean;
	assign: boolean;
	mutate: boolean;
	borrow: boolean;
	maintain: boolean;
	dispose: boolean;
};

export type AssetTabKey = 'ringkasan' | 'mutasi' | 'maintenance' | 'peminjaman' | 'riwayat';
export type AssetHistoryType = 'all' | 'movement' | 'maintenance' | 'borrowing';

export type AssetDetailResult = {
	asset: AssetDetail;
	history: AssetHistory;
	actions: AssetActionFlags;
	canSeeCost: boolean;
	activeTab: AssetTabKey;
	historyType: AssetHistoryType;
	tabs: { key: AssetTabKey; label: string; href: ResolvedPathname; count?: number }[];
	historyFilters: { key: AssetHistoryType; label: string; href: ResolvedPathname }[];
};

export type AssetEditResult = {
	asset: AssetDetail;
	canSeeCost: boolean;
	readOnly: boolean;
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

function toHref(path: string): ResolvedPathname {
	return path as ResolvedPathname;
}

function formatDateTime(value: Date | string | null | undefined): string {
	if (!value) return '—';
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? '—' : DATE_TIME_FORMAT.format(date);
}

function formatDate(value: string | Date | null | undefined): string {
	if (!value) return '—';
	const date = value instanceof Date ? value : new Date(`${value}T00:00:00+07:00`);
	return Number.isNaN(date.getTime()) ? '—' : DATE_FORMAT.format(date);
}

function statusLabel(status: AssetStatus): string {
	return ASSET_STATUS_LABEL[status];
}

function outletCondition(scope: Scope): SQL | undefined {
	return scope.allOutlets ? undefined : eq(locations.outletId, scope.outletId!);
}

function isAssetStatus(value: string | undefined): value is AssetStatus {
	return Boolean(value) && assetStatusEnum.enumValues.includes(value as AssetStatus);
}

function isAssetTab(value: string | null): value is AssetTabKey {
	return (
		value === 'ringkasan' ||
		value === 'mutasi' ||
		value === 'maintenance' ||
		value === 'peminjaman' ||
		value === 'riwayat'
	);
}

function isHistoryType(value: string | null): value is AssetHistoryType {
	return (
		value === 'all' || value === 'movement' || value === 'maintenance' || value === 'borrowing'
	);
}

function text(value: unknown): string {
	return String(value ?? '').trim();
}

function optionalText(value: unknown): string | null {
	const result = text(value);
	return result.length > 0 ? result : null;
}

function assertDate(value: string | null, label: string): void {
	if (!value) return;
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
		throw new DomainError('VALIDASI', `${label} tidak valid.`);
	}
}

function normalizeCost(value: unknown): string | null {
	const raw = text(value).replace(',', '.');
	if (!raw) return null;
	const parsed = Number(raw);
	if (!Number.isFinite(parsed) || parsed < 0) {
		throw new DomainError('VALIDASI', 'Biaya perolehan tidak valid.');
	}
	return parsed.toFixed(2);
}

function duplicateError(error: unknown): DomainError {
	const constraint = uniqueConstraintName(error);
	if (constraint === 'assets_code_unique') {
		return new DomainError('DUPLIKAT', MESSAGES.duplicate('Asset Code'));
	}
	if (constraint === 'assets_serial_unique') {
		return new DomainError('DUPLIKAT', MESSAGES.duplicate('Serial number'));
	}
	return new DomainError('DUPLIKAT', 'Asset Code atau serial number sudah digunakan.');
}

function normalizeInput(input: AssetInput, mode: 'create' | 'edit') {
	const assetCode = text(input.assetCode);
	const name = text(input.name);
	const categoryId = input.categoryId;
	const locationId = input.locationId;
	const conditionId = input.conditionId;
	const purchaseDate = optionalText(input.purchaseDate);
	const warrantyExpiration = optionalText(input.warrantyExpiration);

	if (!assetCode) throw new DomainError('VALIDASI', 'Asset Code wajib diisi.');
	if (!name) throw new DomainError('VALIDASI', 'Nama aset wajib diisi.');
	if (categoryId === null) throw new DomainError('VALIDASI', 'Kategori aset wajib dipilih.');
	if (conditionId === null) throw new DomainError('VALIDASI', 'Kondisi aset wajib dipilih.');
	if (mode === 'create' && locationId === null) {
		throw new DomainError('VALIDASI', 'Lokasi wajib dipilih.');
	}

	assertDate(purchaseDate, 'Tanggal pembelian');
	assertDate(warrantyExpiration, 'Tanggal garansi');

	return {
		assetCode,
		name,
		categoryId,
		brandId: input.brandId,
		modelId: input.modelId,
		serialNumber: optionalText(input.serialNumber),
		purchaseDate,
		warrantyExpiration,
		acquisitionSource: optionalText(input.acquisitionSource),
		acquisitionCost: normalizeCost(input.acquisitionCost),
		locationId,
		conditionId,
		description: optionalText(input.description)
	};
}

async function assertReferences(input: ReturnType<typeof normalizeInput>): Promise<void> {
	const [category] = await db
		.select({ id: assetCategories.id, isActive: assetCategories.isActive })
		.from(assetCategories)
		.where(eq(assetCategories.id, input.categoryId))
		.limit(1);
	if (!category || !category.isActive) {
		throw new DomainError('VALIDASI', 'Kategori aset tidak ditemukan atau nonaktif.');
	}

	const [condition] = await db
		.select({ id: assetConditions.id, isActive: assetConditions.isActive })
		.from(assetConditions)
		.where(eq(assetConditions.id, input.conditionId!))
		.limit(1);
	if (!condition || !condition.isActive) {
		throw new DomainError('VALIDASI', 'Kondisi aset tidak ditemukan atau nonaktif.');
	}

	if (input.locationId !== null) {
		const [location] = await db
			.select({ id: locations.id, isActive: locations.isActive })
			.from(locations)
			.where(eq(locations.id, input.locationId))
			.limit(1);
		if (!location || !location.isActive) {
			throw new DomainError('VALIDASI', 'Lokasi tidak ditemukan atau nonaktif.');
		}
	}

	if (input.brandId !== null) {
		const [brand] = await db
			.select({ id: brands.id, isActive: brands.isActive })
			.from(brands)
			.where(eq(brands.id, input.brandId))
			.limit(1);
		if (!brand) throw new DomainError('VALIDASI', 'Brand tidak ditemukan.');
	}

	if (input.modelId !== null) {
		const [model] = await db
			.select({
				id: assetModels.id,
				categoryId: assetModels.categoryId,
				brandId: assetModels.brandId,
				isActive: assetModels.isActive
			})
			.from(assetModels)
			.where(eq(assetModels.id, input.modelId))
			.limit(1);
		if (!model || !model.isActive) {
			throw new DomainError('VALIDASI', 'Model tidak ditemukan atau nonaktif.');
		}
		if (model.categoryId !== input.categoryId) {
			throw new DomainError('VALIDASI', 'Model tidak sesuai dengan kategori aset.');
		}
		if (input.brandId !== null && model.brandId !== input.brandId) {
			throw new DomainError('VALIDASI', 'Model tidak sesuai dengan brand yang dipilih.');
		}
	}
}

function buildTimeline(
	movements: AssetHistoryEntry[],
	maintenances: AssetHistoryEntry[],
	loans: AssetHistoryEntry[]
): AssetHistoryEntry[] {
	return [...movements, ...maintenances, ...loans].sort((a, b) => b.date.localeCompare(a.date));
}

export async function getAssetFormOptions(actor: AuthUser): Promise<AssetFormOptions> {
	const scope = scopeToUser(actor);
	assertCan(actor, 'asset:write');

	const [categoryRows, brandRows, modelRows, locationRows, conditionRows] = await Promise.all([
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
			.select({ id: locations.id, name: locations.name, outletName: outlets.name })
			.from(locations)
			.innerJoin(outlets, eq(locations.outletId, outlets.id))
			.where(and(eq(locations.isActive, true), outletCondition(scope)))
			.orderBy(asc(outlets.name), asc(locations.name)),
		db
			.select({ id: assetConditions.id, name: assetConditions.name })
			.from(assetConditions)
			.where(eq(assetConditions.isActive, true))
			.orderBy(asc(assetConditions.name))
	]);

	return {
		categories: categoryRows.map((row) => ({ id: row.id, label: row.name })),
		brands: brandRows.map((row) => ({ id: row.id, label: row.name })),
		models: modelRows.map((row) => ({
			id: row.id,
			label: row.name,
			categoryId: row.categoryId,
			brandId: row.brandId
		})),
		locations: locationRows.map((row) => ({
			id: row.id,
			label: `${row.outletName} · ${row.name}`
		})),
		conditions: conditionRows.map((row) => ({ id: row.id, label: row.name }))
	};
}

export async function listAssets(
	actor: AuthUser,
	filter: AssetListFilter = {}
): Promise<AssetListResult> {
	const scope = scopeToUser(actor);
	const search = text(filter.search);
	const term = `%${search}%`;
	const pageSize = Math.min(100, Math.max(5, filter.pageSize ?? 10));
	const categoryId = filter.categoryId ?? null;
	const locationId = filter.locationId ?? null;
	const status = isAssetStatus(filter.status) ? filter.status : undefined;

	const where = and(
		outletCondition(scope),
		search
			? or(
					ilike(assets.assetCode, term),
					ilike(assets.name, term),
					ilike(assets.serialNumber, term)
				)
			: undefined,
		categoryId !== null ? eq(assets.categoryId, categoryId) : undefined,
		locationId !== null ? eq(assets.locationId, locationId) : undefined,
		status ? eq(assets.status, status) : undefined
	);

	const [{ total }] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(assets)
		.innerJoin(locations, eq(assets.locationId, locations.id))
		.where(where);

	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const page = Math.min(Math.max(filter.page ?? 1, 1), totalPages);
	const offset = (page - 1) * pageSize;

	const rows = await db
		.select({
			id: assets.id,
			assetCode: assets.assetCode,
			name: assets.name,
			serialNumber: assets.serialNumber,
			categoryName: assetCategories.name,
			brandName: brands.name,
			modelName: assetModels.name,
			locationName: locations.name,
			outletName: outlets.name,
			conditionName: assetConditions.name,
			status: assets.status
		})
		.from(assets)
		.innerJoin(assetCategories, eq(assets.categoryId, assetCategories.id))
		.innerJoin(locations, eq(assets.locationId, locations.id))
		.innerJoin(outlets, eq(locations.outletId, outlets.id))
		.innerJoin(assetConditions, eq(assets.conditionId, assetConditions.id))
		.leftJoin(brands, eq(assets.brandId, brands.id))
		.leftJoin(assetModels, eq(assets.modelId, assetModels.id))
		.where(where)
		.orderBy(asc(assets.assetCode))
		.limit(pageSize)
		.offset(offset);

	const [categoryRows, locationRows] = await Promise.all([
		db
			.select({ id: assetCategories.id, name: assetCategories.name })
			.from(assetCategories)
			.where(eq(assetCategories.isActive, true))
			.orderBy(asc(assetCategories.name)),
		db
			.select({ id: locations.id, name: locations.name, outletName: outlets.name })
			.from(locations)
			.innerJoin(outlets, eq(locations.outletId, outlets.id))
			.where(and(eq(locations.isActive, true), outletCondition(scope)))
			.orderBy(asc(outlets.name), asc(locations.name))
	]);

	return {
		items: rows.map((row) => ({
			...row,
			statusLabel: statusLabel(row.status),
			statusTone: ASSET_STATUS_TONE[row.status],
			canEdit: actor.role !== 'outlet' && row.status !== 'disposed'
		})),
		page,
		pageSize,
		total,
		filters: {
			categories: categoryRows.map((row) => ({ id: row.id, label: row.name })),
			locations: locationRows.map((row) => ({
				id: row.id,
				label: `${row.outletName} · ${row.name}`,
				outletId: null
			}))
		}
	};
}

export async function getAssetDetail(
	actor: AuthUser,
	id: number,
	options: { tab?: string | null; historyType?: string | null } = {}
): Promise<AssetDetailResult> {
	const [row] = await db
		.select({
			id: assets.id,
			assetCode: assets.assetCode,
			name: assets.name,
			serialNumber: assets.serialNumber,
			purchaseDate: assets.purchaseDate,
			warrantyExpiration: assets.warrantyExpiration,
			acquisitionSource: assets.acquisitionSource,
			acquisitionCost: assets.acquisitionCost,
			description: assets.description,
			photoPath: assets.photoPath,
			status: assets.status,
			categoryId: assets.categoryId,
			brandId: assets.brandId,
			modelId: assets.modelId,
			locationId: assets.locationId,
			conditionId: assets.conditionId,
			createdAt: assets.createdAt,
			updatedAt: assets.updatedAt,
			categoryName: assetCategories.name,
			brandName: brands.name,
			modelName: assetModels.name,
			locationName: locations.name,
			outletId: locations.outletId,
			outletName: outlets.name,
			employeeName: employees.fullName,
			conditionName: assetConditions.name
		})
		.from(assets)
		.innerJoin(assetCategories, eq(assets.categoryId, assetCategories.id))
		.innerJoin(locations, eq(assets.locationId, locations.id))
		.innerJoin(outlets, eq(locations.outletId, outlets.id))
		.innerJoin(assetConditions, eq(assets.conditionId, assetConditions.id))
		.leftJoin(brands, eq(assets.brandId, brands.id))
		.leftJoin(assetModels, eq(assets.modelId, assetModels.id))
		.leftJoin(employees, eq(assets.assignedEmployeeId, employees.id))
		.where(eq(assets.id, id))
		.limit(1);

	if (!row) throw new DomainError('TIDAK_DITEMUKAN', 'Aset tidak ditemukan.');
	assertInScope(actor, { outletId: row.outletId });
	assertCan(actor, 'asset:read', { outletId: row.outletId });

	const movementRows = await db
		.select({
			id: assetMovements.id,
			movementType: assetMovements.movementType,
			movementDate: assetMovements.movementDate,
			fromLocationName: assetMovements.fromLocationName,
			toLocationName: assetMovements.toLocationName,
			fromEmployeeName: assetMovements.fromEmployeeName,
			toEmployeeName: assetMovements.toEmployeeName,
			reason: assetMovements.reason,
			performedByName: users.fullName
		})
		.from(assetMovements)
		.leftJoin(users, eq(assetMovements.performedBy, users.id))
		.where(eq(assetMovements.assetId, id))
		.orderBy(desc(assetMovements.movementDate));

	const movementEntries: AssetHistoryEntry[] = movementRows.map((entry) => {
		const isAssignment = entry.movementType === 'assignment';
		const from = entry.fromLocationName ?? entry.fromEmployeeName ?? '—';
		const to = entry.toLocationName ?? entry.toEmployeeName ?? '—';
		return {
			id: `movement-${entry.id}`,
			type: 'movement',
			typeLabel: isAssignment ? 'Penempatan' : 'Mutasi',
			tone: isAssignment ? 'info' : 'warning',
			title: `${isAssignment ? 'Penempatan' : 'Mutasi'} · ${from} → ${to}`,
			description: entry.reason ?? '',
			meta: `${formatDateTime(entry.movementDate)}${entry.performedByName ? ` · ${entry.performedByName}` : ''}`,
			date: entry.movementDate.toISOString()
		};
	});

	const maintenanceRows = await db
		.select({
			id: assetMaintenances.id,
			maintenanceNumber: assetMaintenances.maintenanceNumber,
			status: assetMaintenances.status,
			problemDescription: assetMaintenances.problemDescription,
			technician: assetMaintenances.technician,
			startDate: assetMaintenances.startDate,
			completionDate: assetMaintenances.completionDate,
			repairDescription: assetMaintenances.repairDescription,
			createdAt: assetMaintenances.createdAt
		})
		.from(assetMaintenances)
		.where(eq(assetMaintenances.assetId, id))
		.orderBy(desc(assetMaintenances.createdAt));

	const maintenanceLabels: Record<string, { label: string; tone: AssetBadgeTone }> = {
		reported: { label: 'Dilaporkan', tone: 'warning' },
		in_progress: { label: 'Dikerjakan', tone: 'info' },
		waiting_parts: { label: 'Menunggu sparepart', tone: 'warning' },
		completed: { label: 'Selesai', tone: 'success' },
		cancelled: { label: 'Dibatalkan', tone: 'neutral' }
	};

	const maintenanceEntries: AssetHistoryEntry[] = maintenanceRows.map((entry) => {
		const badge = maintenanceLabels[entry.status] ?? { label: entry.status, tone: 'neutral' };
		const description = entry.repairDescription ?? entry.problemDescription;
		return {
			id: `maintenance-${entry.id}`,
			type: 'maintenance',
			typeLabel: badge.label,
			tone: badge.tone,
			title: `${entry.maintenanceNumber} · ${entry.problemDescription}`,
			description: entry.technician ? `${description} · Teknisi: ${entry.technician}` : description,
			meta: `${formatDateTime(entry.createdAt)}${entry.completionDate ? ` · Selesai ${formatDate(entry.completionDate)}` : entry.startDate ? ` · Mulai ${formatDate(entry.startDate)}` : ''}`,
			date: entry.createdAt.toISOString()
		};
	});

	const loanRows = await db
		.select({
			id: assetLoans.id,
			loanNumber: assetLoans.loanNumber,
			borrowerName: assetLoans.borrowerName,
			borrowingDate: assetLoans.borrowingDate,
			expectedReturnDate: assetLoans.expectedReturnDate,
			actualReturnDate: assetLoans.actualReturnDate,
			status: assetLoans.status,
			createdAt: assetLoans.createdAt
		})
		.from(assetLoans)
		.where(eq(assetLoans.assetId, id))
		.orderBy(desc(assetLoans.createdAt));

	const loanEntries: AssetHistoryEntry[] = loanRows.map((entry) => {
		const overdue =
			entry.status === 'borrowed' &&
			entry.expectedReturnDate < new Date().toISOString().slice(0, 10);
		const label: { text: string; tone: AssetBadgeTone } =
			entry.status === 'returned'
				? { text: 'Dikembalikan', tone: 'success' }
				: entry.status === 'cancelled'
					? { text: 'Dibatalkan', tone: 'neutral' }
					: {
							text: overdue ? 'Terlambat' : 'Dipinjam',
							tone: overdue ? 'danger' : 'warning'
						};
		return {
			id: `loan-${entry.id}`,
			type: 'borrowing',
			typeLabel: label.text,
			tone: label.tone,
			title: `${entry.loanNumber} · ${entry.borrowerName}`,
			description: `Dipinjam ${formatDate(entry.borrowingDate)} · jatuh tempo ${formatDate(entry.expectedReturnDate)}${entry.actualReturnDate ? ` · kembali ${formatDate(entry.actualReturnDate)}` : ''}`,
			meta: formatDateTime(entry.createdAt),
			date: entry.createdAt.toISOString()
		};
	});

	const timeline = buildTimeline(movementEntries, maintenanceEntries, loanEntries);
	const tabCandidate = options.tab ?? null;
	const requestedTab: AssetTabKey = isAssetTab(tabCandidate) ? tabCandidate : 'ringkasan';
	const typeCandidate = options.historyType ?? null;
	const historyType: AssetHistoryType = isHistoryType(typeCandidate) ? typeCandidate : 'all';

	const history: AssetHistory = {
		movements: movementEntries,
		maintenances: maintenanceEntries,
		loans: loanEntries,
		timeline:
			historyType === 'all' ? timeline : timeline.filter((entry) => entry.type === historyType),
		counts: {
			movements: movementEntries.length,
			maintenances: maintenanceEntries.length,
			loans: loanEntries.length
		}
	};

	const canSeeCost = actor.role !== 'outlet';
	const canWrite = actor.role !== 'outlet';
	const transitions = ASSET_TRANSITIONS[row.status];
	const base = `/assets/${row.id}`;

	return {
		asset: {
			id: row.id,
			assetCode: row.assetCode,
			name: row.name,
			categoryId: row.categoryId,
			brandId: row.brandId,
			modelId: row.modelId,
			locationId: row.locationId,
			conditionId: row.conditionId,
			categoryName: row.categoryName,
			brandName: row.brandName,
			modelName: row.modelName,
			serialNumber: row.serialNumber,
			purchaseDate: row.purchaseDate,
			warrantyExpiration: row.warrantyExpiration,
			acquisitionSource: row.acquisitionSource,
			acquisitionCost: canSeeCost ? row.acquisitionCost : null,
			description: row.description,
			locationName: row.locationName,
			locationLabel: `${row.outletName} · ${row.locationName}`,
			outletName: row.outletName,
			assignedEmployeeName: row.employeeName,
			conditionName: row.conditionName,
			status: row.status,
			statusLabel: statusLabel(row.status),
			statusTone: ASSET_STATUS_TONE[row.status],
			photoUrl: row.photoPath ? `${base}/photo?v=${row.updatedAt.getTime()}` : null,
			createdAt: formatDateTime(row.createdAt),
			updatedAt: formatDateTime(row.updatedAt),
			updatedAtIso: row.updatedAt.toISOString()
		},
		history,
		actions: {
			edit: canWrite && row.status !== 'disposed',
			assign: canWrite && (row.status === 'available' || row.status === 'in_use'),
			mutate:
				canWrite && ['available', 'in_use', 'under_maintenance', 'damaged'].includes(row.status),
			borrow: canWrite && transitions.includes('on_loan'),
			maintain: canWrite && transitions.includes('under_maintenance'),
			dispose: canWrite && transitions.includes('disposed')
		},
		canSeeCost,
		activeTab: requestedTab,
		historyType,
		tabs: [
			{ key: 'ringkasan', label: 'Ringkasan', href: toHref(`${base}?tab=ringkasan`) },
			{
				key: 'mutasi',
				label: 'Mutasi',
				href: toHref(`${base}?tab=mutasi`),
				count: movementEntries.length
			},
			{
				key: 'maintenance',
				label: 'Maintenance',
				href: toHref(`${base}?tab=maintenance`),
				count: maintenanceEntries.length
			},
			{
				key: 'peminjaman',
				label: 'Peminjaman',
				href: toHref(`${base}?tab=peminjaman`),
				count: loanEntries.length
			},
			{
				key: 'riwayat',
				label: 'Riwayat',
				href: toHref(`${base}?tab=riwayat`),
				count: timeline.length
			}
		],
		historyFilters: [
			{ key: 'all', label: 'Semua', href: toHref(`${base}?tab=riwayat&jenis=all`) },
			{
				key: 'movement',
				label: 'Mutasi',
				href: toHref(`${base}?tab=riwayat&jenis=movement`)
			},
			{
				key: 'maintenance',
				label: 'Maintenance',
				href: toHref(`${base}?tab=riwayat&jenis=maintenance`)
			},
			{
				key: 'borrowing',
				label: 'Peminjaman',
				href: toHref(`${base}?tab=riwayat&jenis=borrowing`)
			}
		]
	};
}

export async function getAssetForEdit(actor: AuthUser, id: number): Promise<AssetEditResult> {
	const detail = await getAssetDetail(actor, id);
	assertCan(actor, 'asset:write');
	return {
		asset: detail.asset,
		canSeeCost: detail.canSeeCost,
		readOnly: detail.asset.status === 'disposed'
	};
}

export async function getAssetPhotoPath(actor: AuthUser, id: number): Promise<string> {
	const [row] = await db
		.select({ photoPath: assets.photoPath, outletId: locations.outletId })
		.from(assets)
		.innerJoin(locations, eq(assets.locationId, locations.id))
		.where(eq(assets.id, id))
		.limit(1);

	if (!row || !row.photoPath)
		throw new DomainError('TIDAK_DITEMUKAN', 'Foto aset tidak ditemukan.');
	assertInScope(actor, { outletId: row.outletId });
	assertCan(actor, 'asset:read', { outletId: row.outletId });
	return row.photoPath;
}

export async function createAsset(
	actor: AuthUser,
	input: AssetInput,
	photo?: File | null
): Promise<number> {
	assertCan(actor, 'asset:write');
	const normalized = normalizeInput(input, 'create');
	await assertReferences(normalized);

	let photoPath: string | null = null;
	if (photo && photo.size > 0) {
		photoPath = await saveImageUpload(photo);
	}

	try {
		return await db.transaction(async (tx) => {
			const [created] = await tx
				.insert(assets)
				.values({
					assetCode: normalized.assetCode,
					name: normalized.name,
					categoryId: normalized.categoryId!,
					brandId: normalized.brandId,
					modelId: normalized.modelId,
					serialNumber: normalized.serialNumber,
					purchaseDate: normalized.purchaseDate,
					warrantyExpiration: normalized.warrantyExpiration,
					acquisitionSource: normalized.acquisitionSource,
					acquisitionCost: normalized.acquisitionCost,
					locationId: normalized.locationId!,
					conditionId: normalized.conditionId!,
					description: normalized.description,
					photoPath,
					status: 'available',
					createdBy: actor.id,
					updatedBy: actor.id
				})
				.returning({ id: assets.id });

			await writeAudit(tx, actor, {
				module: 'asset',
				action: 'asset_created',
				recordId: String(created.id),
				newValue: {
					assetCode: normalized.assetCode,
					name: normalized.name,
					categoryId: normalized.categoryId,
					locationId: normalized.locationId,
					conditionId: normalized.conditionId,
					status: 'available'
				}
			});

			return created.id;
		});
	} catch (error) {
		if (photoPath) await deleteStoredUpload(photoPath);
		if (isUniqueViolation(error)) throw duplicateError(error);
		throw error;
	}
}

export async function updateAsset(
	actor: AuthUser,
	id: number,
	input: AssetInput,
	photo?: File | null,
	removePhoto = false
): Promise<void> {
	assertCan(actor, 'asset:write');
	const normalized = normalizeInput(input, 'edit');
	await assertReferences(normalized);

	const [target] = await db
		.select({
			id: assets.id,
			assetCode: assets.assetCode,
			name: assets.name,
			categoryId: assets.categoryId,
			brandId: assets.brandId,
			modelId: assets.modelId,
			serialNumber: assets.serialNumber,
			purchaseDate: assets.purchaseDate,
			warrantyExpiration: assets.warrantyExpiration,
			acquisitionSource: assets.acquisitionSource,
			acquisitionCost: assets.acquisitionCost,
			description: assets.description,
			photoPath: assets.photoPath,
			conditionId: assets.conditionId,
			status: assets.status,
			updatedAt: assets.updatedAt
		})
		.from(assets)
		.where(eq(assets.id, id))
		.limit(1);

	if (!target) throw new DomainError('TIDAK_DITEMUKAN', 'Aset tidak ditemukan.');
	if (target.status === 'disposed') {
		throw new DomainError('DILARANG', 'Aset yang sudah disposed tidak dapat diubah.');
	}
	if (input.updatedAt && target.updatedAt.toISOString() !== input.updatedAt) {
		throw new DomainError(
			'KONFLIK',
			'Data aset telah berubah. Muat ulang halaman sebelum menyimpan kembali.'
		);
	}

	let photoPath = target.photoPath;
	let newPhotoPath: string | null = null;
	if (photo && photo.size > 0) {
		newPhotoPath = await saveImageUpload(photo);
		photoPath = newPhotoPath;
	} else if (removePhoto) {
		photoPath = null;
	}

	try {
		await db.transaction(async (tx) => {
			await tx
				.update(assets)
				.set({
					assetCode: normalized.assetCode,
					name: normalized.name,
					categoryId: normalized.categoryId!,
					brandId: normalized.brandId,
					modelId: normalized.modelId,
					serialNumber: normalized.serialNumber,
					purchaseDate: normalized.purchaseDate,
					warrantyExpiration: normalized.warrantyExpiration,
					acquisitionSource: normalized.acquisitionSource,
					acquisitionCost: normalized.acquisitionCost,
					conditionId: normalized.conditionId!,
					description: normalized.description,
					photoPath,
					updatedBy: actor.id,
					updatedAt: new Date()
				})
				.where(eq(assets.id, id));

			await writeAudit(tx, actor, {
				module: 'asset',
				action: 'asset_updated',
				recordId: String(id),
				previousValue: {
					assetCode: target.assetCode,
					name: target.name,
					categoryId: target.categoryId,
					conditionId: target.conditionId,
					photoPath: target.photoPath
				},
				newValue: {
					assetCode: normalized.assetCode,
					name: normalized.name,
					categoryId: normalized.categoryId,
					conditionId: normalized.conditionId,
					photoPath
				}
			});
		});
	} catch (error) {
		if (newPhotoPath) await deleteStoredUpload(newPhotoPath);
		if (isUniqueViolation(error)) throw duplicateError(error);
		throw error;
	}

	if (target.photoPath && target.photoPath !== photoPath) {
		await deleteStoredUpload(target.photoPath);
	}
}
