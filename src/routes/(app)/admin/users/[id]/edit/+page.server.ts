import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import { getUserDetail, listActiveOutlets, updateUser } from '#lib/server/services/users.js';
import type { Actions, PageServerLoad } from './$types';

function parseOutletId(value: FormDataEntryValue | null): number | null {
	const raw = String(value ?? '').trim();
	if (!raw) return null;
	const parsed = Number(raw);
	return Number.isInteger(parsed) ? parsed : null;
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const actor = requireUser(locals, url);
	const id = Number(params.id);

	if (!Number.isInteger(id)) {
		throw error(404, 'Pengguna tidak ditemukan.');
	}

	try {
		const [user, outlets] = await Promise.all([getUserDetail(actor, id), listActiveOutlets(actor)]);

		return { user, outlets };
	} catch (err) {
		if (err instanceof DomainError) {
			throw error(err.code === 'TIDAK_DITEMUKAN' ? 404 : 403, err.message);
		}
		throw err;
	}
};

export const actions: Actions = {
	default: async ({ request, locals, params, url }) => {
		const actor = requireUser(locals, url);
		const id = Number(params.id);

		if (!Number.isInteger(id)) {
			throw error(404, 'Pengguna tidak ditemukan.');
		}

		const form = await request.formData();
		const username = String(form.get('username') ?? '').trim();
		const email = String(form.get('email') ?? '').trim();
		const fullName = String(form.get('fullName') ?? '').trim();
		const roleRaw = String(form.get('role') ?? '');
		const role =
			roleRaw === 'support' || roleRaw === 'outlet' || roleRaw === 'admin' ? roleRaw : 'admin';
		const outletId = parseOutletId(form.get('outletId'));
		const isActive = form.get('isActive') === 'on';
		const fieldErrors: Record<string, string> = {};

		if (!username) fieldErrors.username = 'Username wajib diisi.';
		if (!email) fieldErrors.email = 'Email wajib diisi.';
		if (!fullName) fieldErrors.fullName = 'Nama lengkap wajib diisi.';
		if (role === 'outlet' && outletId === null) {
			fieldErrors.outletId = 'Outlet wajib dipilih untuk role Outlet Management.';
		}
		if (!['admin', 'support', 'outlet'].includes(roleRaw)) {
			fieldErrors.role = 'Role tidak valid.';
		}

		const values = { username, email, fullName, role, outletId, isActive };

		if (Object.keys(fieldErrors).length > 0) {
			return fail(400, { values, fieldErrors });
		}

		try {
			await updateUser(actor, id, {
				username,
				email,
				fullName,
				role,
				outletId,
				isActive
			});
			throw redirect(303, `/admin/users/${id}`);
		} catch (err) {
			if (err instanceof DomainError) {
				return fail(400, { values, error: err.message });
			}
			throw err;
		}
	}
};
