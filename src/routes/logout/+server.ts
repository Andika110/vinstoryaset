import { error, redirect } from '@sveltejs/kit';
import { clearSessionCookie, getSessionToken, revokeSession } from '#lib/server/auth/session.js';

export const POST = async ({ cookies, request }) => {
	const origin = request.headers.get('origin');

	if (origin) {
		let originHost: string;

		try {
			originHost = new URL(origin).host;
		} catch {
			throw error(403, 'Permintaan tidak valid.');
		}

		if (originHost !== request.headers.get('host')) {
			throw error(403, 'Permintaan tidak valid.');
		}
	}

	const token = getSessionToken(cookies);

	if (token) {
		await revokeSession(token);
	}

	clearSessionCookie(cookies);
	throw redirect(303, '/login?reason=logout');
};
