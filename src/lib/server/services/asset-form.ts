import type { AssetInput } from './assets.js';

export type AssetFormMode = 'create' | 'edit';

export type ParsedAssetForm = {
	input: AssetInput;
	values: Record<string, string>;
	fieldErrors: Record<string, string>;
	photo: File | null;
	removePhoto: boolean;
};

function value(form: FormData, key: string): string {
	return String(form.get(key) ?? '').trim();
}

function optionalInteger(raw: string): number | null {
	if (!raw) return null;
	if (!/^\d+$/.test(raw)) return null;
	return Number(raw);
}

function validateDate(
	raw: string,
	label: string,
	errors: Record<string, string>,
	key: string
): void {
	if (!raw) return;
	if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(`${raw}T00:00:00Z`))) {
		errors[key] = `${label} tidak valid.`;
	}
}

export function parseAssetFormData(form: FormData, mode: AssetFormMode): ParsedAssetForm {
	const fieldErrors: Record<string, string> = {};
	const values: Record<string, string> = {};

	for (const key of [
		'assetCode',
		'name',
		'categoryId',
		'brandId',
		'modelId',
		'serialNumber',
		'purchaseDate',
		'warrantyExpiration',
		'acquisitionSource',
		'acquisitionCost',
		'locationId',
		'conditionId',
		'description',
		'updatedAt'
	]) {
		values[key] = value(form, key);
	}

	if (!values.assetCode) fieldErrors.assetCode = 'Asset Code wajib diisi.';
	if (!values.name) fieldErrors.name = 'Nama aset wajib diisi.';
	if (!values.categoryId) fieldErrors.categoryId = 'Kategori aset wajib dipilih.';
	if (mode === 'create' && !values.locationId) {
		fieldErrors.locationId = 'Lokasi wajib dipilih.';
	}
	if (!values.conditionId) fieldErrors.conditionId = 'Kondisi aset wajib dipilih.';

	validateDate(values.purchaseDate, 'Tanggal pembelian', fieldErrors, 'purchaseDate');
	validateDate(values.warrantyExpiration, 'Tanggal garansi', fieldErrors, 'warrantyExpiration');

	if (values.acquisitionCost) {
		const cost = Number(values.acquisitionCost.replace(',', '.'));
		if (!Number.isFinite(cost) || cost < 0) {
			fieldErrors.acquisitionCost = 'Biaya perolehan tidak valid.';
		}
	}

	const photoEntry = form.get('photo');
	const photo = photoEntry instanceof File && photoEntry.size > 0 ? photoEntry : null;

	return {
		input: {
			assetCode: values.assetCode,
			name: values.name,
			categoryId: optionalInteger(values.categoryId),
			brandId: optionalInteger(values.brandId),
			modelId: optionalInteger(values.modelId),
			serialNumber: values.serialNumber || null,
			purchaseDate: values.purchaseDate || null,
			warrantyExpiration: values.warrantyExpiration || null,
			acquisitionSource: values.acquisitionSource || null,
			acquisitionCost: values.acquisitionCost || null,
			locationId: optionalInteger(values.locationId),
			conditionId: optionalInteger(values.conditionId),
			description: values.description || null,
			updatedAt: values.updatedAt || null
		},
		values,
		fieldErrors,
		photo,
		removePhoto: form.get('removePhoto') === '1'
	};
}
