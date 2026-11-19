import { randomUUID } from 'node:crypto';
import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import {
	createRequest,
	getRequestFormOptions,
	type RequestLineInput
} from '#lib/server/services/requests.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const actor = requireUser(locals, url);
	if (actor.role !== 'outlet') {
		throw error(403, 'Hanya outlet yang dapat membuat request.');
	}
	return {
		options: await getRequestFormOptions(actor),
		submissionId: randomUUID()
	};
};

export const actions: Actions = {
	save: async ({ request, locals, url }) => {
		const actor = requireUser(locals, url);
		const form = await request.formData();
		const values = {
			reason: String(form.get('reason') ?? '').trim(),
			notes: String(form.get('notes') ?? '').trim(),
			submissionId: String(form.get('submissionId') ?? '').trim()
		};

		const itemIds = form.getAll('lineItemId');
		const quantities = form.getAll('lineQty');
		const lineNotes = form.getAll('lineNotes');
		const lines: RequestLineInput[] = [];
		const fieldErrors: Record<string, string> = {};

		for (let index = 0; index < itemIds.length; index += 1) {
			const itemId = Number(String(itemIds[index] ?? '').trim());
			const quantity = Number(String(quantities[index] ?? '').trim());
			if (!itemId) continue;
			if (!Number.isInteger(quantity) || quantity <= 0) {
				fieldErrors.lines = 'Jumlah setiap item harus bilangan bulat lebih dari 0.';
				break;
			}
			lines.push({
				itemId,
				quantity,
				notes: String(lineNotes[index] ?? '').trim() || null
			});
		}

		if (lines.length === 0) {
			fieldErrors.lines = 'Pilih minimal satu item.';
		}
		if (!values.submissionId) {
			fieldErrors.submissionId = 'Token idempotensi tidak valid.';
		}

		if (Object.keys(fieldErrors).length > 0) {
			return fail(400, { values, fieldErrors });
		}

		try {
			const id = await createRequest(actor, {
				reason: values.reason || null,
				notes: values.notes || null,
				lines,
				submissionId: values.submissionId
			});
			throw redirect(303, `/requests/${id}`);
		} catch (err) {
			if (err instanceof DomainError) {
				return fail(err.code === 'DILARANG' ? 403 : 400, {
					values,
					error: err.message,
					fieldErrors: err.message.includes('item') ? { lines: err.message } : undefined
				});
			}
			throw err;
		}
	}
};
