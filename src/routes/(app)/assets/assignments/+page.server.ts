import { requireUser } from '#lib/server/auth/guards.js';
import { listAssignments } from '#lib/server/services/assignments.js';
import type { PageServerLoad } from './$types';

function numberParam(value: string | null): number | null {
	if (!value) return null;
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const actor = requireUser(locals, url);
	const search = url.searchParams.get('search') ?? '';
	const location = url.searchParams.get('location') ?? '';
	const employee = url.searchParams.get('employee') ?? '';
	const from = url.searchParams.get('from') ?? '';
	const to = url.searchParams.get('to') ?? '';
	const page = Number(url.searchParams.get('page') ?? 1);

	const result = await listAssignments(actor, {
		search,
		locationId: numberParam(location),
		employeeId: numberParam(employee),
		from: from || undefined,
		to: to || undefined,
		page: Number.isFinite(page) ? page : 1,
		pageSize: 10
	});

	return {
		...result,
		search,
		location,
		employee,
		from,
		to,
		canCreate: actor.role !== 'outlet'
	};
};
