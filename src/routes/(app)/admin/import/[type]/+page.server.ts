import { fail, error, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import {
	createImportPreview,
	getImportType,
	parseImportFile,
	requireImportAccess
} from '#lib/server/services/imports.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const actor = requireUser(locals, url);
	const definition = getImportType(params.type);
	if (!definition) throw error(404, 'Jenis impor tidak ditemukan.');

	try {
		requireImportAccess(actor);
	} catch (err) {
		if (err instanceof DomainError) throw error(403, err.message);
		throw err;
	}

	return { type: definition };
};

export const actions: Actions = {
	default: async ({ request, locals, params, url }) => {
		const actor = requireUser(locals, url);
		const definition = getImportType(params.type);
		if (!definition) throw error(404, 'Jenis impor tidak ditemukan.');

		try {
			requireImportAccess(actor);
		} catch (err) {
			if (err instanceof DomainError) throw error(403, err.message);
			throw err;
		}

		const form = await request.formData();
		const file = form.get('file');
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { error: 'Pilih file Excel atau CSV yang akan diimpor.' });
		}

		const autoCreate = form.get('auto_create') === 'on';

		const displayName = file.name.replace(/[^\w.\- ()]/g, '').slice(0, 120) || 'import';
		try {
			const buffer = Buffer.from(await file.arrayBuffer());
			const parsed = await parseImportFile(definition, displayName, buffer);
			const preview = await createImportPreview(
				actor,
				definition.key,
				parsed.fileName,
				parsed.rows,
				autoCreate
			);
			throw redirect(303, `/admin/import/${definition.key}/preview?token=${preview.token}`);
		} catch (err) {
			if (err instanceof DomainError) {
				return fail(400, { error: err.message });
			}
			throw err;
		}
	}
};
