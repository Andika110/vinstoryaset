import { redirect } from '@sveltejs/kit';
import type { AuthUser } from './session.js';

export function requireUser(locals: App.Locals, url?: URL): AuthUser {
	if (!locals.user) {
		const search = new URLSearchParams();

		if (locals.sessionExpired) {
			search.set('reason', 'expired');
		}

		if (url) {
			search.set('next', `${url.pathname}${url.search}`);
		}

		const query = search.toString();
		throw redirect(303, `/login${query ? `?${query}` : ''}`);
	}

	return locals.user;
}
