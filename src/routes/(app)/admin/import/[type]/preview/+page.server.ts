import { fail, error, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import { confirmImport, getImportPreview } from '#lib/server/services/imports.js';
import type { Actions, PageServerLoad } from './$types';

function toHttpError(err: unknown): never {
	if (err instanceof DomainError) {
		throw error(err.code === 'TIDAK_DITEMUKAN' ? 404 : 403, err.message);
	}
	throw err;
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const actor = requireUser(locals, url);
	const token = url.searchParams.get('token') ?? '';
	if (!token) throw error(404, 'Sesi pratinjau tidak ditemukan.');

	try {
		const preview = await getImportPreview(actor, token);
		if (preview.type.key !== params.type) throw error(404, 'Sesi pratinjau tidak sesuai.');
		return { preview };
	} catch (err) {
		toHttpError(err);
	}
};

export const actions: Actions = {
	default: async ({ locals, url }) => {
		const actor = requireUser(locals, url);
		const token = url.searchParams.get('token') ?? '';
		if (!token) return fail(400, { error: 'Sesi pratinjau tidak ditemukan.' });

		try {
			const result = await confirmImport(actor, token);
			throw redirect(303, `/admin/import/batch/${result.batchId}`);
		} catch (err) {
			if (err instanceof DomainError) {
				return fail(400, { error: err.message });
			}
			throw err;
		}
	}
};
