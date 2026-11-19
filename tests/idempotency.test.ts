import { describe, expect, test } from 'bun:test';
import { isSubmissionId, requireSubmissionId } from '#lib/server/idempotency.js';
import { DomainError } from '#lib/server/errors.js';

const VALID = '123e4567-e89b-12d3-a456-426614174000';

describe('idempotency token', () => {
	test('menerima UUID valid', () => {
		expect(isSubmissionId(VALID)).toBe(true);
		expect(requireSubmissionId(`  ${VALID.toUpperCase()}  `)).toBe(VALID.toUpperCase());
	});

	test('menolak token kosong atau bukan UUID', () => {
		expect(isSubmissionId('')).toBe(false);
		expect(isSubmissionId('not-a-uuid')).toBe(false);
		expect(() => requireSubmissionId('not-a-uuid')).toThrow(DomainError);
	});

	test('token yang sama menghasilkan nilai normalisasi yang sama', () => {
		expect(requireSubmissionId(VALID)).toBe(requireSubmissionId(VALID));
	});
});
