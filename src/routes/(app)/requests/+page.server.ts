import { requireUser } from '#lib/server/auth/guards.js';
import { listRequests } from '#lib/server/services/requests.js';
import type { PageServerLoad } from './$types';

function numberParam(value: string | null): number | null {
	if (!value) return null;
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const actor = requireUser(locals, url);
	const search = url.searchParams.get('search') ?? '';
	const status = url.searchParams.get('status') ?? '';
	const outlet = url.searchParams.get('outlet') ?? '';
	const from = url.searchParams.get('from') ?? '';
	const to = url.searchParams.get('to') ?? '';
	const page = Number(url.searchParams.get('page') ?? 1);

	const result = await listRequests(actor, {
		search,
		status: status || undefined,
		outletId: numberParam(outlet),
		from: from || undefined,
		to: to || undefined,
		page: Number.isFinite(page) ? page : 1,
		pageSize: 10
	});

	return {
		...result,
		search,
		status,
		outlet,
		from,
		to,
		isOutlet: actor.role === 'outlet',
		canCreate: actor.role === 'outlet'
	};
};
