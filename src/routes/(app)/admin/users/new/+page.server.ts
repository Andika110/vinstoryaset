import { fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import { createUser, listActiveOutlets } from '#lib/server/services/users.js';
import type { Actions, PageServerLoad } from './$types';

function parseOutletId(value: FormDataEntryValue | null): number | null {
	const raw = String(value ?? '').trim();
	if (!raw) return null;
	const parsed = Number(raw);
	return Number.isInteger(parsed) ? parsed : null;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const actor = requireUser(locals, url);
	const outlets = await listActiveOutlets(actor);
	return { outlets };
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const actor = requireUser(locals, url);
		const form = await request.formData();

		const username = String(form.get('username') ?? '').trim();
		const email = String(form.get('email') ?? '').trim();
		const fullName = String(form.get('fullName') ?? '').trim();
		const roleRaw = String(form.get('role') ?? '');
		const role =
			roleRaw === 'support' || roleRaw === 'outlet' || roleRaw === 'admin' ? roleRaw : 'admin';
		const outletId = parseOutletId(form.get('outletId'));
		const password = String(form.get('password') ?? '');
		const isActive = form.get('isActive') === 'on';
		const fieldErrors: Record<string, string> = {};

		if (!username) fieldErrors.username = 'Username wajib diisi.';
		if (!email) fieldErrors.email = 'Email wajib diisi.';
		if (!fullName) fieldErrors.fullName = 'Nama lengkap wajib diisi.';
		if (password.length < 8) fieldErrors.password = 'Password awal minimal 8 karakter.';
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
			const id = await createUser(actor, {
				username,
				email,
				fullName,
				role,
				outletId,
				password,
				isActive
			});
			throw redirect(303, `/admin/users/${id}`);
		} catch (error) {
			if (error instanceof DomainError) {
				return fail(400, { values, error: error.message });
			}
			throw error;
		}
	}
};
