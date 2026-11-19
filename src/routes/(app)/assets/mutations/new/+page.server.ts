import { randomUUID } from 'node:crypto';
import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import {
	createMutation,
	getMutationFormOptions,
	mutationDefaultDate
} from '#lib/server/services/mutations.js';
import type { Actions, PageServerLoad } from './$types';

function fieldForMessage(message: string): string | undefined {
	if (message.includes('Lokasi tujuan')) return 'destinationLocationId';
	if (message.includes('Lokasi')) return 'destinationLocationId';
	if (message.includes('Aset')) return 'assetId';
	if (message.includes('Tanggal')) return 'mutationDate';
	if (message.includes('Penerima')) return 'receivedByName';
	return undefined;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const actor = requireUser(locals, url);
	if (actor.role === 'outlet') {
		throw error(403, 'Anda tidak punya akses untuk membuat mutasi.');
	}
	const options = await getMutationFormOptions(actor);
	const requestedAsset = Number(url.searchParams.get('asset') ?? '');
	const selected = options.assets.find((asset) => asset.id === requestedAsset);

	return {
		options,
		submissionId: randomUUID(),
		defaultDate: mutationDefaultDate(),
		selectedAssetId: selected ? String(selected.id) : ''
	};
};

export const actions: Actions = {
	save: async ({ request, locals, url }) => {
		const actor = requireUser(locals, url);
		const form = await request.formData();
		const values = {
			assetId: String(form.get('assetId') ?? '').trim(),
			destinationLocationId: String(form.get('destinationLocationId') ?? '').trim(),
			mutationDate: String(form.get('mutationDate') ?? '').trim(),
			reason: String(form.get('reason') ?? '').trim(),
			receivedByName: String(form.get('receivedByName') ?? '').trim(),
			notes: String(form.get('notes') ?? '').trim(),
			submissionId: String(form.get('submissionId') ?? '').trim()
		};
		const fieldErrors: Record<string, string> = {};

		if (!values.assetId) fieldErrors.assetId = 'Aset wajib dipilih.';
		if (!values.destinationLocationId) {
			fieldErrors.destinationLocationId = 'Lokasi tujuan wajib dipilih.';
		}
		if (!values.mutationDate) fieldErrors.mutationDate = 'Tanggal mutasi wajib diisi.';
		if (!values.submissionId) fieldErrors.submissionId = 'Token idempotensi tidak valid.';

		if (Object.keys(fieldErrors).length > 0) {
			return fail(400, { values, fieldErrors });
		}

		try {
			const id = await createMutation(actor, {
				assetId: Number(values.assetId),
				destinationLocationId: Number(values.destinationLocationId),
				mutationDate: values.mutationDate,
				reason: values.reason || null,
				receivedByName: values.receivedByName || null,
				notes: values.notes || null,
				submissionId: values.submissionId
			});
			throw redirect(303, `/assets/mutations/${id}`);
		} catch (err) {
			if (err instanceof DomainError) {
				const field = fieldForMessage(err.message);
				return fail(400, {
					values,
					error: err.message,
					fieldErrors: field ? { [field]: err.message } : undefined
				});
			}
			throw err;
		}
	}
};
