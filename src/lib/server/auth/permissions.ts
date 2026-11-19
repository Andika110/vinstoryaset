import type { Role } from '#lib/navigation.js';
import type { AuthUser } from './session.js';
import { DomainError } from '#lib/server/errors.js';
import { MESSAGES } from '#lib/messages.js';

export const PERMISSIONS: Record<Role, string[]> = {
	admin: ['*'],
	support: [
		'asset:read',
		'asset:write',
		'asset:mutate',
		'inventory:read',
		'inventory:write',
		'stock:in',
		'stock:out',
		'request:process',
		'loan:write',
		'maintenance:write',
		'opname:write',
		'disposal:write',
		'report:read:all',
		'audit:read:limited',
		'masterdata:read',
		'masterdata:write:limited',
		'import:write'
	],
	outlet: [
		'asset:read:own',
		'inventory:read:own',
		'request:create',
		'request:read:own',
		'request:cancel',
		'maintenance:report',
		'opname:assist',
		'report:read:own',
		'mutation:read:own'
	]
};

export type Resource = {
	outletId?: number | null;
	status?: string | null;
	masterType?: string | null;
	[key: string]: unknown;
};

export type Scope = {
	role: Role;
	outletId: number | null;
	allOutlets: boolean;
};

const SUPPORT_MASTER_DATA = new Set([
	'brand',
	'model',
	'asset-category',
	'asset_category',
	'inventory-category',
	'inventory_category',
	'inventory_item',
	'supplier',
	'employee',
	'unit'
]);

export function can(user: AuthUser, action: string, resource?: Resource): boolean {
	const permissions = PERMISSIONS[user.role];

	if (permissions.includes('*')) return true;

	const exact = permissions.includes(action);
	const all = permissions.includes(`${action}:all`);
	const own = permissions.includes(`${action}:own`);
	const limited = permissions.includes(`${action}:limited`);

	if (!exact && !all && !own && !limited) return false;

	if (own) {
		if (!resource || resource.outletId == null || resource.outletId !== user.outletId) {
			return false;
		}
	}

	if (limited) {
		if (
			action === 'masterdata:write' &&
			(!resource?.masterType || !SUPPORT_MASTER_DATA.has(resource.masterType))
		) {
			return false;
		}
	}

	if (action === 'request:cancel' && user.role === 'outlet') {
		return resource?.status === 'submitted';
	}

	return true;
}

export function assertCan(user: AuthUser, action: string, resource?: Resource): void {
	if (!can(user, action, resource)) {
		throw new DomainError('DILARANG', MESSAGES.noPermission);
	}
}

/**
 * Scope terpusat untuk query daftar/laporan.
 * Role outlet selalu dibatasi ke outlet miliknya; admin/support melihat semua lokasi.
 */
export function scopeToUser(user: AuthUser): Scope {
	if (user.role === 'outlet') {
		if (user.outletId == null) {
			throw new DomainError('DILARANG', 'Akun outlet belum memiliki outlet.');
		}
		return { role: 'outlet', outletId: user.outletId, allOutlets: false };
	}

	return { role: user.role, outletId: null, allOutlets: true };
}

/**
 * Detail record di luar outlet pengguna dijawab sebagai tidak ditemukan,
 * bukan dilarang, agar keberadaan data tidak bocor.
 */
export function assertInScope(user: AuthUser, resource?: Resource): void {
	if (user.role !== 'outlet') return;

	if (!resource || resource.outletId == null || resource.outletId !== user.outletId) {
		throw new DomainError('TIDAK_DITEMUKAN', 'Data tidak ditemukan.');
	}
}
