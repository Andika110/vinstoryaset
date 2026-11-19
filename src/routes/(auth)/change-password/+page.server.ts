import { fail, redirect } from '@sveltejs/kit';
import { safeNextPath } from '#lib/server/auth/redirect.js';
import { changeOwnPassword } from '#lib/server/auth/service.js';
import { getSessionToken, hashToken, revokeAllUserSessions } from '#lib/server/auth/session.js';
import { DomainError } from '#lib/server/errors.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	const next = safeNextPath(url.searchParams.get('next')) ?? '';

	if (!locals.user) {
		throw redirect(303, '/login');
	}

	if (!locals.user.mustChangePassword) {
		throw redirect(303, next || '/dashboard');
	}

	return {
		next,
		name: locals.user.fullName
	};
};

export const actions: Actions = {
	default: async ({ request, locals, cookies }) => {
		const user = locals.user;

		if (!user) {
			throw redirect(303, '/login');
		}

		const form = await request.formData();
		const password = String(form.get('password') ?? '');
		const confirmPassword = String(form.get('confirmPassword') ?? '');
		const next = safeNextPath(String(form.get('next') ?? '')) ?? '/dashboard';
		const fieldErrors: { password?: string; confirmPassword?: string } = {};

		if (password.length < 8) {
			fieldErrors.password = 'Password minimal 8 karakter.';
		}

		if (password !== confirmPassword) {
			fieldErrors.confirmPassword = 'Konfirmasi password tidak cocok.';
		}

		if (Object.keys(fieldErrors).length > 0) {
			return fail(400, { fieldErrors });
		}

		try {
			await changeOwnPassword(user, password, confirmPassword);
		} catch (error) {
			if (error instanceof DomainError) {
				return fail(400, { error: error.message });
			}
			throw error;
		}

		const token = getSessionToken(cookies);

		if (token) {
			await revokeAllUserSessions(user.id, hashToken(token));
		}

		throw redirect(303, next);
	}
};
