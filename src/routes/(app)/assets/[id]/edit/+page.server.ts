import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import { parseAssetFormData } from '#lib/server/services/asset-form.js';
import { getAssetForEdit, getAssetFormOptions, updateAsset } from '#lib/server/services/assets.js';
import type { Actions, PageServerLoad } from './$types';

function parseId(value: string): number | null {
	const id = Number(value);
	return Number.isInteger(id) && id > 0 ? id : null;
}

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

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const actor = requireUser(locals, url);
	const id = parseId(params.id);

	if (id === null) throw error(404, 'Aset tidak ditemukan.');

	try {
		const result = await getAssetForEdit(actor, id);
		const optionSource = result.readOnly
			? { categories: [], brands: [], models: [], locations: [], conditions: [] }
			: await getAssetFormOptions(actor);
		const asset = result.asset;

		return {
			asset,
			options: optionSource,
			canSeeCost: result.canSeeCost,
			readOnly: result.readOnly,
			values: {
				assetCode: asset.assetCode,
				name: asset.name,
				categoryId: String(asset.categoryId),
				brandId: asset.brandId === null ? '' : String(asset.brandId),
				modelId: asset.modelId === null ? '' : String(asset.modelId),
				serialNumber: asset.serialNumber ?? '',
				purchaseDate: asset.purchaseDate ?? '',
				warrantyExpiration: asset.warrantyExpiration ?? '',
				acquisitionSource: asset.acquisitionSource ?? '',
				acquisitionCost: asset.acquisitionCost ?? '',
				locationId: String(asset.locationId),
				locationLabel: asset.locationLabel,
				conditionId: String(asset.conditionId),
				description: asset.description ?? '',
				updatedAt: asset.updatedAtIso
			}
		};
	} catch (err) {
		if (err instanceof DomainError) {
			throw error(err.code === 'TIDAK_DITEMUKAN' ? 404 : 403, err.message);
		}
		throw err;
	}
};

export const actions: Actions = {
	save: async ({ request, locals, params, url }) => {
		const actor = requireUser(locals, url);
		const id = parseId(params.id);

		if (id === null) {
			return fail(404, { error: 'Aset tidak ditemukan.' });
		}

		const form = await request.formData();
		const parsed = parseAssetFormData(form, 'edit');

		if (Object.keys(parsed.fieldErrors).length > 0) {
			return fail(400, { values: parsed.values, fieldErrors: parsed.fieldErrors });
		}

		try {
			await updateAsset(actor, id, parsed.input, parsed.photo, parsed.removePhoto);
			throw redirect(303, `/assets/${id}`);
		} catch (err) {
			if (err instanceof DomainError) {
				const field = fieldForMessage(err.message);
				return fail(err.code === 'KONFLIK' ? 409 : 400, {
					values: parsed.values,
					error: err.message,
					fieldErrors: field ? { [field]: err.message } : undefined
				});
			}
			throw err;
		}
	}
};
