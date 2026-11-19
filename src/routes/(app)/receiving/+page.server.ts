import { requireUser } from '#lib/server/auth/guards.js';
import { listReceivings } from '#lib/server/services/receivings.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const actor = requireUser(locals, url);
	const search = url.searchParams.get('search') ?? '';
	const type = url.searchParams.get('type') ?? '';
	const from = url.searchParams.get('from') ?? '';
	const to = url.searchParams.get('to') ?? '';
	const page = Number(url.searchParams.get('page') ?? 1);

	const result = await listReceivings(actor, {
		search,
		type: type || undefined,
		from: from || undefined,
		to: to || undefined,
		page: Number.isFinite(page) ? page : 1,
		pageSize: 10
	});

	return { ...result, search, type, from, to };
};
