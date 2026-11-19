import { error } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import { getMasterMeta, listMasterData } from '#lib/server/services/master-data.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const actor = requireUser(locals, url);
	const search = url.searchParams.get('search') ?? '';
	const requestedPage = Number(url.searchParams.get('page') ?? 1);

	try {
		const meta = getMasterMeta(params.type);
		const result = await listMasterData(actor, params.type, {
			search,
			page: Number.isFinite(requestedPage) ? requestedPage : 1,
			pageSize: 10
		});
		const canWrite = actor.role === 'admin' || meta.supportCanWrite;

		return {
			...result,
			search,
			canCreate: canWrite && meta.canCreate,
			canEdit: canWrite && meta.canEdit,
			canDeactivate: actor.role === 'admin' && meta.canDeactivate
		};
	} catch (err) {
		if (err instanceof DomainError) {
			throw error(err.code === 'TIDAK_DITEMUKAN' ? 404 : 403, err.message);
		}
		throw err;
	}
};
