import { error } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import { listAuditLogs } from '#lib/server/services/audit-log.js';
import type { PageServerLoad } from './$types';

function numberParam(value: string | null): number | null {
	if (!value) return null;
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const actor = requireUser(locals, url);
	const search = url.searchParams.get('search') ?? '';
	const user = url.searchParams.get('user') ?? '';
	const module = url.searchParams.get('module') ?? '';
	const action = url.searchParams.get('action') ?? '';
	const from = url.searchParams.get('from') ?? '';
	const to = url.searchParams.get('to') ?? '';
	const page = Number(url.searchParams.get('page') ?? 1);

	try {
		const result = await listAuditLogs(actor, {
			search,
			userId: numberParam(user),
			module,
			action,
			from: from || undefined,
			to: to || undefined,
			page: Number.isFinite(page) ? page : 1,
			pageSize: 20
		});

		return { ...result, search, user, module, action, from, to };
	} catch (err) {
		if (err instanceof DomainError) {
			throw error(err.code === 'TIDAK_DITEMUKAN' ? 404 : 403, err.message);
		}
		throw err;
	}
};
