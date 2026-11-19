import { requireUser } from '#lib/server/auth/guards.js';
import { listLoans } from '#lib/server/services/loans.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const actor = requireUser(locals, url);
	const search = url.searchParams.get('search') ?? '';
	const status = url.searchParams.get('status') ?? '';
	const from = url.searchParams.get('from') ?? '';
	const to = url.searchParams.get('to') ?? '';
	const page = Number(url.searchParams.get('page') ?? 1);

	const result = await listLoans(actor, {
		search,
		status: status || undefined,
		from: from || undefined,
		to: to || undefined,
		page: Number.isFinite(page) ? page : 1,
		pageSize: 10
	});

	return {
		...result,
		search,
		status,
		from,
		to,
		canCreate: actor.role !== 'outlet'
	};
};
