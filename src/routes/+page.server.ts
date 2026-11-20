import { redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	requireUser(locals);
	throw redirect(303, '/dashboard');
};
