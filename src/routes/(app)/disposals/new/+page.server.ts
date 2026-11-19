import { randomUUID } from 'node:crypto';
import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import { createDisposal, getDisposalFormOptions } from '#lib/server/services/disposals.js';
import type { Actions, PageServerLoad } from './$types';

function numberParam(value: FormDataEntryValue | null): number | null {
	const raw = String(value ?? '').trim();
	if (!raw) return null;
	const parsed = Number(raw);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function today(): string {
	const now = new Date();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${now.getFullYear()}-${month}-${day}`;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const actor = requireUser(locals, url);
	try {
		const options = await getDisposalFormOptions(actor);
		const selected = Number(url.searchParams.get('asset') ?? '');
		return {
			options,
			selectedAssetId:
				Number.isInteger(selected) && options.assets.some((asset) => asset.id === selected)
					? selected
					: null,
			today: today(),
			submissionId: randomUUID()
		};
	} catch (err) {
		if (err instanceof DomainError) throw error(403, err.message);
		throw err;
	}
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const actor = requireUser(locals, url);
		const form = await request.formData();
		const assetId = numberParam(form.get('assetId'));
		const disposalDate = String(form.get('disposalDate') ?? '');
		const reason = String(form.get('reason') ?? '');
		const finalConditionId = numberParam(form.get('finalConditionId'));
		const description = String(form.get('description') ?? '').trim();
		const submissionId = String(form.get('submissionId') ?? '');
		const values = {
			assetId: assetId ? String(assetId) : '',
			disposalDate,
			reason,
			finalConditionId: finalConditionId ? String(finalConditionId) : '',
			description,
			submissionId
		};

		try {
			const id = await createDisposal(actor, {
				assetId,
				disposalDate,
				reason,
				finalConditionId,
				description: description || null,
				submissionId
			});
			throw redirect(303, `/disposals/${id}?created=1`);
		} catch (err) {
			if (err instanceof DomainError) {
				return fail(400, { values, error: err.message });
			}
			throw err;
		}
	}
};
