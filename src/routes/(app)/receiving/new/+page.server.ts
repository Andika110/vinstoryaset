import { randomUUID } from 'node:crypto';
import { fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import { parseReceivingFormData } from '#lib/server/services/receiving-form.js';
import {
	createReceiving,
	getReceivingFormOptions,
	receivingDefaultDate
} from '#lib/server/services/receivings.js';
import type { Actions, PageServerLoad } from './$types';

function fieldForMessage(message: string): string | undefined {
	if (message.includes('Lokasi')) return 'locationId';
	if (message.includes('Supplier')) return 'supplierId';
	if (message.includes('Item inventory')) return 'inventoryItemId';
	if (message.includes('Jumlah')) return 'quantity';
	if (message.includes('Nama aset')) return 'assetName';
	if (message.includes('Kategori')) return 'categoryId';
	if (message.includes('Kondisi')) return 'conditionId';
	if (message.includes('Model')) return 'modelId';
	if (message.includes('Brand')) return 'brandId';
	if (message.includes('Serial')) return 'serialNumber';
	if (message.includes('garansi')) return 'warrantyExpiration';
	if (message.includes('Tanggal')) return 'receiptDate';
	if (message.includes('Biaya')) return 'unitCost';
	if (message.includes('Jenis')) return 'receivingType';
	return undefined;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const actor = requireUser(locals, url);
	return {
		options: await getReceivingFormOptions(actor),
		submissionId: randomUUID(),
		defaultDate: receivingDefaultDate()
	};
};

export const actions: Actions = {
	save: async ({ request, locals, url }) => {
		const actor = requireUser(locals, url);
		const form = await request.formData();
		const parsed = parseReceivingFormData(form);

		if (Object.keys(parsed.fieldErrors).length > 0) {
			return fail(400, { values: parsed.values, fieldErrors: parsed.fieldErrors });
		}

		try {
			const id = await createReceiving(actor, parsed.input);
			throw redirect(303, `/receiving/${id}`);
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
