import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import { cancelLoan, getLoanDetail, returnLoan } from '#lib/server/services/loans.js';
import type { Actions, PageServerLoad } from './$types';

function parseId(value: string): number | null {
	const id = Number(value);
	return Number.isInteger(id) && id > 0 ? id : null;
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const actor = requireUser(locals, url);
	const id = parseId(params.id);
	if (id === null) throw error(404, 'Peminjaman tidak ditemukan.');

	try {
		return { loan: await getLoanDetail(actor, id) };
	} catch (err) {
		if (err instanceof DomainError) {
			throw error(err.code === 'TIDAK_DITEMUKAN' ? 404 : 403, err.message);
		}
		throw err;
	}
};

export const actions: Actions = {
	kembalikan: async ({ request, locals, params, url }) => {
		const actor = requireUser(locals, url);
		const id = parseId(params.id);
		if (id === null) return fail(404, { error: 'Peminjaman tidak ditemukan.' });

		const form = await request.formData();
		const actualReturnDate = String(form.get('actualReturnDate') ?? '').trim();
		const conditionAfterId = String(form.get('conditionAfterId') ?? '').trim();
		const notes = String(form.get('notes') ?? '').trim();
		const fieldErrors: Record<string, string> = {};

		if (!actualReturnDate) fieldErrors.actualReturnDate = 'Tanggal kembali wajib diisi.';
		if (!conditionAfterId) {
			fieldErrors.conditionAfterId = 'Kondisi setelah kembali wajib dipilih.';
		}

		if (Object.keys(fieldErrors).length > 0) {
			return fail(400, { fieldErrors });
		}

		try {
			await returnLoan(actor, id, {
				actualReturnDate,
				conditionAfterId: Number(conditionAfterId),
				notes: notes || null
			});
			throw redirect(303, `/assets/loans/${id}`);
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
		if (id === null) return fail(404, { error: 'Peminjaman tidak ditemukan.' });

		try {
			await cancelLoan(actor, id);
			throw redirect(303, `/assets/loans/${id}`);
		} catch (err) {
			if (err instanceof DomainError) {
				return fail(err.code === 'DILARANG' ? 403 : 400, { error: err.message });
			}
			throw err;
		}
	}
};
