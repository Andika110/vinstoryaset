import { error } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import { listActiveOutlets, listUsers } from '#lib/server/services/users.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const actor = requireUser(locals, url);
	const search = url.searchParams.get('search') ?? '';
	const role = url.searchParams.get('role') ?? '';
	const outlet = url.searchParams.get('outlet') ?? '';
	const status = url.searchParams.get('status') ?? '';
	const requestedPage = Number(url.searchParams.get('page') ?? 1);
	const outletId = outlet ? Number(outlet) : null;

	try {
		const [result, outletOptions] = await Promise.all([
			listUsers(actor, {
				search,
				role,
				outletId: outletId !== null && Number.isInteger(outletId) ? outletId : null,
				status,
				page: Number.isFinite(requestedPage) ? requestedPage : 1,
				pageSize: 10
			}),
			listActiveOutlets(actor)
		]);

		return {
			...result,
			search,
			role,
			outlet,
			status,
			outlets: outletOptions
		};
	} catch (err) {
		if (err instanceof DomainError) {
			throw error(err.code === 'TIDAK_DITEMUKAN' ? 404 : 403, err.message);
		}
		throw err;
	}
};
