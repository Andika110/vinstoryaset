import type { InventoryInput } from './inventory.js';

export type ParsedInventoryForm = {
	input: InventoryInput;
	values: Record<string, string>;
	fieldErrors: Record<string, string>;
	isActive: boolean;
	minStocks: Record<string, number | null>;
};

function value(form: FormData, key: string): string {
	return String(form.get(key) ?? '').trim();
}

export function parseInventoryFormData(form: FormData): ParsedInventoryForm {
	const fieldErrors: Record<string, string> = {};
	const values: Record<string, string> = {};
	const minStocks: Record<string, number | null> = {};

	for (const key of ['itemCode', 'name', 'categoryId', 'brandId', 'unitId', 'description']) {
		values[key] = value(form, key);
	}

	for (const [key, raw] of form.entries()) {
		if (!key.startsWith('minStock_')) continue;
		const locationId = key.slice('minStock_'.length);
		const textValue = String(raw ?? '').trim();
		values[key] = textValue;
		if (!textValue) {
			minStocks[locationId] = null;
			continue;
		}
		if (!/^\d+$/.test(textValue)) {
			fieldErrors[key] = 'Minimum stok harus bilangan bulat 0 atau lebih.';
			continue;
		}
		minStocks[locationId] = Number(textValue);
	}

	if (!values.itemCode) fieldErrors.itemCode = 'Item Code wajib diisi.';
	if (!values.name) fieldErrors.name = 'Nama item wajib diisi.';
	if (!values.categoryId) fieldErrors.categoryId = 'Kategori wajib dipilih.';
	if (!values.unitId) fieldErrors.unitId = 'Unit wajib dipilih.';

	return {
		input: {
			itemCode: values.itemCode,
			name: values.name,
			categoryId: values.categoryId ? Number(values.categoryId) : null,
			brandId: values.brandId ? Number(values.brandId) : null,
			unitId: values.unitId ? Number(values.unitId) : null,
			description: values.description || null,
			isActive: form.get('isActive') === 'on',
			minStocks
		},
		values,
		fieldErrors,
		isActive: form.get('isActive') === 'on',
		minStocks
	};
}
