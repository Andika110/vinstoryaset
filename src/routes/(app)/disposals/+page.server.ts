import { error } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import { listDisposals } from '#lib/server/services/disposals.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const actor = requireUser(locals, url);
	const search = url.searchParams.get('search') ?? '';
	const reason = url.searchParams.get('reason') ?? '';
	const status = url.searchParams.get('status') ?? '';
	const from = url.searchParams.get('from') ?? '';
	const to = url.searchParams.get('to') ?? '';
	const page = Number(url.searchParams.get('page') ?? 1);

	try {
		const result = await listDisposals(actor, {
			search,
			reason,
			status,
			from: from || undefined,
			to: to || undefined,
			page: Number.isFinite(page) ? page : 1,
			pageSize: 15
		});
		return { ...result, search, reason, status, from, to };
	} catch (err) {
		if (err instanceof DomainError) throw error(403, err.message);
		throw err;
	}
};
