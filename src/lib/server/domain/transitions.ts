import type {
	assetStatusEnum,
	loanStatusEnum,
	maintenanceStatusEnum,
	requestStatusEnum
} from '#lib/server/db/schema/index.js';
import { DomainError } from '#lib/server/errors.js';
import { MESSAGES } from '#lib/messages.js';

export type AssetStatus = (typeof assetStatusEnum.enumValues)[number];
export type LoanStatus = (typeof loanStatusEnum.enumValues)[number];
export type MaintenanceStatus = (typeof maintenanceStatusEnum.enumValues)[number];
export type RequestStatus = (typeof requestStatusEnum.enumValues)[number];

export const ASSET_STATUS_LABEL: Record<AssetStatus, string> = {
	available: 'Available',
	in_use: 'In Use',
	on_loan: 'On Loan',
	under_maintenance: 'Under Maintenance',
	damaged: 'Damaged',
	disposed: 'Disposed'
};

export const ASSET_STATUS_TONE: Record<
	AssetStatus,
	'success' | 'info' | 'warning' | 'danger' | 'neutral'
> = {
	available: 'success',
	in_use: 'info',
	on_loan: 'warning',
	under_maintenance: 'warning',
	damaged: 'danger',
	disposed: 'neutral'
};

/** State machine status aset — sama dengan `design_pattern.md` §3.2. */
export const ASSET_TRANSITIONS: Record<AssetStatus, readonly AssetStatus[]> = {
	available: ['in_use', 'on_loan', 'under_maintenance', 'damaged', 'disposed'],
	in_use: ['available', 'under_maintenance', 'damaged', 'disposed'],
	on_loan: ['available', 'damaged'],
	under_maintenance: ['available', 'in_use', 'damaged', 'disposed'],
	damaged: ['under_maintenance', 'disposed'],
	disposed: []
};

export function assertTransition(from: AssetStatus, to: AssetStatus): void {
	if (!ASSET_TRANSITIONS[from].includes(to)) {
		throw new DomainError(
			'TRANSISI_TIDAK_VALID',
			MESSAGES.invalidTransition('aset', ASSET_STATUS_LABEL[from], ASSET_STATUS_LABEL[to])
		);
	}
}

export const LOAN_STATUS_LABEL: Record<LoanStatus, string> = {
	borrowed: 'Dipinjam',
	returned: 'Dikembalikan',
	cancelled: 'Dibatalkan'
};

/** State machine peminjaman aset. */
export const LOAN_TRANSITIONS: Record<LoanStatus, readonly LoanStatus[]> = {
	borrowed: ['returned', 'cancelled'],
	returned: [],
	cancelled: []
};

export const MAINTENANCE_TRANSITIONS: Record<MaintenanceStatus, readonly MaintenanceStatus[]> = {
	reported: ['in_progress', 'cancelled'],
	in_progress: ['waiting_parts', 'completed', 'cancelled'],
	waiting_parts: ['in_progress', 'completed', 'cancelled'],
	completed: [],
	cancelled: []
};

const MAINTENANCE_LABEL: Record<MaintenanceStatus, string> = {
	reported: 'Dilaporkan',
	in_progress: 'Dikerjakan',
	waiting_parts: 'Menunggu Sparepart',
	completed: 'Selesai',
	cancelled: 'Dibatalkan'
};

export const REQUEST_TRANSITIONS: Record<RequestStatus, readonly RequestStatus[]> = {
	submitted: ['processing', 'rejected', 'cancelled'],
	processing: ['partially_fulfilled', 'fulfilled', 'rejected', 'cancelled'],
	partially_fulfilled: ['partially_fulfilled', 'fulfilled', 'cancelled'],
	fulfilled: [],
	rejected: [],
	cancelled: []
};

const REQUEST_LABEL: Record<RequestStatus, string> = {
	submitted: 'Menunggu',
	processing: 'Diproses',
	partially_fulfilled: 'Terpenuhi Sebagian',
	fulfilled: 'Selesai',
	rejected: 'Ditolak',
	cancelled: 'Dibatalkan'
};

function assertStateTransition<T extends string>(
	label: string,
	transitions: Record<T, readonly T[]>,
	labels: Record<T, string>,
	from: T,
	to: T
): void {
	if (!transitions[from].includes(to)) {
		throw new DomainError(
			'TRANSISI_TIDAK_VALID',
			MESSAGES.invalidTransition(label, labels[from], labels[to])
		);
	}
}

export function assertLoanTransition(from: LoanStatus, to: LoanStatus): void {
	assertStateTransition('peminjaman', LOAN_TRANSITIONS, LOAN_STATUS_LABEL, from, to);
}

export function assertMaintenanceTransition(from: MaintenanceStatus, to: MaintenanceStatus): void {
	assertStateTransition('maintenance', MAINTENANCE_TRANSITIONS, MAINTENANCE_LABEL, from, to);
}

export function assertRequestTransition(from: RequestStatus, to: RequestStatus): void {
	assertStateTransition('request', REQUEST_TRANSITIONS, REQUEST_LABEL, from, to);
}
