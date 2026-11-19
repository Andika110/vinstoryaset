import { error, fail } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import {
	getUserDetail,
	resetUserPassword,
	revokeAllSessions,
	revokeSession
} from '#lib/server/services/users.js';
import type { Actions, PageServerLoad } from './$types';

function parseId(value: string): number {
	const id = Number(value);
	if (!Number.isInteger(id)) throw error(404, 'Pengguna tidak ditemukan.');
	return id;
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const actor = requireUser(locals, url);
	const id = parseId(params.id);

	try {
		return { user: await getUserDetail(actor, id) };
	} catch (err) {
		if (err instanceof DomainError) {
			throw error(err.code === 'TIDAK_DITEMUKAN' ? 404 : 403, err.message);
		}
		throw err;
	}
};

export const actions: Actions = {
	resetPassword: async ({ locals, params, url }) => {
		const actor = requireUser(locals, url);
		const id = parseId(params.id);

		try {
			const temporaryPassword = await resetUserPassword(actor, id);
			return { temporaryPassword };
		} catch (err) {
			if (err instanceof DomainError) {
				return fail(400, { error: err.message });
			}
			throw err;
		}
	},
	revokeSession: async ({ request, locals, params, url }) => {
		const actor = requireUser(locals, url);
		const id = parseId(params.id);
		const form = await request.formData();
		const sessionId = String(form.get('sessionId') ?? '').trim();

		if (!sessionId) {
			return fail(400, { error: 'Sesi tidak valid.' });
		}

		try {
			await revokeSession(actor, id, sessionId);
			return { success: 'Sesi berhasil dicabut.' };
		} catch (err) {
			if (err instanceof DomainError) {
				return fail(400, { error: err.message });
			}
			throw err;
		}
	},
	revokeAllSessions: async ({ locals, params, url }) => {
		const actor = requireUser(locals, url);
		const id = parseId(params.id);

		try {
			await revokeAllSessions(actor, id);
			return { success: 'Semua sesi pengguna berhasil dicabut.' };
		} catch (err) {
			if (err instanceof DomainError) {
				return fail(400, { error: err.message });
			}
			throw err;
		}
	}
};
