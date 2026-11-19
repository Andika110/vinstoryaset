import { and, asc, desc, eq, gte, ilike, inArray, lt, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { withAudit } from '#lib/server/audit.js';
import { assertCan, scopeToUser, type Scope } from '#lib/server/auth/permissions.js';
import type { AuthUser } from '#lib/server/auth/session.js';
import { db } from '#lib/server/db/index.js';
import { uniqueConstraintName } from '#lib/server/db/errors.js';
import {
	assetMovements,
	assets,
	departments,
	employees,
	locations,
	outlets,
	users
} from '#lib/server/db/schema/index.js';
import {
	ASSET_STATUS_LABEL,
	assertTransition,
	type AssetStatus
} from '#lib/server/domain/transitions.js';
import { DomainError } from '#lib/server/errors.js';
import { nextNumber } from '#lib/server/document-number.js';
import { requireSubmissionId } from '#lib/server/idempotency.js';

export type AssignmentAssetOption = {
	id: number;
	label: string;
	assetCode: string;
	name: string;
	status: AssetStatus;
	locationId: number;
	locationLabel: string;
	outletId: number;
	outletName: string;
};

export type AssignmentEmployeeOption = {
	id: number;
	label: string;
	outletId: number;
	departmentId: number | null;
};

export type AssignmentLocationOption = {
	id: number;
	label: string;
	outletId: number;
};

export type AssignmentDepartmentOption = {
	id: number;
	label: string;
	outletId: number;
};

export type AssignmentFormOptions = {
	assets: AssignmentAssetOption[];
	employees: AssignmentEmployeeOption[];
	locations: AssignmentLocationOption[];
	departments: AssignmentDepartmentOption[];
};

export type AssignmentInput = {
	assetId: number | null;
	employeeId: number | null;
	departmentId: number | null;
	locationId: number | null;
	assignmentDate: string;
	notes: string | null;
	submissionId: string;
};

export type AssignmentListItem = {
	id: number;
	assetId: number;
	movementNumber: string | null;
	dateLabel: string;
	assetLabel: string;
	assetCode: string;
	fromLabel: string;
	toLabel: string;
	performedByName: string;
	notes: string | null;
};

export type AssignmentListFilter = {
	search?: string;
	locationId?: number | null;
	employeeId?: number | null;
	from?: string;
	to?: string;
	page?: number;
	pageSize?: number;
};

export type AssignmentListResult = {
	items: AssignmentListItem[];
	page: number;
	pageSize: number;
	total: number;
	filters: {
		locations: AssignmentLocationOption[];
		employees: AssignmentEmployeeOption[];
	};
};

const DATE_FORMAT = new Intl.DateTimeFormat('id-ID', {
	dateStyle: 'medium',
	timeZone: 'Asia/Jakarta'
});

const ALLOWED_ASSIGN_STATUS: AssetStatus[] = ['available', 'in_use'];

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

function formatDate(value: Date): string {
	return DATE_FORMAT.format(value);
}

function assertDate(value: string, label: string): string {
	if (!isDateString(value)) {
		throw new DomainError('VALIDASI', `${label} tidak valid.`);
	}
	return value;
}

function isDateString(value: string): boolean {
	return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function dateToTimestamp(value: string): Date {
	return new Date(`${value}T12:00:00+07:00`);
}

function startOfJakartaDay(value: string): Date {
	return new Date(`${value}T00:00:00+07:00`);
}

function addOneDay(value: string): Date {
	const date = startOfJakartaDay(value);
	date.setUTCDate(date.getUTCDate() + 1);
	return date;
}

function todayJakarta(): string {
	return new Intl.DateTimeFormat('en-CA', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		timeZone: 'Asia/Jakarta'
	}).format(new Date());
}

export function assignmentDefaultDate(): string {
	return todayJakarta();
}

function outletCondition(scope: Scope): SQL | undefined {
	return scope.allOutlets ? undefined : eq(locations.outletId, scope.outletId!);
}

function employeeCondition(scope: Scope): SQL | undefined {
	return scope.allOutlets ? undefined : eq(employees.outletId, scope.outletId!);
}

function departmentCondition(scope: Scope): SQL | undefined {
	return scope.allOutlets ? undefined : eq(departments.outletId, scope.outletId!);
}

export async function getAssignmentFormOptions(actor: AuthUser): Promise<AssignmentFormOptions> {
	assertCan(actor, 'asset:write');
	const scope = scopeToUser(actor);

	const [assetRows, employeeRows, locationRows, departmentRows] = await Promise.all([
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
			.where(inArray(assets.status, ALLOWED_ASSIGN_STATUS))
			.orderBy(asc(assets.assetCode)),
		db
			.select({
				id: employees.id,
				fullName: employees.fullName,
				employeeCode: employees.employeeCode,
				outletId: employees.outletId,
				outletName: outlets.name,
				departmentId: employees.departmentId
			})
			.from(employees)
			.innerJoin(outlets, eq(employees.outletId, outlets.id))
			.where(and(eq(employees.isActive, true), employeeCondition(scope)))
			.orderBy(asc(employees.fullName)),
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
			.orderBy(asc(outlets.name), asc(locations.name)),
		db
			.select({
				id: departments.id,
				name: departments.name,
				outletId: departments.outletId,
				outletName: outlets.name
			})
			.from(departments)
			.innerJoin(outlets, eq(departments.outletId, outlets.id))
			.where(and(eq(departments.isActive, true), departmentCondition(scope)))
			.orderBy(asc(outlets.name), asc(departments.name))
	]);

	return {
		assets: assetRows.map((row) => ({
			id: row.id,
			assetCode: row.assetCode,
			name: row.name,
			status: row.status,
			locationId: row.locationId,
			locationLabel: `${row.outletName} · ${row.locationName}`,
			outletId: row.outletId,
			outletName: row.outletName,
			label: `${row.assetCode} · ${row.name} · ${ASSET_STATUS_LABEL[row.status]}`
		})),
		employees: employeeRows.map((row) => ({
			id: row.id,
			label: `${row.outletName} · ${row.fullName} (${row.employeeCode})`,
			outletId: row.outletId,
			departmentId: row.departmentId
		})),
		locations: locationRows.map((row) => ({
			id: row.id,
			label: `${row.outletName} · ${row.name}`,
			outletId: row.outletId
		})),
		departments: departmentRows.map((row) => ({
			id: row.id,
			label: `${row.outletName} · ${row.name}`,
			outletId: row.outletId
		}))
	};
}

async function findExistingAssignment(submissionId: string): Promise<number | null> {
	const [existing] = await db
		.select({ assetId: assetMovements.assetId })
		.from(assetMovements)
		.where(eq(assetMovements.submissionId, submissionId))
		.limit(1);
	return existing?.assetId ?? null;
}

export async function assignAsset(actor: AuthUser, input: AssignmentInput): Promise<number> {
	assertCan(actor, 'asset:write');

	const assetId = integer(input.assetId, 'Aset', true)!;
	const locationId = integer(input.locationId, 'Lokasi', true)!;
	const employeeId = integer(input.employeeId, 'Employee');
	const departmentId = integer(input.departmentId, 'Department');
	const assignmentDate = assertDate(text(input.assignmentDate), 'Tanggal penempatan');
	const submissionId = requireSubmissionId(text(input.submissionId));
	const notes = optionalText(input.notes);

	const existing = await findExistingAssignment(submissionId);
	if (existing !== null) return existing;

	try {
		return await withAudit(actor, async (tx, audit) => {
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
			if (!ALLOWED_ASSIGN_STATUS.includes(asset.status)) {
				throw new DomainError(
					'VALIDASI',
					`Aset berstatus ${ASSET_STATUS_LABEL[asset.status]} tidak dapat ditempatkan.`
				);
			}
			if (asset.locationId === locationId && asset.assignedEmployeeId === employeeId) {
				throw new DomainError('VALIDASI', 'Aset sudah berada di lokasi dan pemegang yang dipilih.');
			}

			const [location] = await tx
				.select({
					id: locations.id,
					name: locations.name,
					outletId: locations.outletId
				})
				.from(locations)
				.where(and(eq(locations.id, locationId), eq(locations.isActive, true)))
				.limit(1);
			if (!location) {
				throw new DomainError('VALIDASI', 'Lokasi tidak ditemukan atau nonaktif.');
			}

			let employee: {
				id: number;
				fullName: string;
				outletId: number;
				departmentId: number | null;
			} | null = null;
			if (employeeId !== null) {
				const [row] = await tx
					.select({
						id: employees.id,
						fullName: employees.fullName,
						outletId: employees.outletId,
						departmentId: employees.departmentId,
						isActive: employees.isActive
					})
					.from(employees)
					.where(eq(employees.id, employeeId))
					.limit(1);
				if (!row || !row.isActive) {
					throw new DomainError('VALIDASI', 'Employee tidak ditemukan atau nonaktif.');
				}
				if (row.outletId !== location.outletId) {
					throw new DomainError(
						'VALIDASI',
						'Employee dan lokasi tujuan harus berada di outlet yang sama.'
					);
				}
				employee = row;
			}

			if (departmentId !== null) {
				const [row] = await tx
					.select({
						outletId: departments.outletId,
						isActive: departments.isActive
					})
					.from(departments)
					.where(eq(departments.id, departmentId))
					.limit(1);
				if (!row || !row.isActive) {
					throw new DomainError('VALIDASI', 'Department tidak ditemukan atau nonaktif.');
				}
				if (row.outletId !== location.outletId) {
					throw new DomainError(
						'VALIDASI',
						'Department dan lokasi tujuan harus berada di outlet yang sama.'
					);
				}
			}

			const [fromLocation] = await tx
				.select({ name: locations.name })
				.from(locations)
				.where(eq(locations.id, asset.locationId))
				.limit(1);
			const [fromEmployee] = asset.assignedEmployeeId
				? await tx
						.select({ name: employees.fullName })
						.from(employees)
						.where(eq(employees.id, asset.assignedEmployeeId))
						.limit(1)
				: [];

			const targetStatus: AssetStatus = employee ? 'in_use' : 'available';
			if (targetStatus !== asset.status) {
				assertTransition(asset.status, targetStatus);
			}

			await tx
				.update(assets)
				.set({
					locationId,
					assignedEmployeeId: employeeId,
					status: targetStatus,
					updatedBy: actor.id,
					updatedAt: new Date()
				})
				.where(eq(assets.id, assetId));

			const movementNumber = await nextNumber(tx, 'ASG');
			await tx.insert(assetMovements).values({
				movementNumber,
				movementType: 'assignment',
				movementDate: dateToTimestamp(assignmentDate),
				assetId,
				fromLocationId: asset.locationId,
				toLocationId: locationId,
				fromEmployeeId: asset.assignedEmployeeId,
				toEmployeeId: employeeId,
				departmentId,
				fromLocationName: fromLocation?.name ?? null,
				toLocationName: location.name,
				fromEmployeeName: fromEmployee?.name ?? null,
				toEmployeeName: employee?.fullName ?? null,
				reason: 'Penempatan aset',
				performedBy: actor.id,
				notes,
				submissionId
			});

			audit({
				module: 'assignment',
				action: 'asset_assigned',
				recordId: String(assetId),
				previousValue: {
					status: asset.status,
					locationId: asset.locationId,
					locationName: fromLocation?.name ?? null,
					employeeId: asset.assignedEmployeeId,
					employeeName: fromEmployee?.name ?? null
				},
				newValue: {
					status: targetStatus,
					locationId,
					locationName: location.name,
					employeeId,
					employeeName: employee?.fullName ?? null,
					departmentId,
					movementNumber
				}
			});

			return assetId;
		});
	} catch (error) {
		if (uniqueConstraintName(error) === 'asset_movements_submission_unique') {
			const duplicate = await findExistingAssignment(submissionId);
			if (duplicate !== null) return duplicate;
		}
		throw error;
	}
}

export async function listAssignments(
	actor: AuthUser,
	filter: AssignmentListFilter = {}
): Promise<AssignmentListResult> {
	const scope = scopeToUser(actor);
	const search = text(filter.search);
	const term = `%${search}%`;
	const pageSize = Math.min(100, Math.max(5, filter.pageSize ?? 10));

	const toLocation = alias(locations, 'to_location');
	const fromLocation = alias(locations, 'from_location');

	const fromDate = filter.from && isDateString(filter.from) ? startOfJakartaDay(filter.from) : null;
	const toDate = filter.to && isDateString(filter.to) ? addOneDay(filter.to) : null;

	const where = and(
		eq(assetMovements.movementType, 'assignment'),
		scope.allOutlets
			? undefined
			: or(eq(toLocation.outletId, scope.outletId!), eq(fromLocation.outletId, scope.outletId!)),
		search
			? or(
					ilike(assets.assetCode, term),
					ilike(assets.name, term),
					ilike(assetMovements.movementNumber, term)
				)
			: undefined,
		filter.locationId
			? or(
					eq(assetMovements.toLocationId, filter.locationId),
					eq(assetMovements.fromLocationId, filter.locationId)
				)
			: undefined,
		filter.employeeId
			? or(
					eq(assetMovements.toEmployeeId, filter.employeeId),
					eq(assetMovements.fromEmployeeId, filter.employeeId)
				)
			: undefined,
		fromDate ? gte(assetMovements.movementDate, fromDate) : undefined,
		toDate ? lt(assetMovements.movementDate, toDate) : undefined
	);

	const [{ total }] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(assetMovements)
		.innerJoin(assets, eq(assetMovements.assetId, assets.id))
		.leftJoin(toLocation, eq(assetMovements.toLocationId, toLocation.id))
		.leftJoin(fromLocation, eq(assetMovements.fromLocationId, fromLocation.id))
		.where(where);

	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const page = Math.min(Math.max(filter.page ?? 1, 1), totalPages);
	const offset = (page - 1) * pageSize;

	const rows = await db
		.select({
			id: assetMovements.id,
			assetId: assetMovements.assetId,
			movementNumber: assetMovements.movementNumber,
			movementDate: assetMovements.movementDate,
			fromLocationName: assetMovements.fromLocationName,
			toLocationName: assetMovements.toLocationName,
			fromEmployeeName: assetMovements.fromEmployeeName,
			toEmployeeName: assetMovements.toEmployeeName,
			notes: assetMovements.notes,
			assetCode: assets.assetCode,
			assetName: assets.name,
			performedByName: users.fullName
		})
		.from(assetMovements)
		.innerJoin(assets, eq(assetMovements.assetId, assets.id))
		.innerJoin(users, eq(assetMovements.performedBy, users.id))
		.leftJoin(toLocation, eq(assetMovements.toLocationId, toLocation.id))
		.leftJoin(fromLocation, eq(assetMovements.fromLocationId, fromLocation.id))
		.where(where)
		.orderBy(desc(assetMovements.movementDate), desc(assetMovements.id))
		.limit(pageSize)
		.offset(offset);

	const [locationRows, employeeRows] = await Promise.all([
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
			.orderBy(asc(outlets.name), asc(locations.name)),
		db
			.select({
				id: employees.id,
				fullName: employees.fullName,
				employeeCode: employees.employeeCode,
				outletId: employees.outletId,
				departmentId: employees.departmentId,
				outletName: outlets.name
			})
			.from(employees)
			.innerJoin(outlets, eq(employees.outletId, outlets.id))
			.where(and(eq(employees.isActive, true), employeeCondition(scope)))
			.orderBy(asc(employees.fullName))
	]);

	return {
		items: rows.map((row) => ({
			id: row.id,
			assetId: row.assetId,
			movementNumber: row.movementNumber,
			dateLabel: formatDate(row.movementDate),
			assetLabel: `${row.assetCode} · ${row.assetName}`,
			assetCode: row.assetCode,
			fromLabel: `${row.fromLocationName ?? '—'} · ${row.fromEmployeeName ?? 'Tanpa pemegang'}`,
			toLabel: `${row.toLocationName ?? '—'} · ${row.toEmployeeName ?? 'Tanpa pemegang'}`,
			performedByName: row.performedByName,
			notes: row.notes
		})),
		page,
		pageSize,
		total,
		filters: {
			locations: locationRows.map((row) => ({
				id: row.id,
				label: `${row.outletName} · ${row.name}`,
				outletId: row.outletId
			})),
			employees: employeeRows.map((row) => ({
				id: row.id,
				label: `${row.outletName} · ${row.fullName} (${row.employeeCode})`,
				outletId: row.outletId,
				departmentId: row.departmentId
			}))
		}
	};
}
