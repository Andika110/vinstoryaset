import { error } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import { findAssetByCode } from '#lib/server/services/qr.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const actor = requireUser(locals, url);
	const code = (params.code ?? '').trim();
	if (!code || code.length > 100 || code === '.' || code === '..') {
		throw error(404, 'Kode QR tidak valid.');
	}

	try {
		const asset = await findAssetByCode(actor, code);
		if (!asset) {
			throw error(404, `Aset dengan kode "${code}" tidak ditemukan atau di luar cakupan Anda.`);
		}
		return { asset };
	} catch (err) {
		if (err instanceof DomainError) {
			throw error(err.code === 'TIDAK_DITEMUKAN' ? 404 : 403, err.message);
		}
		throw err;
	}
};
