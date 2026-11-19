import { fail, redirect } from '@sveltejs/kit';
import { login } from '#lib/server/auth/service.js';
import { safeNextPath } from '#lib/server/auth/redirect.js';
import { setSessionCookie } from '#lib/server/auth/session.js';
import {
	checkLoginAllowed,
	recordLoginFailure,
	recordLoginSuccess
} from '#lib/server/auth/throttle.js';
import { DomainError } from '#lib/server/errors.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	const next = safeNextPath(url.searchParams.get('next')) ?? '';
	const rawReason = url.searchParams.get('reason');
	const reason = rawReason === 'expired' || rawReason === 'logout' ? rawReason : null;

	if (locals.user) {
		if (locals.user.mustChangePassword) {
			throw redirect(303, `/change-password?next=${encodeURIComponent(next || '/dashboard')}`);
		}
		throw redirect(303, next || '/dashboard');
	}

	return { next, reason };
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const form = await request.formData();
		const identifier = String(form.get('identifier') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const next = safeNextPath(String(form.get('next') ?? '')) ?? '/dashboard';
		const fieldErrors: { identifier?: string; password?: string } = {};

		if (!identifier) {
			fieldErrors.identifier = 'Username/email wajib diisi.';
		}
		if (!password) {
			fieldErrors.password = 'Password wajib diisi.';
		}

		if (Object.keys(fieldErrors).length > 0) {
			return fail(400, { identifier, fieldErrors });
		}

		let ipAddress: string | null;

		try {
			ipAddress = getClientAddress();
		} catch {
			ipAddress = null;
		}

		try {
			checkLoginAllowed(identifier, ipAddress);

			const { user, token } = await login(identifier, password, {
				userAgent: request.headers.get('user-agent'),
				ipAddress
			});

			recordLoginSuccess(identifier, ipAddress);
			setSessionCookie(cookies, token);

			if (user.mustChangePassword) {
				throw redirect(303, `/change-password?next=${encodeURIComponent(next)}`);
			}

			throw redirect(303, next);
		} catch (error) {
			if (error instanceof DomainError) {
				if (error.code === 'KREDENSIAL_SALAH') {
					recordLoginFailure(identifier, ipAddress);
				}

				const status = error.code === 'LOGIN_DIBATASI' ? 429 : 400;
				return fail(status, { identifier, error: error.message });
			}

			throw error;
		}
	}
};
