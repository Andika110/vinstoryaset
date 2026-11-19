import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import { cancelDisposal, getDisposalDetail } from '#lib/server/services/disposals.js';
import type { Actions, PageServerLoad } from './$types';

function parseId(value: string): number | null {
	const id = Number(value);
	return Number.isInteger(id) && id > 0 ? id : null;
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const actor = requireUser(locals, url);
	const id = parseId(params.id);
	if (id === null) throw error(404, 'Disposal tidak ditemukan.');

	try {
		const detail = await getDisposalDetail(actor, id);
		return {
			...detail,
			notice: {
				created: url.searchParams.get('created') === '1',
				cancelled: url.searchParams.get('cancelled') === '1'
			}
		};
	} catch (err) {
		if (err instanceof DomainError) {
			throw error(err.code === 'TIDAK_DITEMUKAN' ? 404 : 403, err.message);
		}
		throw err;
	}
};

export const actions: Actions = {
	cancel: async ({ request, locals, params, url }) => {
		const actor = requireUser(locals, url);
		const id = parseId(params.id);
		if (id === null) throw error(404, 'Disposal tidak ditemukan.');
		const form = await request.formData();
		const reason = String(form.get('reason') ?? '');

		try {
			await cancelDisposal(actor, id, reason);
			throw redirect(303, `/disposals/${id}?cancelled=1`);
		} catch (err) {
			if (err instanceof DomainError) {
				return fail(400, { error: err.message });
			}
			throw err;
		}
	}
};
