import { error } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import { IMPORT_TYPES, listImportBatches } from '#lib/server/services/imports.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const actor = requireUser(locals, url);
	const page = Number(url.searchParams.get('page') ?? 1);

	try {
		const history = await listImportBatches(actor, Number.isFinite(page) ? page : 1, 10);
		return { types: IMPORT_TYPES, history };
	} catch (err) {
		if (err instanceof DomainError) {
			throw error(403, err.message);
		}
		throw err;
	}
};
