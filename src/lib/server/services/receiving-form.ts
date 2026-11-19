import type { ReceivingInput, ReceivingLineType, ReceivingType } from './receivings.js';

export type ParsedReceivingForm = {
	input: ReceivingInput;
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

export function parseReceivingFormData(form: FormData): ParsedReceivingForm {
	const fieldErrors: Record<string, string> = {};
	const values: Record<string, string> = {};

	for (const key of [
		'receivingType',
		'receiptDate',
		'supplierId',
		'locationId',
		'referenceNumber',
		'notes',
		'lineType',
		'inventoryItemId',
		'quantity',
		'unitCost',
		'assetName',
		'categoryId',
		'brandId',
		'modelId',
		'conditionId',
		'serialNumber',
		'warrantyExpiration',
		'assetDescription',
		'submissionId'
	]) {
		values[key] = value(form, key);
	}

	const lineType: ReceivingLineType = values.lineType === 'inventory' ? 'inventory' : 'asset';
	const quantity = Number(values.quantity || '0');
	const receivingType = values.receivingType as ReceivingType;

	if (!values.receiptDate) fieldErrors.receiptDate = 'Tanggal penerimaan wajib diisi.';
	if (!values.locationId) fieldErrors.locationId = 'Lokasi wajib dipilih.';
	if (!Number.isInteger(quantity) || quantity <= 0) {
		fieldErrors.quantity = 'Jumlah harus bilangan bulat lebih dari 0.';
	}
	if (values.unitCost) {
		const cost = Number(values.unitCost.replace(',', '.'));
		if (!Number.isFinite(cost) || cost < 0) {
			fieldErrors.unitCost = 'Biaya satuan tidak valid.';
		}
	}
	if (lineType === 'inventory' && !values.inventoryItemId) {
		fieldErrors.inventoryItemId = 'Item inventory wajib dipilih.';
	}
	if (lineType === 'asset') {
		if (!values.assetName) fieldErrors.assetName = 'Nama aset wajib diisi.';
		if (!values.categoryId) fieldErrors.categoryId = 'Kategori aset wajib dipilih.';
		if (!values.conditionId) fieldErrors.conditionId = 'Kondisi aset wajib dipilih.';
		if (quantity > 1 && values.serialNumber) {
			fieldErrors.serialNumber = 'Serial number hanya untuk jumlah 1 unit.';
		}
	}
	if (values.warrantyExpiration && !/^\d{4}-\d{2}-\d{2}$/.test(values.warrantyExpiration)) {
		fieldErrors.warrantyExpiration = 'Tanggal garansi tidak valid.';
	}
	if (!values.submissionId) fieldErrors.submissionId = 'Token idempotensi tidak valid.';

	return {
		input: {
			receivingType,
			receiptDate: values.receiptDate,
			supplierId: optionalInteger(values.supplierId),
			locationId: optionalInteger(values.locationId),
			referenceNumber: values.referenceNumber || null,
			notes: values.notes || null,
			lineType,
			inventoryItemId: optionalInteger(values.inventoryItemId),
			quantity,
			unitCost: values.unitCost || null,
			assetName: values.assetName || null,
			categoryId: optionalInteger(values.categoryId),
			brandId: optionalInteger(values.brandId),
			modelId: optionalInteger(values.modelId),
			conditionId: optionalInteger(values.conditionId),
			serialNumber: values.serialNumber || null,
			warrantyExpiration: values.warrantyExpiration || null,
			assetDescription: values.assetDescription || null,
			submissionId: values.submissionId
		},
		values,
		fieldErrors
	};
}
