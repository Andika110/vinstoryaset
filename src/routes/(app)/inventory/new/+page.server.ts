import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import { parseInventoryFormData } from '#lib/server/services/inventory-form.js';
import { createInventoryItem, getInventoryFormOptions } from '#lib/server/services/inventory.js';
import type { Actions, PageServerLoad } from './$types';

function fieldForMessage(message: string): string | undefined {
	if (message.includes('Item Code')) return 'itemCode';
	if (message.includes('Nama')) return 'name';
	if (message.includes('Kategori')) return 'categoryId';
	if (message.includes('Unit')) return 'unitId';
	if (message.includes('Brand')) return 'brandId';
	if (message.includes('Minimum')) return 'minStock';
	if (message.includes('Lokasi')) return 'minStock';
	return undefined;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const actor = requireUser(locals, url);

	if (actor.role === 'outlet') {
		throw error(403, 'Anda tidak punya akses untuk menambah item inventory.');
	}

	return { options: await getInventoryFormOptions(actor) };
};

export const actions: Actions = {
	save: async ({ request, locals, url }) => {
		const actor = requireUser(locals, url);
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
			const id = await createInventoryItem(actor, parsed.input);
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
