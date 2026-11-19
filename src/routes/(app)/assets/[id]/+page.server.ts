import { error } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import { getAssetDetail } from '#lib/server/services/assets.js';
import type { PageServerLoad } from './$types';

function parseId(value: string): number | null {
	const id = Number(value);
	return Number.isInteger(id) && id > 0 ? id : null;
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const actor = requireUser(locals, url);
	const id = parseId(params.id);

	if (id === null) throw error(404, 'Aset tidak ditemukan.');

	try {
		return await getAssetDetail(actor, id, {
			tab: url.searchParams.get('tab'),
			historyType: url.searchParams.get('jenis')
		});
	} catch (err) {
		if (err instanceof DomainError) {
			throw error(err.code === 'TIDAK_DITEMUKAN' ? 404 : 403, err.message);
		}
		throw err;
	}
};
