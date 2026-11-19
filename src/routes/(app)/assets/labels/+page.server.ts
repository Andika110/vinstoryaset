import { requireUser } from '#lib/server/auth/guards.js';
import { assetStatusEnum } from '#lib/server/db/schema/index.js';
import { ASSET_STATUS_LABEL } from '#lib/server/domain/transitions.js';
import { listAssets } from '#lib/server/services/assets.js';
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
	const status = url.searchParams.get('status') ?? '';
	const requestedPage = Number(url.searchParams.get('page') ?? 1);

	const result = await listAssets(actor, {
		search,
		categoryId: numberParam(category),
		locationId: numberParam(location),
		status: status || undefined,
		page: Number.isFinite(requestedPage) ? requestedPage : 1,
		pageSize: 24
	});

	return {
		...result,
		search,
		category,
		location,
		status,
		statuses: assetStatusEnum.enumValues.map((value) => ({
			value,
			label: ASSET_STATUS_LABEL[value]
		}))
	};
};
