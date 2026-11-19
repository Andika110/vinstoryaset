import { error } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import { getDashboard } from '#lib/server/services/dashboard.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const actor = requireUser(locals, url);

	try {
		return { dashboard: await getDashboard(actor) };
	} catch (err) {
		if (err instanceof DomainError) {
			throw error(403, err.message);
		}
		throw err;
	}
};
