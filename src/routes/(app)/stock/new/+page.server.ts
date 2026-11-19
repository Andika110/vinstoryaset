import { randomUUID } from 'node:crypto';
import { fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import { parseStockFormData } from '#lib/server/services/stock-form.js';
import { createStockDocument, getStockFormOptions } from '#lib/server/services/stock.js';
import type { Actions, PageServerLoad } from './$types';

type StockType = 'stock_out' | 'transfer' | 'adjustment';

function normaliseType(value: string | null): StockType {
	return value === 'transfer' || value === 'adjustment' ? value : 'stock_out';
}

function fieldForMessage(message: string): string | undefined {
	if (message.includes('Lokasi asal') || message.includes('Lokasi tujuan')) {
		if (message.includes('tujuan')) return 'destinationLocationId';
		return 'locationId';
	}
	if (message.includes('Lokasi')) return 'locationId';
	if (message.includes('Item')) return 'itemId';
	if (message.includes('Jumlah')) return 'quantity';
	if (message.includes('Alasan')) return 'reason';
	if (message.includes('Arah')) return 'direction';
	return undefined;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const actor = requireUser(locals, url);
	const type = normaliseType(url.searchParams.get('type'));
	return {
		type,
		options: await getStockFormOptions(actor),
		submissionId: randomUUID()
	};
};

export const actions: Actions = {
	save: async ({ request, locals, url }) => {
		const actor = requireUser(locals, url);
		const form = await request.formData();
		const parsed = parseStockFormData(form);

		if (Object.keys(parsed.fieldErrors).length > 0) {
			return fail(400, { values: parsed.values, fieldErrors: parsed.fieldErrors });
		}

		try {
			const id = await createStockDocument(actor, parsed.input);
			throw redirect(303, `/stock/${id}`);
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
