import { DomainError } from './errors.js';

const SUBMISSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isSubmissionId(value: string): boolean {
	return SUBMISSION_ID_PATTERN.test(value.trim());
}

/** Validasi token idempotensi form transaksi. */
export function requireSubmissionId(value: string): string {
	const normalized = value.trim();
	if (!isSubmissionId(normalized)) {
		throw new DomainError('VALIDASI', 'Token idempotensi tidak valid.');
	}
	return normalized;
}
