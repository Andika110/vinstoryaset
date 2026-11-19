import { requireUser } from '#lib/server/auth/guards.js';
import { getReportOverview } from '#lib/server/services/reports.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const actor = requireUser(locals, url);
	return { groups: getReportOverview(actor) };
};
