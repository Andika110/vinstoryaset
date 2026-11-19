import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import {
	cancelRequest,
	fulfillRequest,
	getRequestDetail,
	processRequest,
	rejectRequest
} from '#lib/server/services/requests.js';
import type { Actions, PageServerLoad } from './$types';

function parseId(value: string): number | null {
	const id = Number(value);
	return Number.isInteger(id) && id > 0 ? id : null;
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const actor = requireUser(locals, url);
	const id = parseId(params.id);
	if (id === null) throw error(404, 'Request tidak ditemukan.');

	try {
		return { request: await getRequestDetail(actor, id) };
	} catch (err) {
		if (err instanceof DomainError) {
			throw error(err.code === 'TIDAK_DITEMUKAN' ? 404 : 403, err.message);
		}
		throw err;
	}
};

export const actions: Actions = {
	proses: async ({ locals, params, url }) => {
		const actor = requireUser(locals, url);
		const id = parseId(params.id);
		if (id === null) return fail(404, { error: 'Request tidak ditemukan.' });
		try {
			await processRequest(actor, id);
			throw redirect(303, `/requests/${id}`);
		} catch (err) {
			if (err instanceof DomainError) {
				return fail(err.code === 'DILARANG' ? 403 : 400, { error: err.message });
			}
			throw err;
		}
	},
	fulfill: async ({ request, locals, params, url }) => {
		const actor = requireUser(locals, url);
		const id = parseId(params.id);
		if (id === null) return fail(404, { error: 'Request tidak ditemukan.' });

		const form = await request.formData();
		const sourceLocationId = Number(String(form.get('sourceLocationId') ?? '').trim());
		const submissionId = String(form.get('submissionId') ?? '').trim();
		const lines: { lineId: number; quantity: number }[] = [];

		for (const [key, value] of form.entries()) {
			if (!key.startsWith('fulfill_')) continue;
			const lineId = Number(key.slice('fulfill_'.length));
			const quantity = Number(String(value ?? '').trim());
			if (quantity > 0) lines.push({ lineId, quantity });
		}

		if (!sourceLocationId) {
			return fail(400, { fieldErrors: { sourceLocationId: 'Lokasi stok wajib dipilih.' } });
		}

		try {
			await fulfillRequest(actor, id, {
				sourceLocationId,
				lines,
				submissionId
			});
			throw redirect(303, `/requests/${id}`);
		} catch (err) {
			if (err instanceof DomainError) {
				return fail(err.code === 'DILARANG' ? 403 : 400, { error: err.message });
			}
			throw err;
		}
	},
	tolak: async ({ request, locals, params, url }) => {
		const actor = requireUser(locals, url);
		const id = parseId(params.id);
		if (id === null) return fail(404, { error: 'Request tidak ditemukan.' });
		const form = await request.formData();
		const reason = String(form.get('rejectionReason') ?? '').trim();
		if (!reason) {
			return fail(400, { fieldErrors: { rejectionReason: 'Alasan penolakan wajib diisi.' } });
		}
		try {
			await rejectRequest(actor, id, reason);
			throw redirect(303, `/requests/${id}`);
		} catch (err) {
			if (err instanceof DomainError) {
				return fail(err.code === 'DILARANG' ? 403 : 400, { error: err.message });
			}
			throw err;
		}
	},
	batalkan: async ({ locals, params, url }) => {
		const actor = requireUser(locals, url);
		const id = parseId(params.id);
		if (id === null) return fail(404, { error: 'Request tidak ditemukan.' });
		try {
			await cancelRequest(actor, id);
			throw redirect(303, `/requests/${id}`);
		} catch (err) {
			if (err instanceof DomainError) {
				return fail(err.code === 'DILARANG' ? 403 : 400, { error: err.message });
			}
			throw err;
		}
	}
};
