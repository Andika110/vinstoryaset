import { and, asc, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { writeAudit, withAudit } from '#lib/server/audit.js';
import { assertCan, scopeToUser } from '#lib/server/auth/permissions.js';
import type { AuthUser } from '#lib/server/auth/session.js';
import { db } from '#lib/server/db/index.js';
import { uniqueConstraintName } from '#lib/server/db/errors.js';
import {
	assetConditions,
	assetLoans,
	assets,
	employees,
	locations,
	outlets,
	users
} from '#lib/server/db/schema/index.js';
import {
	ASSET_STATUS_LABEL,
	assertLoanTransition,
	assertTransition,
	type AssetStatus
} from '#lib/server/domain/transitions.js';
import { DomainError } from '#lib/server/errors.js';
import { nextNumber } from '#lib/server/document-number.js';
import { requireSubmissionId } from '#lib/server/idempotency.js';

export type LoanTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

export type LoanOption = { id: number; label: string };
export type LoanFormOptions = {
	assets: (LoanOption & { locationLabel: string; outletId: number })[];
	employees: (LoanOption & { outletName: string; fullName: string })[];
	conditions: LoanOption[];
};

export type LoanInput = {
	assetId: number | null;
	employeeId: number | null;
	borrowerName: string;
	borrowingDate: string;
	expectedReturnDate: string;
	conditionBeforeId: number | null;
	notes: string | null;
	submissionId: string;
};

export type ReturnInput = {
	actualReturnDate: string;
	conditionAfterId: number | null;
	notes: string | null;
};

export type LoanListItem = {
	id: number;
	loanNumber: string;
	assetId: number;
	assetCode: string;
	assetName: string;
	borrowerName: string;
	borrowingDateLabel: string;
	expectedReturnDateLabel: string;
	actualReturnDateLabel: string | null;
	statusLabel: string;
	statusTone: LoanTone;
	overdueDays: number;
	overdueLabel: string | null;
};

export type LoanListFilter = {
	search?: string;
	status?: string;
	from?: string;
	to?: string;
	page?: number;
	pageSize?: number;
};

export type LoanListResult = {
	items: LoanListItem[];
	page: number;
	pageSize: number;
	total: number;
};

export type LoanDetail = {
	id: number;
	loanNumber: string;
	status: string;
	statusLabel: string;
	statusTone: LoanTone;
	overdueDays: number;
	overdueLabel: string | null;
	assetId: number;
	assetCode: string;
	assetName: string;
	assetStatusLabel: string;
	locationName: string;
	outletName: string;
	borrowerName: string;
	borrowerEmployeeName: string | null;
	borrowerEmployeeCode: string | null;
	borrowingDateLabel: string;
	expectedReturnDateLabel: string;
	actualReturnDateLabel: string | null;
	conditionBeforeName: string;
	conditionAfterName: string | null;
	notes: string | null;
	processedByName: string;
	createdAtLabel: string;
	canReturn: boolean;
	canCancel: boolean;
	returnDefaults: { actualReturnDate: string };
	returnOptions: LoanOption[];
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

const STATUS_LABEL: Record<string, string> = {
	borrowed: 'Dipinjam',
	returned: 'Dikembalikan',
	cancelled: 'Dibatalkan'
};

const STATUS_TONE: Record<string, LoanTone> = {
	borrowed: 'warning',
	returned: 'success',
	cancelled: 'neutral'
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

export function loanDefaultDate(): string {
	return todayJakarta();
}

export function loanDefaultReturnDate(days = 7): string {
	const date = new Date();
	date.setUTCDate(date.getUTCDate() + days);
	return new Intl.DateTimeFormat('en-CA', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		timeZone: 'Asia/Jakarta'
	}).format(date);
}

function overdueDays(expectedReturnDate: string): number {
	const today = Date.parse(`${todayJakarta()}T00:00:00Z`);
	const expected = Date.parse(`${expectedReturnDate}T00:00:00Z`);
	if (Number.isNaN(today) || Number.isNaN(expected) || expected >= today) return 0;
	return Math.floor((today - expected) / 86_400_000);
}

function overdueLabel(days: number): string | null {
	return days > 0 ? `Terlambat ${days} hari` : null;
}

function loanStatusFromFilter(value: string | undefined): string | undefined {
	if (!value) return undefined;
	if (value === 'overdue') return 'borrowed';
	if (value === 'borrowed' || value === 'returned' || value === 'cancelled') return value;
	return undefined;
}

export async function getLoanFormOptions(actor: AuthUser): Promise<LoanFormOptions> {
	assertCan(actor, 'loan:write');
	const scope = scopeToUser(actor);

	const [assetRows, employeeRows, conditionRows] = await Promise.all([
		db
			.select({
				id: assets.id,
				assetCode: assets.assetCode,
				name: assets.name,
				locationName: locations.name,
				outletId: outlets.id,
				outletName: outlets.name
			})
			.from(assets)
			.innerJoin(locations, eq(assets.locationId, locations.id))
			.innerJoin(outlets, eq(locations.outletId, outlets.id))
			.where(
				and(
					eq(assets.status, 'available'),
					scope.allOutlets ? undefined : eq(locations.outletId, scope.outletId!)
				)
			)
			.orderBy(asc(assets.assetCode)),
		db
			.select({
				id: employees.id,
				fullName: employees.fullName,
				employeeCode: employees.employeeCode,
				outletName: outlets.name
			})
			.from(employees)
			.innerJoin(outlets, eq(employees.outletId, outlets.id))
			.where(eq(employees.isActive, true))
			.orderBy(asc(employees.fullName)),
		db
			.select({ id: assetConditions.id, name: assetConditions.name })
			.from(assetConditions)
			.where(eq(assetConditions.isActive, true))
			.orderBy(asc(assetConditions.name))
	]);

	return {
		assets: assetRows.map((row) => ({
			id: row.id,
			label: `${row.assetCode} · ${row.name} · Available`,
			locationLabel: `${row.outletName} · ${row.locationName}`,
			outletId: row.outletId
		})),
		employees: employeeRows.map((row) => ({
			id: row.id,
			label: `${row.outletName} · ${row.fullName} (${row.employeeCode})`,
			outletName: row.outletName,
			fullName: row.fullName
		})),
		conditions: conditionRows.map((row) => ({ id: row.id, label: row.name }))
	};
}

async function findExistingLoan(submissionId: string): Promise<number | null> {
	const [existing] = await db
		.select({ id: assetLoans.id })
		.from(assetLoans)
		.where(eq(assetLoans.submissionId, submissionId))
		.limit(1);
	return existing?.id ?? null;
}

export async function createLoan(actor: AuthUser, input: LoanInput): Promise<number> {
	assertCan(actor, 'loan:write');
	const assetId = integer(input.assetId, 'Aset', true)!;
	const conditionBeforeId = integer(input.conditionBeforeId, 'Kondisi awal', true)!;
	const borrowingDate = assertDate(text(input.borrowingDate), 'Tanggal pinjam');
	const expectedReturnDate = assertDate(text(input.expectedReturnDate), 'Rencana kembali');
	const borrowerName = text(input.borrowerName);
	const submissionId = requireSubmissionId(text(input.submissionId));

	if (!borrowerName) throw new DomainError('VALIDASI', 'Nama peminjam wajib diisi.');
	if (expectedReturnDate < borrowingDate) {
		throw new DomainError('VALIDASI', 'Rencana kembali tidak boleh sebelum tanggal pinjam.');
	}

	const existing = await findExistingLoan(submissionId);
	if (existing !== null) return existing;

	const [condition] = await db
		.select({ name: assetConditions.name, isActive: assetConditions.isActive })
		.from(assetConditions)
		.where(eq(assetConditions.id, conditionBeforeId))
		.limit(1);
	if (!condition || !condition.isActive) {
		throw new DomainError('VALIDASI', 'Kondisi awal tidak ditemukan atau nonaktif.');
	}

	const employeeId = integer(input.employeeId, 'Employee');
	if (employeeId !== null) {
		const [employee] = await db
			.select({ id: employees.id, isActive: employees.isActive })
			.from(employees)
			.where(eq(employees.id, employeeId))
			.limit(1);
		if (!employee || !employee.isActive) {
			throw new DomainError('VALIDASI', 'Employee tidak ditemukan atau nonaktif.');
		}
	}

	try {
		return await withAudit(actor, async (tx, audit) => {
			const [asset] = await tx
				.select({
					id: assets.id,
					assetCode: assets.assetCode,
					name: assets.name,
					status: assets.status,
					locationId: assets.locationId
				})
				.from(assets)
				.where(eq(assets.id, assetId))
				.limit(1)
				.for('update');

			if (!asset) throw new DomainError('TIDAK_DITEMUKAN', 'Aset tidak ditemukan.');
			if (asset.status !== 'available') {
				throw new DomainError(
					'VALIDASI',
					`Aset berstatus ${ASSET_STATUS_LABEL[asset.status]} dan tidak dapat dipinjam.`
				);
			}
			assertTransition(asset.status, 'on_loan');

			await tx
				.update(assets)
				.set({ status: 'on_loan', updatedBy: actor.id, updatedAt: new Date() })
				.where(eq(assets.id, assetId));

			const loanNumber = await nextNumber(tx, 'LN');
			const [created] = await tx
				.insert(assetLoans)
				.values({
					loanNumber,
					assetId,
					borrowerEmployeeId: employeeId,
					borrowerName,
					borrowingDate,
					expectedReturnDate,
					conditionBeforeId,
					notes: optionalText(input.notes),
					status: 'borrowed',
					processedBy: actor.id,
					submissionId
				})
				.returning({ id: assetLoans.id });

			audit({
				module: 'loan',
				action: 'loan_created',
				recordId: String(created.id),
				newValue: {
					loanNumber,
					assetId,
					assetCode: asset.assetCode,
					borrowerName,
					borrowingDate,
					expectedReturnDate,
					conditionBeforeId
				}
			});

			return created.id;
		});
	} catch (error) {
		if (uniqueConstraintName(error) === 'asset_loans_submission_unique') {
			const duplicate = await findExistingLoan(submissionId);
			if (duplicate !== null) return duplicate;
		}
		throw error;
	}
}

export async function listLoans(
	actor: AuthUser,
	filter: LoanListFilter = {}
): Promise<LoanListResult> {
	const scope = scopeToUser(actor);
	const search = text(filter.search);
	const term = `%${search}%`;
	const pageSize = Math.min(100, Math.max(5, filter.pageSize ?? 10));
	const statusFilter = text(filter.status);
	const status = loanStatusFromFilter(statusFilter);
	const from = filter.from && /^\d{4}-\d{2}-\d{2}$/.test(filter.from) ? filter.from : null;
	const to = filter.to && /^\d{4}-\d{2}-\d{2}$/.test(filter.to) ? filter.to : null;
	const today = todayJakarta();

	const where = and(
		scope.allOutlets ? undefined : eq(locations.outletId, scope.outletId!),
		status ? eq(assetLoans.status, status as never) : undefined,
		statusFilter === 'overdue'
			? and(eq(assetLoans.status, 'borrowed'), sql`${assetLoans.expectedReturnDate} < ${today}`)
			: undefined,
		from ? gte(assetLoans.borrowingDate, from) : undefined,
		to ? lte(assetLoans.borrowingDate, to) : undefined,
		search
			? or(
					ilike(assetLoans.loanNumber, term),
					ilike(assets.assetCode, term),
					ilike(assets.name, term),
					ilike(assetLoans.borrowerName, term)
				)
			: undefined
	);

	const [{ total }] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(assetLoans)
		.innerJoin(assets, eq(assetLoans.assetId, assets.id))
		.innerJoin(locations, eq(assets.locationId, locations.id))
		.where(where);

	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const page = Math.min(Math.max(filter.page ?? 1, 1), totalPages);
	const offset = (page - 1) * pageSize;

	const rows = await db
		.select({
			id: assetLoans.id,
			loanNumber: assetLoans.loanNumber,
			borrowerName: assetLoans.borrowerName,
			borrowingDate: assetLoans.borrowingDate,
			expectedReturnDate: assetLoans.expectedReturnDate,
			actualReturnDate: assetLoans.actualReturnDate,
			status: assetLoans.status,
			assetId: assets.id,
			assetCode: assets.assetCode,
			assetName: assets.name
		})
		.from(assetLoans)
		.innerJoin(assets, eq(assetLoans.assetId, assets.id))
		.innerJoin(locations, eq(assets.locationId, locations.id))
		.where(where)
		.orderBy(desc(assetLoans.borrowingDate), desc(assetLoans.id))
		.limit(pageSize)
		.offset(offset);

	return {
		items: rows.map((row) => {
			const days = row.status === 'borrowed' ? overdueDays(row.expectedReturnDate) : 0;
			return {
				id: row.id,
				loanNumber: row.loanNumber,
				assetId: row.assetId,
				assetCode: row.assetCode,
				assetName: row.assetName,
				borrowerName: row.borrowerName,
				borrowingDateLabel: formatDate(row.borrowingDate) ?? '—',
				expectedReturnDateLabel: formatDate(row.expectedReturnDate) ?? '—',
				actualReturnDateLabel: formatDate(row.actualReturnDate),
				statusLabel: days > 0 ? 'Terlambat' : (STATUS_LABEL[row.status] ?? row.status),
				statusTone: days > 0 ? 'danger' : (STATUS_TONE[row.status] ?? 'neutral'),
				overdueDays: days,
				overdueLabel: overdueLabel(days)
			};
		}),
		page,
		pageSize,
		total
	};
}

export async function getLoanDetail(actor: AuthUser, id: number): Promise<LoanDetail> {
	const scope = scopeToUser(actor);
	const [row] = await db
		.select({
			id: assetLoans.id,
			loanNumber: assetLoans.loanNumber,
			status: assetLoans.status,
			borrowerName: assetLoans.borrowerName,
			borrowingDate: assetLoans.borrowingDate,
			expectedReturnDate: assetLoans.expectedReturnDate,
			actualReturnDate: assetLoans.actualReturnDate,
			notes: assetLoans.notes,
			createdAt: assetLoans.createdAt,
			assetId: assets.id,
			assetCode: assets.assetCode,
			assetName: assets.name,
			assetStatus: assets.status,
			locationName: locations.name,
			outletName: outlets.name,
			outletId: outlets.id,
			employeeName: employees.fullName,
			employeeCode: employees.employeeCode,
			conditionBeforeName: assetConditions.name,
			processedByName: users.fullName
		})
		.from(assetLoans)
		.innerJoin(assets, eq(assetLoans.assetId, assets.id))
		.innerJoin(locations, eq(assets.locationId, locations.id))
		.innerJoin(outlets, eq(locations.outletId, outlets.id))
		.innerJoin(users, eq(assetLoans.processedBy, users.id))
		.innerJoin(assetConditions, eq(assetLoans.conditionBeforeId, assetConditions.id))
		.leftJoin(employees, eq(assetLoans.borrowerEmployeeId, employees.id))
		.where(eq(assetLoans.id, id))
		.limit(1);

	if (!row) throw new DomainError('TIDAK_DITEMUKAN', 'Peminjaman tidak ditemukan.');
	if (!scope.allOutlets && row.outletId !== scope.outletId) {
		throw new DomainError('TIDAK_DITEMUKAN', 'Peminjaman tidak ditemukan.');
	}

	let conditionAfterName: string | null = null;
	if (row.status === 'returned') {
		const after = alias(assetConditions, 'condition_after');
		const [returned] = await db
			.select({ name: after.name })
			.from(assetLoans)
			.innerJoin(after, eq(assetLoans.conditionAfterId, after.id))
			.where(eq(assetLoans.id, id))
			.limit(1);
		conditionAfterName = returned?.name ?? null;
	}

	const days = row.status === 'borrowed' ? overdueDays(row.expectedReturnDate) : 0;
	const conditions = await db
		.select({ id: assetConditions.id, name: assetConditions.name })
		.from(assetConditions)
		.where(eq(assetConditions.isActive, true))
		.orderBy(asc(assetConditions.name));

	const canWrite = actor.role !== 'outlet' && row.status === 'borrowed';

	return {
		id: row.id,
		loanNumber: row.loanNumber,
		status: row.status,
		statusLabel: days > 0 ? 'Terlambat' : (STATUS_LABEL[row.status] ?? row.status),
		statusTone: days > 0 ? 'danger' : (STATUS_TONE[row.status] ?? 'neutral'),
		overdueDays: days,
		overdueLabel: overdueLabel(days),
		assetId: row.assetId,
		assetCode: row.assetCode,
		assetName: row.assetName,
		assetStatusLabel: ASSET_STATUS_LABEL[row.assetStatus],
		locationName: row.locationName,
		outletName: row.outletName,
		borrowerName: row.borrowerName,
		borrowerEmployeeName: row.employeeName,
		borrowerEmployeeCode: row.employeeCode,
		borrowingDateLabel: formatDate(row.borrowingDate) ?? '—',
		expectedReturnDateLabel: formatDate(row.expectedReturnDate) ?? '—',
		actualReturnDateLabel: formatDate(row.actualReturnDate),
		conditionBeforeName: row.conditionBeforeName,
		conditionAfterName,
		notes: row.notes,
		processedByName: row.processedByName,
		createdAtLabel: formatDateTime(row.createdAt),
		canReturn: canWrite,
		canCancel: canWrite,
		returnDefaults: { actualReturnDate: todayJakarta() },
		returnOptions: conditions.map((condition) => ({ id: condition.id, label: condition.name }))
	};
}

export async function returnLoan(actor: AuthUser, id: number, input: ReturnInput): Promise<void> {
	assertCan(actor, 'loan:write');
	const conditionAfterId = integer(input.conditionAfterId, 'Kondisi setelah kembali', true)!;
	const actualReturnDate = assertDate(text(input.actualReturnDate), 'Tanggal kembali');

	const [condition] = await db
		.select({ name: assetConditions.name, isActive: assetConditions.isActive })
		.from(assetConditions)
		.where(eq(assetConditions.id, conditionAfterId))
		.limit(1);
	if (!condition || !condition.isActive) {
		throw new DomainError('VALIDASI', 'Kondisi setelah kembali tidak ditemukan atau nonaktif.');
	}

	await db.transaction(async (tx) => {
		const [loan] = await tx
			.select({
				id: assetLoans.id,
				assetId: assetLoans.assetId,
				status: assetLoans.status,
				borrowingDate: assetLoans.borrowingDate,
				notes: assetLoans.notes,
				loanNumber: assetLoans.loanNumber
			})
			.from(assetLoans)
			.where(eq(assetLoans.id, id))
			.limit(1)
			.for('update');

		if (!loan) throw new DomainError('TIDAK_DITEMUKAN', 'Peminjaman tidak ditemukan.');
		if (loan.status !== 'borrowed') {
			throw new DomainError('VALIDASI', 'Peminjaman ini sudah dikembalikan atau dibatalkan.');
		}
		assertLoanTransition(loan.status, 'returned');
		if (actualReturnDate < loan.borrowingDate) {
			throw new DomainError('VALIDASI', 'Tanggal kembali tidak boleh sebelum tanggal pinjam.');
		}

		const [asset] = await tx
			.select({ id: assets.id, status: assets.status })
			.from(assets)
			.where(eq(assets.id, loan.assetId))
			.limit(1)
			.for('update');
		if (!asset) throw new DomainError('TIDAK_DITEMUKAN', 'Aset tidak ditemukan.');

		const damaged = condition.name.toLowerCase().includes('rusak');
		const targetStatus: AssetStatus = damaged ? 'damaged' : 'available';
		if (targetStatus !== asset.status) {
			assertTransition(asset.status, targetStatus);
		}

		const returnNote = optionalText(input.notes);
		const notes = returnNote
			? `${loan.notes ? `${loan.notes}\n` : ''}[Kembali] ${returnNote}`
			: loan.notes;

		await tx
			.update(assetLoans)
			.set({
				status: 'returned',
				actualReturnDate,
				conditionAfterId,
				notes,
				updatedAt: new Date()
			})
			.where(eq(assetLoans.id, id));

		await tx
			.update(assets)
			.set({ status: targetStatus, updatedBy: actor.id, updatedAt: new Date() })
			.where(eq(assets.id, loan.assetId));

		await writeAudit(tx, actor, {
			module: 'loan',
			action: 'loan_returned',
			recordId: String(id),
			previousValue: { status: 'borrowed', assetStatus: asset.status },
			newValue: {
				loanNumber: loan.loanNumber,
				status: 'returned',
				assetStatus: targetStatus,
				conditionAfterId,
				conditionAfterName: condition.name,
				actualReturnDate
			}
		});
	});
}

export async function cancelLoan(actor: AuthUser, id: number): Promise<void> {
	assertCan(actor, 'loan:write');
	await db.transaction(async (tx) => {
		const [loan] = await tx
			.select({ id: assetLoans.id, assetId: assetLoans.assetId, status: assetLoans.status })
			.from(assetLoans)
			.where(eq(assetLoans.id, id))
			.limit(1)
			.for('update');
		if (!loan) throw new DomainError('TIDAK_DITEMUKAN', 'Peminjaman tidak ditemukan.');
		if (loan.status !== 'borrowed') {
			throw new DomainError('VALIDASI', 'Peminjaman ini sudah dikembalikan atau dibatalkan.');
		}
		assertLoanTransition(loan.status, 'cancelled');

		const [asset] = await tx
			.select({ id: assets.id, status: assets.status })
			.from(assets)
			.where(eq(assets.id, loan.assetId))
			.limit(1)
			.for('update');
		if (!asset) throw new DomainError('TIDAK_DITEMUKAN', 'Aset tidak ditemukan.');

		assertTransition(asset.status, 'available');

		await tx
			.update(assetLoans)
			.set({ status: 'cancelled', updatedAt: new Date() })
			.where(eq(assetLoans.id, id));
		await tx
			.update(assets)
			.set({ status: 'available', updatedBy: actor.id, updatedAt: new Date() })
			.where(eq(assets.id, loan.assetId));

		await writeAudit(tx, actor, {
			module: 'loan',
			action: 'loan_cancelled',
			recordId: String(id),
			previousValue: { status: 'borrowed', assetStatus: asset.status },
			newValue: { status: 'cancelled', assetStatus: 'available' }
		});
	});
}
