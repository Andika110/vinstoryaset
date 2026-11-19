import { requireUser } from '#lib/server/auth/guards.js';
import { listOpnames } from '#lib/server/services/opnames.js';
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
	const itemType = url.searchParams.get('type') ?? '';
	const location = url.searchParams.get('location') ?? '';
	const from = url.searchParams.get('from') ?? '';
	const to = url.searchParams.get('to') ?? '';
	const page = Number(url.searchParams.get('page') ?? 1);

	const result = await listOpnames(actor, {
		search,
		status,
		itemType,
		locationId: numberParam(location),
		from: from || undefined,
		to: to || undefined,
		page: Number.isFinite(page) ? page : 1,
		pageSize: 15
	});

	return {
		...result,
		search,
		status,
		itemType,
		location,
		from,
		to,
		canManage: actor.role !== 'outlet'
	};
};
