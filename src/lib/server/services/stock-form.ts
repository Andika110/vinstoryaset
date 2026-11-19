import type { StockDocumentType, StockInput } from './stock.js';

export type ParsedStockForm = {
	input: StockInput;
	values: Record<string, string>;
	fieldErrors: Record<string, string>;
};

function value(form: FormData, key: string): string {
	return String(form.get(key) ?? '').trim();
}

function optionalInteger(raw: string): number | null {
	if (!raw) return null;
	if (!/^\d+$/.test(raw)) return null;
	return Number(raw);
}

export function parseStockFormData(form: FormData): ParsedStockForm {
	const fieldErrors: Record<string, string> = {};
	const values: Record<string, string> = {};

	for (const key of [
		'type',
		'itemId',
		'locationId',
		'destinationLocationId',
		'quantity',
		'direction',
		'reason',
		'notes',
		'submissionId'
	]) {
		values[key] = value(form, key);
	}

	const type: StockDocumentType =
		values.type === 'transfer' || values.type === 'adjustment' ? values.type : 'stock_out';
	const quantity = Number(values.quantity || '0');
	const direction = values.direction === 'in' ? 'in' : 'out';

	if (!values.itemId) fieldErrors.itemId = 'Item wajib dipilih.';
	if (!values.locationId) fieldErrors.locationId = 'Lokasi wajib dipilih.';
	if (!Number.isInteger(quantity) || quantity <= 0) {
		fieldErrors.quantity = 'Jumlah harus bilangan bulat lebih dari 0.';
	}
	if (type === 'transfer') {
		if (!values.destinationLocationId) {
			fieldErrors.destinationLocationId = 'Lokasi tujuan wajib dipilih.';
		} else if (values.destinationLocationId === values.locationId) {
			fieldErrors.destinationLocationId = 'Lokasi asal dan tujuan harus berbeda.';
		}
	}
	if (type === 'adjustment' && !values.reason) {
		fieldErrors.reason = 'Alasan penyesuaian wajib diisi.';
	}
	if (!values.submissionId) fieldErrors.submissionId = 'Token idempotensi tidak valid.';

	return {
		input: {
			type,
			itemId: optionalInteger(values.itemId),
			locationId: optionalInteger(values.locationId),
			destinationLocationId: optionalInteger(values.destinationLocationId),
			quantity,
			direction,
			reason: values.reason || null,
			notes: values.notes || null,
			submissionId: values.submissionId
		},
		values,
		fieldErrors
	};
}
