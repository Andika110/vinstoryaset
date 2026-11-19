import { describe, expect, test } from 'bun:test';
import { assertCan, assertInScope, can, scopeToUser } from '#lib/server/auth/permissions.js';
import type { AuthUser } from '#lib/server/auth/session.js';
import { DomainError } from '#lib/server/errors.js';

function actor(role: 'admin' | 'support' | 'outlet', outletId: number | null = null): AuthUser {
	return {
		id: 1,
		username: `${role}-user`,
		email: `${role}@example.local`,
		fullName: role,
		role,
		outletId,
		outletName: null,
		mustChangePassword: false
	};
}

describe('permission matrix', () => {
	test('outlet hanya boleh aksi own dengan outlet yang cocok', () => {
		const outlet = actor('outlet', 5);
		expect(can(outlet, 'asset:read', { outletId: 5 })).toBe(true);
		expect(can(outlet, 'asset:read', { outletId: 6 })).toBe(false);
		expect(can(outlet, 'opname:assist')).toBe(true);
		expect(can(outlet, 'opname:write')).toBe(false);
	});

	test('support memiliki akses operasional dan master data terbatas', () => {
		const support = actor('support');
		expect(can(support, 'asset:write')).toBe(true);
		expect(can(support, 'opname:write')).toBe(true);
		expect(can(support, 'audit:read:limited')).toBe(true);
		expect(can(support, 'masterdata:write', { masterType: 'brand' })).toBe(true);
		expect(can(support, 'masterdata:write', { masterType: 'outlet' })).toBe(false);
	});

	test('admin memiliki akses penuh', () => {
		const admin = actor('admin');
		expect(can(admin, 'apa-saja')).toBe(true);
		expect(() => assertCan(admin, 'user:write')).not.toThrow();
	});
});

describe('outlet scope', () => {
	test('scopeToUser membatasi outlet dan membebaskan admin/support', () => {
		expect(scopeToUser(actor('outlet', 5))).toEqual({
			role: 'outlet',
			outletId: 5,
			allOutlets: false
		});
		expect(scopeToUser(actor('support')).allOutlets).toBe(true);
		expect(scopeToUser(actor('admin')).allOutlets).toBe(true);
	});

	test('assertInScope menyembunyikan data outlet lain sebagai tidak ditemukan', () => {
		const outlet = actor('outlet', 5);
		expect(() => assertInScope(outlet, { outletId: 5 })).not.toThrow();
		try {
			assertInScope(outlet, { outletId: 6 });
			throw new Error('Seharusnya ditolak.');
		} catch (error) {
			expect(error).toBeInstanceOf(DomainError);
			expect((error as DomainError).code).toBe('TIDAK_DITEMUKAN');
		}
	});
});
