import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import { parseInventoryFormData } from '#lib/server/services/inventory-form.js';
import { getInventoryForEdit, updateInventoryItem } from '#lib/server/services/inventory.js';
import type { Actions, PageServerLoad } from './$types';

function parseId(value: string): number | null {
	const id = Number(value);
	return Number.isInteger(id) && id > 0 ? id : null;
}

function fieldForMessage(message: string): string | undefined {
	if (message.includes('Item Code')) return 'itemCode';
	if (message.includes('Nama')) return 'name';
	if (message.includes('Kategori')) return 'categoryId';
	if (message.includes('Unit')) return 'unitId';
	if (message.includes('Brand')) return 'brandId';
	return undefined;
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const actor = requireUser(locals, url);
	const id = parseId(params.id);
	if (id === null) throw error(404, 'Item inventory tidak ditemukan.');

	try {
		const result = await getInventoryForEdit(actor, id);
		const item = result.item;

		return {
			...result,
			isActive: item.isActive,
			values: {
				itemCode: item.itemCode,
				name: item.name,
				categoryId: String(item.categoryId),
				brandId: item.brandId === null ? '' : String(item.brandId),
				unitId: String(item.unitId),
				description: item.description ?? ''
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
		if (id === null) return fail(404, { error: 'Item inventory tidak ditemukan.' });

		const form = await request.formData();
		const parsed = parseInventoryFormData(form);

		if (Object.keys(parsed.fieldErrors).length > 0) {
			return fail(400, {
				values: parsed.values,
				fieldErrors: parsed.fieldErrors,
				isActive: parsed.isActive,
				minStocks: parsed.minStocks
			});
		}

		try {
			await updateInventoryItem(actor, id, parsed.input);
			throw redirect(303, `/inventory/${id}`);
		} catch (err) {
			if (err instanceof DomainError) {
				const field = fieldForMessage(err.message);
				return fail(400, {
					values: parsed.values,
					error: err.message,
					isActive: parsed.isActive,
					minStocks: parsed.minStocks,
					fieldErrors: field ? { [field]: err.message } : undefined
				});
			}
			throw err;
		}
	}
};
