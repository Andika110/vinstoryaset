import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import { createOpname, getOpnameFormOptions } from '#lib/server/services/opnames.js';
import type { Actions, PageServerLoad } from './$types';

function numberParam(value: FormDataEntryValue | null): number | null {
	const raw = String(value ?? '').trim();
	if (!raw) return null;
	const parsed = Number(raw);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const actor = requireUser(locals, url);
	try {
		return { options: await getOpnameFormOptions(actor) };
	} catch (err) {
		if (err instanceof DomainError) throw error(403, err.message);
		throw err;
	}
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const actor = requireUser(locals, url);
		const form = await request.formData();
		const locationId = numberParam(form.get('locationId'));
		const itemType = String(form.get('itemType') ?? '');
		const notes = String(form.get('notes') ?? '').trim() || null;
		const values = {
			locationId: locationId ? String(locationId) : '',
			itemType,
			notes: notes ?? ''
		};

		if (!locationId) {
			return fail(400, { values, error: 'Lokasi wajib dipilih.' });
		}
		if (itemType !== 'asset' && itemType !== 'inventory') {
			return fail(400, { values, error: 'Jenis opname tidak valid.' });
		}
		if (notes && notes.length > 500) {
			return fail(400, { values, error: 'Catatan maksimal 500 karakter.' });
		}

		try {
			const id = await createOpname(actor, { locationId, itemType, notes });
			throw redirect(303, `/opname/${id}?created=1`);
		} catch (err) {
			if (err instanceof DomainError) {
				return fail(400, { values, error: err.message });
			}
			throw err;
		}
	}
};
