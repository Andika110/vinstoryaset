import { redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const actor = requireUser(locals, url);
	const code = (url.searchParams.get('code') ?? '').trim();
	if (code) {
		throw redirect(303, `/scan/${encodeURIComponent(code)}`);
	}
	return { actorRole: actor.role };
};
