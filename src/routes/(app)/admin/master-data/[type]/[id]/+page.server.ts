import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import {
	deactivateMasterData,
	getMasterFormOptions,
	getMasterMeta,
	getMasterRecord,
	saveMasterData
} from '#lib/server/services/master-data.js';
import type { Actions, PageServerLoad } from './$types';

function parseId(value: string): number | null {
	if (value === 'new') return null;
	const id = Number(value);
	return Number.isInteger(id) ? id : null;
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const actor = requireUser(locals, url);

	try {
		const meta = getMasterMeta(params.type);
		const id = parseId(params.id);
		const canWrite = actor.role === 'admin' || meta.supportCanWrite;

		if (!canWrite) throw error(403, 'Anda tidak punya akses untuk mengubah master data ini.');
		if (id === null && !meta.canCreate) throw error(404, 'Master data ini tidak dapat ditambah.');
		if (id !== null && !meta.canEdit) throw error(404, 'Master data ini tidak dapat diubah.');

		const [record, options] = await Promise.all([
			id === null ? Promise.resolve(null) : getMasterRecord(actor, params.type, id),
			getMasterFormOptions(actor)
		]);

		return {
			meta,
			id,
			mode: id === null ? 'create' : 'edit',
			record,
			options,
			canManageActive: actor.role === 'admin',
			canDeactivate: actor.role === 'admin' && meta.canDeactivate && id !== null
		};
	} catch (err) {
		if (err instanceof DomainError) {
			throw error(err.code === 'TIDAK_DITEMUKAN' ? 404 : 403, err.message);
		}
		throw err;
	}
};

export const actions: Actions = {
	save: async ({ request, locals, params, url }) => {
		const actor = requireUser(locals, url);
		const meta = getMasterMeta(params.type);
		const id = parseId(params.id);
		const form = await request.formData();
		const values: Record<string, unknown> = {};
		const fieldErrors: Record<string, string> = {};

		for (const field of meta.fields) {
			if (field.type === 'checkbox') {
				values[field.name] = form.get(field.name) === 'on';
			} else if (field.type === 'select' && field.optionsSource) {
				const raw = String(form.get(field.name) ?? '').trim();
				values[field.name] = raw ? Number(raw) : null;
			} else {
				values[field.name] = String(form.get(field.name) ?? '').trim();
			}

			if (
				field.required &&
				(values[field.name] === null ||
					values[field.name] === undefined ||
					values[field.name] === '')
			) {
				fieldErrors[field.name] = `${field.label} wajib diisi.`;
			}
		}

		if (Object.keys(fieldErrors).length > 0) {
			return fail(400, { values, fieldErrors });
		}

		try {
			await saveMasterData(actor, params.type, id, values);
			throw redirect(303, `/admin/master-data/${meta.type}`);
		} catch (err) {
			if (err instanceof DomainError) {
				return fail(400, { values, error: err.message });
			}
			throw err;
		}
	},
	deactivate: async ({ locals, params, url }) => {
		const actor = requireUser(locals, url);
		const meta = getMasterMeta(params.type);
		const id = parseId(params.id);

		if (id === null) {
			return fail(400, { error: 'Data tidak valid.' });
		}

		try {
			await deactivateMasterData(actor, params.type, id);
			throw redirect(303, `/admin/master-data/${meta.type}`);
		} catch (err) {
			if (err instanceof DomainError) {
				return fail(400, { error: err.message });
			}
			throw err;
		}
	}
};
