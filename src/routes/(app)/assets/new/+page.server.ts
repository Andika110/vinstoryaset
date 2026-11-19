import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import { parseAssetFormData } from '#lib/server/services/asset-form.js';
import { createAsset, getAssetFormOptions } from '#lib/server/services/assets.js';
import type { Actions, PageServerLoad } from './$types';

function fieldForMessage(message: string): string | undefined {
	if (message.includes('Asset Code')) return 'assetCode';
	if (message.includes('Serial')) return 'serialNumber';
	if (message.includes('Biaya')) return 'acquisitionCost';
	if (message.includes('Tanggal pembelian')) return 'purchaseDate';
	if (message.includes('Tanggal garansi')) return 'warrantyExpiration';
	if (message.includes('Kategori')) return 'categoryId';
	if (message.includes('Model')) return 'modelId';
	if (message.includes('Brand')) return 'brandId';
	if (message.includes('Lokasi')) return 'locationId';
	if (message.includes('Kondisi')) return 'conditionId';
	if (message.includes('gambar') || message.includes('file')) return 'photo';
	return undefined;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const actor = requireUser(locals, url);

	if (actor.role === 'outlet') {
		throw error(403, 'Anda tidak punya akses untuk menambah aset.');
	}

	return {
		options: await getAssetFormOptions(actor),
		canSeeCost: true
	};
};

export const actions: Actions = {
	save: async ({ request, locals, url }) => {
		const actor = requireUser(locals, url);
		const form = await request.formData();
		const parsed = parseAssetFormData(form, 'create');

		if (Object.keys(parsed.fieldErrors).length > 0) {
			return fail(400, { values: parsed.values, fieldErrors: parsed.fieldErrors });
		}

		try {
			const id = await createAsset(actor, parsed.input, parsed.photo);
			throw redirect(303, `/assets/${id}`);
		} catch (err) {
			if (err instanceof DomainError) {
				const field = fieldForMessage(err.message);
				return fail(400, {
					values: parsed.values,
					error: err.message,
					fieldErrors: field ? { [field]: err.message } : undefined
				});
			}
			throw err;
		}
	}
};
