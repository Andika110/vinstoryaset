import { error } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import { parseReportFilters, runReport } from '#lib/server/services/reports.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const actor = requireUser(locals, url);
	const requestedPage = Number(url.searchParams.get('page') ?? 1);
	const filters = parseReportFilters(url);

	try {
		return await runReport(
			actor,
			params.key,
			filters,
			Number.isFinite(requestedPage) ? requestedPage : 1,
			20
		);
	} catch (err) {
		if (err instanceof DomainError) {
			throw error(err.code === 'TIDAK_DITEMUKAN' ? 404 : 403, err.message);
		}
		throw err;
	}
};
