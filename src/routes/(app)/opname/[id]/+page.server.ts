import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import {
	cancelOpname,
	completeOpname,
	getOpnameDetail,
	startOpname
} from '#lib/server/services/opnames.js';
import type { Actions, PageServerLoad } from './$types';

function parseId(value: string): number | null {
	const id = Number(value);
	return Number.isInteger(id) && id > 0 ? id : null;
}

function toHttp(err: unknown): never {
	if (err instanceof DomainError) {
		throw error(err.code === 'TIDAK_DITEMUKAN' ? 404 : 403, err.message);
	}
	throw err;
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const actor = requireUser(locals, url);
	const id = parseId(params.id);
	if (id === null) throw error(404, 'Sesi opname tidak ditemukan.');

	try {
		const detail = await getOpnameDetail(actor, id);
		return {
			...detail,
			notice: {
				created: url.searchParams.get('created') === '1',
				started: url.searchParams.get('started') === '1',
				saved: url.searchParams.get('saved') === '1',
				completed: url.searchParams.get('completed') === '1',
				cancelled: url.searchParams.get('cancelled') === '1'
			}
		};
	} catch (err) {
		toHttp(err);
	}
};

async function runAction(
	action: () => Promise<unknown>,
	success: string
): Promise<never | ReturnType<typeof fail>> {
	try {
		await action();
		throw redirect(303, success);
	} catch (err) {
		if (err instanceof DomainError) {
			return fail(400, { error: err.message });
		}
		throw err;
	}
}

export const actions: Actions = {
	start: async ({ locals, params, url }) => {
		const actor = requireUser(locals, url);
		const id = parseId(params.id);
		if (id === null) throw error(404, 'Sesi opname tidak ditemukan.');
		return runAction(() => startOpname(actor, id), `/opname/${id}?started=1`);
	},
	complete: async ({ locals, params, url }) => {
		const actor = requireUser(locals, url);
		const id = parseId(params.id);
		if (id === null) throw error(404, 'Sesi opname tidak ditemukan.');
		return runAction(() => completeOpname(actor, id), `/opname/${id}?completed=1`);
	},
	cancel: async ({ request, locals, params, url }) => {
		const actor = requireUser(locals, url);
		const id = parseId(params.id);
		if (id === null) throw error(404, 'Sesi opname tidak ditemukan.');
		const form = await request.formData();
		const reason = String(form.get('reason') ?? '');
		return runAction(() => cancelOpname(actor, id, reason), `/opname/${id}?cancelled=1`);
	}
};
