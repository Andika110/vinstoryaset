import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { writeAudit } from '#lib/server/audit.js';
import { assertCan } from '#lib/server/auth/permissions.js';
import type { AuthUser } from '#lib/server/auth/session.js';
import { db } from '#lib/server/db/index.js';
import {
	assetCategories,
	assetConditions,
	assets,
	disposalReasonEnum,
	disposalStatusEnum,
	disposals,
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
import { isSubmissionId } from '#lib/server/idempotency.js';

export type DisposalStatus = 'completed' | 'cancelled';
export type DisposalReason = 'heavy_damage' | 'not_economical' | 'lost' | 'not_needed' | 'other';
export type BadgeTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

export const DISPOSAL_REASON_LABEL: Record<DisposalReason, string> = {
	heavy_damage: 'Rusak berat',
	not_economical: 'Tidak ekonomis diperbaiki',
	lost: 'Hilang',
	not_needed: 'Tidak dibutuhkan',
	other: 'Lainnya'
};

export const DISPOSAL_STATUS_LABEL: Record<DisposalStatus, string> = {
	completed: 'Disposed',
	cancelled: 'Dibatalkan'
};

export const DISPOSAL_STATUS_TONE: Record<DisposalStatus, BadgeTone> = {
	completed: 'danger',
	cancelled: 'neutral'
};

export const DISPOSAL_REASON_OPTIONS = (disposalReasonEnum.enumValues as DisposalReason[]).map(
	(value) => ({ value, label: DISPOSAL_REASON_LABEL[value] })
);

export const DISPOSAL_STATUS_OPTIONS = (disposalStatusEnum.enumValues as DisposalStatus[]).map(
	(value) => ({ value, label: DISPOSAL_STATUS_LABEL[value] })
);

const DATE_FORMAT = new Intl.DateTimeFormat('id-ID', {
	dateStyle: 'medium',
	timeZone: 'Asia/Jakarta'
});
const DATE_TIME_FORMAT = new Intl.DateTimeFormat('id-ID', {
	dateStyle: 'medium',
	timeStyle: 'short',
	timeZone: 'Asia/Jakarta'
});

function formatDate(value: string | null | undefined): string {
	if (!value) return '—';
	const date = new Date(`${value}T00:00:00+07:00`);
	return Number.isNaN(date.getTime()) ? value : DATE_FORMAT.format(date);
}

function formatDateTime(value: Date | null | undefined): string {
	return value ? DATE_TIME_FORMAT.format(value) : '—';
}

export function assertDisposalAccess(actor: AuthUser): void {
	if (actor.role === 'outlet') {
		throw new DomainError('DILARANG', 'Anda tidak punya akses ke modul disposal.');
	}
	assertCan(actor, 'disposal:write');
}

function isReason(value: string): value is DisposalReason {
	return disposalReasonEnum.enumValues.includes(value as DisposalReason);
}

function isStatus(value: string): value is DisposalStatus {
	return disposalStatusEnum.enumValues.includes(value as DisposalStatus);
}

function validDate(value: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const date = new Date(`${value}T00:00:00+07:00`);
	return !Number.isNaN(date.getTime());
}

export type DisposalListFilter = {
	search?: string;
	reason?: string;
	status?: string;
	from?: string;
	to?: string;
	page?: number;
	pageSize?: number;
};

export type DisposalListItem = {
	id: number;
	disposalNumber: string;
	assetId: number;
	assetCode: string;
	assetName: string;
	categoryName: string;
	locationName: string;
	outletName: string;
	disposalDateLabel: string;
	reason: DisposalReason;
	reasonLabel: string;
	status: DisposalStatus;
	statusLabel: string;
	statusTone: BadgeTone;
	finalConditionName: string;
	recordedByName: string;
	createdAtLabel: string;
};

export type DisposalListResult = {
	items: DisposalListItem[];
	page: number;
	pageSize: number;
	total: number;
	filters: {
		reasons: { value: DisposalReason; label: string }[];
		statuses: { value: DisposalStatus; label: string }[];
	};
};

export async function listDisposals(
	actor: AuthUser,
	filter: DisposalListFilter = {}
): Promise<DisposalListResult> {
	assertDisposalAccess(actor);
	const search = (filter.search ?? '').trim();
	const term = `%${search}%`;
	const reason = filter.reason && isReason(filter.reason) ? filter.reason : undefined;
	const status = filter.status && isStatus(filter.status) ? filter.status : undefined;
	const fromValue = filter.from && validDate(filter.from) ? filter.from : null;
	const toValue = filter.to && validDate(filter.to) ? filter.to : null;
	const pageSize = Math.min(50, Math.max(5, filter.pageSize ?? 15));

	const where = and(
		reason ? eq(disposals.reason, reason) : undefined,
		status ? eq(disposals.status, status) : undefined,
		fromValue ? gte(disposals.disposalDate, fromValue) : undefined,
		toValue ? lte(disposals.disposalDate, toValue) : undefined,
		search
			? or(
					ilike(disposals.disposalNumber, term),
					ilike(assets.assetCode, term),
					ilike(assets.name, term),
					ilike(disposals.description, term)
				)
			: undefined
	);

	const [{ total }] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(disposals)
		.innerJoin(assets, eq(disposals.assetId, assets.id))
		.where(where);

	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const page = Math.min(Math.max(filter.page ?? 1, 1), totalPages);
	const offset = (page - 1) * pageSize;

	const rows = await db
		.select({
			id: disposals.id,
			disposalNumber: disposals.disposalNumber,
			assetId: assets.id,
			assetCode: assets.assetCode,
			assetName: assets.name,
			categoryName: assetCategories.name,
			locationName: locations.name,
			outletName: outlets.name,
			disposalDate: disposals.disposalDate,
			reason: disposals.reason,
			status: disposals.status,
			finalConditionName: assetConditions.name,
			recordedByName: users.fullName,
			createdAt: disposals.createdAt
		})
		.from(disposals)
		.innerJoin(assets, eq(disposals.assetId, assets.id))
		.innerJoin(assetCategories, eq(assets.categoryId, assetCategories.id))
		.innerJoin(locations, eq(assets.locationId, locations.id))
		.innerJoin(outlets, eq(locations.outletId, outlets.id))
		.innerJoin(assetConditions, eq(disposals.finalConditionId, assetConditions.id))
		.innerJoin(users, eq(disposals.recordedBy, users.id))
		.where(where)
		.orderBy(desc(disposals.disposalDate), desc(disposals.id))
		.limit(pageSize)
		.offset(offset);

	return {
		items: rows.map((row) => ({
			id: row.id,
			disposalNumber: row.disposalNumber,
			assetId: row.assetId,
			assetCode: row.assetCode,
			assetName: row.assetName,
			categoryName: row.categoryName,
			locationName: row.locationName,
			outletName: row.outletName,
			disposalDateLabel: formatDate(row.disposalDate),
			reason: row.reason,
			reasonLabel: DISPOSAL_REASON_LABEL[row.reason],
			status: row.status,
			statusLabel: DISPOSAL_STATUS_LABEL[row.status],
			statusTone: DISPOSAL_STATUS_TONE[row.status],
			finalConditionName: row.finalConditionName,
			recordedByName: row.recordedByName,
			createdAtLabel: formatDateTime(row.createdAt)
		})),
		page,
		pageSize,
		total,
		filters: {
			reasons: DISPOSAL_REASON_OPTIONS,
			statuses: DISPOSAL_STATUS_OPTIONS
		}
	};
}

export type DisposalAssetOption = {
	id: number;
	label: string;
	status: AssetStatus;
	statusLabel: string;
};

export async function getDisposalFormOptions(actor: AuthUser): Promise<{
	assets: DisposalAssetOption[];
	conditions: { id: number; label: string }[];
}> {
	assertDisposalAccess(actor);
	const [assetRows, conditionRows] = await Promise.all([
		db
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
			.where(sql`${assets.status} <> 'disposed'`)
			.orderBy(asc(assets.assetCode)),
		db
			.select({ id: assetConditions.id, name: assetConditions.name })
			.from(assetConditions)
			.where(eq(assetConditions.isActive, true))
			.orderBy(asc(assetConditions.name))
	]);

	return {
		assets: assetRows.map((row) => ({
			id: row.id,
			label: `${row.assetCode} · ${row.name} (${row.outletName} / ${row.locationName})`,
			status: row.status,
			statusLabel: ASSET_STATUS_LABEL[row.status]
		})),
		conditions: conditionRows.map((row) => ({ id: row.id, label: row.name }))
	};
}

export type DisposalTimelineEntry = {
	id: string;
	title: string;
	description: string;
	meta: string;
	tone: BadgeTone;
};

export type DisposalDetail = {
	disposal: {
		id: number;
		disposalNumber: string;
		assetId: number;
		assetCode: string;
		assetName: string;
		categoryName: string;
		serialNumber: string | null;
		locationName: string;
		outletName: string;
		disposalDateLabel: string;
		reason: DisposalReason;
		reasonLabel: string;
		description: string | null;
		finalConditionName: string;
		previousAssetStatus: AssetStatus;
		previousAssetStatusLabel: string;
		assetStatus: AssetStatus;
		assetStatusLabel: string;
		status: DisposalStatus;
		statusLabel: string;
		statusTone: BadgeTone;
		recordedByName: string;
		createdAtLabel: string;
		cancelledReason: string | null;
		cancelledByName: string | null;
		cancelledAtLabel: string;
	};
	timeline: DisposalTimelineEntry[];
	canCancel: boolean;
};

export async function getDisposalDetail(actor: AuthUser, id: number): Promise<DisposalDetail> {
	assertDisposalAccess(actor);
	const cancelledByUser = alias(users, 'cancelled_by_user');
	const [row] = await db
		.select({
			id: disposals.id,
			disposalNumber: disposals.disposalNumber,
			assetId: assets.id,
			assetCode: assets.assetCode,
			assetName: assets.name,
			categoryName: assetCategories.name,
			serialNumber: assets.serialNumber,
			locationName: locations.name,
			outletName: outlets.name,
			disposalDate: disposals.disposalDate,
			reason: disposals.reason,
			description: disposals.description,
			finalConditionName: assetConditions.name,
			previousAssetStatus: disposals.previousAssetStatus,
			assetStatus: assets.status,
			status: disposals.status,
			recordedByName: users.fullName,
			createdAt: disposals.createdAt,
			assetCreatedAt: assets.createdAt,
			cancelledReason: disposals.cancelledReason,
			cancelledByName: cancelledByUser.fullName,
			cancelledAt: disposals.cancelledAt
		})
		.from(disposals)
		.innerJoin(assets, eq(disposals.assetId, assets.id))
		.innerJoin(assetCategories, eq(assets.categoryId, assetCategories.id))
		.innerJoin(locations, eq(assets.locationId, locations.id))
		.innerJoin(outlets, eq(locations.outletId, outlets.id))
		.innerJoin(assetConditions, eq(disposals.finalConditionId, assetConditions.id))
		.innerJoin(users, eq(disposals.recordedBy, users.id))
		.leftJoin(cancelledByUser, eq(disposals.cancelledBy, cancelledByUser.id))
		.where(eq(disposals.id, id))
		.limit(1);

	if (!row) throw new DomainError('TIDAK_DITEMUKAN', 'Disposal tidak ditemukan.');

	const timeline: DisposalTimelineEntry[] = [
		{
			id: 'asset',
			title: 'Aset terdaftar',
			description: `${row.assetCode} · ${row.assetName}`,
			meta: formatDateTime(row.assetCreatedAt),
			tone: 'info'
		},
		{
			id: 'disposal',
			title: 'Disposal dicatat',
			description: `${row.previousAssetStatus ? ASSET_STATUS_LABEL[row.previousAssetStatus] : '—'} → Disposed · ${DISPOSAL_REASON_LABEL[row.reason]}`,
			meta: `${formatDateTime(row.createdAt)} · ${row.recordedByName}`,
			tone: 'danger'
		}
	];

	if (row.status === 'cancelled') {
		timeline.push({
			id: 'cancelled',
			title: 'Disposal dibatalkan',
			description:
				`Status aset dikembalikan ke ${ASSET_STATUS_LABEL[row.previousAssetStatus]}. ${row.cancelledReason ?? ''}`.trim(),
			meta: `${formatDateTime(row.cancelledAt)} · ${row.cancelledByName ?? '—'}`,
			tone: 'warning'
		});
	}

	return {
		disposal: {
			id: row.id,
			disposalNumber: row.disposalNumber,
			assetId: row.assetId,
			assetCode: row.assetCode,
			assetName: row.assetName,
			categoryName: row.categoryName,
			serialNumber: row.serialNumber,
			locationName: row.locationName,
			outletName: row.outletName,
			disposalDateLabel: formatDate(row.disposalDate),
			reason: row.reason,
			reasonLabel: DISPOSAL_REASON_LABEL[row.reason],
			description: row.description,
			finalConditionName: row.finalConditionName,
			previousAssetStatus: row.previousAssetStatus,
			previousAssetStatusLabel: ASSET_STATUS_LABEL[row.previousAssetStatus],
			assetStatus: row.assetStatus,
			assetStatusLabel: ASSET_STATUS_LABEL[row.assetStatus],
			status: row.status,
			statusLabel: DISPOSAL_STATUS_LABEL[row.status],
			statusTone: DISPOSAL_STATUS_TONE[row.status],
			recordedByName: row.recordedByName,
			createdAtLabel: formatDateTime(row.createdAt),
			cancelledReason: row.cancelledReason,
			cancelledByName: row.cancelledByName,
			cancelledAtLabel: formatDateTime(row.cancelledAt)
		},
		timeline,
		canCancel: actor.role === 'admin' && row.status === 'completed'
	};
}

export type DisposalInput = {
	assetId: number | null;
	disposalDate: string;
	reason: string;
	finalConditionId: number | null;
	description: string | null;
	submissionId: string;
};

export async function createDisposal(actor: AuthUser, input: DisposalInput): Promise<number> {
	assertDisposalAccess(actor);
	if (!input.assetId) throw new DomainError('VALIDASI', 'Aset wajib dipilih.');
	if (!validDate(input.disposalDate)) {
		throw new DomainError('VALIDASI', 'Tanggal disposal tidak valid.');
	}
	const reason = input.reason;
	if (!isReason(reason)) throw new DomainError('VALIDASI', 'Alasan disposal tidak valid.');
	const finalConditionId = input.finalConditionId;
	if (!finalConditionId) {
		throw new DomainError('VALIDASI', 'Kondisi akhir wajib dipilih.');
	}
	const description = input.description?.trim() || null;
	if (reason === 'other' && !description) {
		throw new DomainError('VALIDASI', 'Keterangan wajib diisi untuk alasan Lainnya.');
	}
	if (description && description.length > 500) {
		throw new DomainError('VALIDASI', 'Keterangan maksimal 500 karakter.');
	}

	const submissionId = isSubmissionId(input.submissionId)
		? input.submissionId.trim()
		: randomUUID();

	return db.transaction(async (tx) => {
		const [existing] = await tx
			.select({ id: disposals.id })
			.from(disposals)
			.where(eq(disposals.submissionId, submissionId))
			.limit(1);
		if (existing) return existing.id;

		const [asset] = await tx
			.select({ id: assets.id, assetCode: assets.assetCode, status: assets.status })
			.from(assets)
			.where(eq(assets.id, input.assetId!))
			.limit(1);
		if (!asset) throw new DomainError('TIDAK_DITEMUKAN', 'Aset tidak ditemukan.');
		if (asset.status === 'on_loan') {
			throw new DomainError(
				'VALIDASI',
				'Aset sedang dipinjam. Selesaikan atau batalkan peminjaman sebelum disposal.'
			);
		}
		if (asset.status === 'disposed') {
			throw new DomainError('VALIDASI', 'Aset sudah berstatus Disposed.');
		}
		assertTransition(asset.status, 'disposed');

		const [condition] = await tx
			.select({ id: assetConditions.id })
			.from(assetConditions)
			.where(eq(assetConditions.id, input.finalConditionId!))
			.limit(1);
		if (!condition) throw new DomainError('VALIDASI', 'Kondisi akhir tidak ditemukan.');

		const disposalNumber = await nextNumber(tx, 'DSP');
		const [created] = await tx
			.insert(disposals)
			.values({
				disposalNumber,
				assetId: asset.id,
				disposalDate: input.disposalDate,
				reason,
				finalConditionId,
				description,
				recordedBy: actor.id,
				previousAssetStatus: asset.status,
				status: 'completed',
				submissionId
			})
			.returning({ id: disposals.id });

		await tx
			.update(assets)
			.set({ status: 'disposed', updatedBy: actor.id, updatedAt: new Date() })
			.where(eq(assets.id, asset.id));

		await writeAudit(tx, actor, {
			module: 'disposal',
			action: 'disposal_created',
			recordId: String(created.id),
			previousValue: { assetStatus: asset.status },
			newValue: {
				disposalNumber,
				assetCode: asset.assetCode,
				reason: input.reason,
				status: 'completed'
			}
		});

		return created.id;
	});
}

export async function cancelDisposal(actor: AuthUser, id: number, reason: string): Promise<void> {
	assertDisposalAccess(actor);
	if (actor.role !== 'admin') {
		throw new DomainError('DILARANG', 'Hanya IT Administrator yang dapat membatalkan disposal.');
	}
	const trimmed = reason.trim();
	if (trimmed.length < 3) {
		throw new DomainError('VALIDASI', 'Alasan pembatalan wajib diisi minimal 3 karakter.');
	}
	if (trimmed.length > 500) {
		throw new DomainError('VALIDASI', 'Alasan maksimal 500 karakter.');
	}

	await db.transaction(async (tx) => {
		const [row] = await tx
			.select({
				id: disposals.id,
				assetId: disposals.assetId,
				status: disposals.status,
				previousAssetStatus: disposals.previousAssetStatus
			})
			.from(disposals)
			.where(eq(disposals.id, id))
			.limit(1);
		if (!row) throw new DomainError('TIDAK_DITEMUKAN', 'Disposal tidak ditemukan.');
		if (row.status !== 'completed') {
			throw new DomainError('INVALID_STATUS', 'Disposal ini sudah dibatalkan.');
		}

		const [updated] = await tx
			.update(disposals)
			.set({
				status: 'cancelled',
				cancelledReason: trimmed,
				cancelledBy: actor.id,
				cancelledAt: new Date(),
				updatedAt: new Date()
			})
			.where(and(eq(disposals.id, id), eq(disposals.status, 'completed')))
			.returning({ id: disposals.id });
		if (!updated) throw new DomainError('INVALID_STATUS', 'Disposal sudah diproses.');

		const restored = await tx
			.update(assets)
			.set({ status: row.previousAssetStatus, updatedBy: actor.id, updatedAt: new Date() })
			.where(and(eq(assets.id, row.assetId), eq(assets.status, 'disposed')))
			.returning({ id: assets.id });
		if (restored.length === 0) {
			throw new DomainError(
				'INVALID_STATUS',
				'Status aset sudah berubah. Pembatalan tidak dapat dilakukan.'
			);
		}

		await writeAudit(tx, actor, {
			module: 'disposal',
			action: 'disposal_cancelled',
			recordId: String(id),
			previousValue: { status: 'completed', assetStatus: 'disposed' },
			newValue: { status: 'cancelled', assetStatus: row.previousAssetStatus, reason: trimmed }
		});
	});
}
