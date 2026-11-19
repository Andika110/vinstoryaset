import { error, redirect } from '@sveltejs/kit';
import { canAccessPath } from '#lib/navigation.js';
import { requireUser } from '#lib/server/auth/guards.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, url }) => {
	const user = requireUser(locals, url);

	if (user.mustChangePassword) {
		const next = encodeURIComponent(`${url.pathname}${url.search}`);
		throw redirect(303, `/change-password?next=${next}`);
	}

	if (!canAccessPath(user.role, url.pathname)) {
		throw error(403, 'Anda tidak punya akses ke halaman ini.');
	}

	return {
		user: {
			name: user.fullName,
			role: user.role,
			scopeLabel: user.role === 'outlet' ? (user.outletName ?? 'Outlet') : 'Semua Lokasi'
		}
	};
};
