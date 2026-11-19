import { requireUser } from '#lib/server/auth/guards.js';
import { listInventoryItems } from '#lib/server/services/inventory.js';
import type { PageServerLoad } from './$types';

function numberParam(value: string | null): number | null {
	if (!value) return null;
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const actor = requireUser(locals, url);
	const search = url.searchParams.get('search') ?? '';
	const category = url.searchParams.get('category') ?? '';
	const location = url.searchParams.get('location') ?? '';
	const stock = url.searchParams.get('stock') ?? '';
	const page = Number(url.searchParams.get('page') ?? 1);

	const result = await listInventoryItems(actor, {
		search,
		categoryId: numberParam(category),
		locationId: numberParam(location),
		stock: stock || undefined,
		page: Number.isFinite(page) ? page : 1,
		pageSize: 10
	});

	return {
		...result,
		search,
		category,
		location,
		stock,
		canCreate: actor.role !== 'outlet'
	};
};
