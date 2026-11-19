import { describe, expect, test } from 'bun:test';
import {
	assertLoanTransition,
	assertMaintenanceTransition,
	assertRequestTransition,
	assertTransition
} from '#lib/server/domain/transitions.js';
import { DomainError } from '#lib/server/errors.js';

function expectCode(fn: () => void, code: string): void {
	try {
		fn();
		throw new Error('Fungsi seharusnya melempar DomainError.');
	} catch (error) {
		expect(error).toBeInstanceOf(DomainError);
		expect((error as DomainError).code).toBe(code);
	}
}

describe('asset transitions', () => {
	test('mengizinkan transisi yang sah', () => {
		expect(() => assertTransition('available', 'disposed')).not.toThrow();
		expect(() => assertTransition('damaged', 'under_maintenance')).not.toThrow();
	});

	test('menolak transisi ilegal', () => {
		expectCode(() => assertTransition('on_loan', 'disposed'), 'TRANSISI_TIDAK_VALID');
		expectCode(() => assertTransition('disposed', 'available'), 'TRANSISI_TIDAK_VALID');
	});
});

describe('loan transitions', () => {
	test('borrowed hanya boleh returned/cancelled', () => {
		expect(() => assertLoanTransition('borrowed', 'returned')).not.toThrow();
		expect(() => assertLoanTransition('borrowed', 'cancelled')).not.toThrow();
		expectCode(() => assertLoanTransition('returned', 'borrowed'), 'TRANSISI_TIDAK_VALID');
	});
});

describe('maintenance transitions', () => {
	test('mengizinkan alur normal dan menolak completed kembali', () => {
		expect(() => assertMaintenanceTransition('reported', 'in_progress')).not.toThrow();
		expect(() => assertMaintenanceTransition('in_progress', 'completed')).not.toThrow();
		expectCode(
			() => assertMaintenanceTransition('completed', 'in_progress'),
			'TRANSISI_TIDAK_VALID'
		);
	});
});

describe('request transitions', () => {
	test('mengizinkan processing dan menolak fulfilled kembali', () => {
		expect(() => assertRequestTransition('submitted', 'processing')).not.toThrow();
		expect(() => assertRequestTransition('processing', 'partially_fulfilled')).not.toThrow();
		expectCode(() => assertRequestTransition('fulfilled', 'processing'), 'TRANSISI_TIDAK_VALID');
	});
});
