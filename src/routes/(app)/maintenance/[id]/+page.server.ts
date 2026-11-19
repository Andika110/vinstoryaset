import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import {
	cancelMaintenance,
	completeMaintenance,
	getMaintenanceDetail,
	markWaitingParts,
	startMaintenance,
	type MaintenancePartInput
} from '#lib/server/services/maintenance.js';
import type { Actions, PageServerLoad } from './$types';

function parseId(value: string): number | null {
	const id = Number(value);
	return Number.isInteger(id) && id > 0 ? id : null;
}

function parseParts(form: FormData): MaintenancePartInput[] {
	const itemIds = form.getAll('partItemId');
	const quantities = form.getAll('partQty');
	const parts: MaintenancePartInput[] = [];
	for (let index = 0; index < itemIds.length; index += 1) {
		const itemId = Number(String(itemIds[index] ?? '').trim());
		const quantity = Number(String(quantities[index] ?? '').trim());
		if (!itemId && !quantity) continue;
		parts.push({ itemId, quantity });
	}
	return parts;
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const actor = requireUser(locals, url);
	const id = parseId(params.id);
	if (id === null) throw error(404, 'Maintenance tidak ditemukan.');

	try {
		return { maintenance: await getMaintenanceDetail(actor, id) };
	} catch (err) {
		if (err instanceof DomainError) {
			throw error(err.code === 'TIDAK_DITEMUKAN' ? 404 : 403, err.message);
		}
		throw err;
	}
};

export const actions: Actions = {
	start: async ({ request, locals, params, url }) => {
		const actor = requireUser(locals, url);
		const id = parseId(params.id);
		if (id === null) return fail(404, { error: 'Maintenance tidak ditemukan.' });

		const form = await request.formData();
		try {
			await startMaintenance(actor, id, {
				technician: String(form.get('technician') ?? '').trim() || null,
				startDate: String(form.get('startDate') ?? '').trim() || null
			});
			throw redirect(303, `/maintenance/${id}`);
		} catch (err) {
			if (err instanceof DomainError) {
				return fail(err.code === 'DILARANG' ? 403 : 400, { error: err.message });
			}
			throw err;
		}
	},
	waiting: async ({ locals, params, url }) => {
		const actor = requireUser(locals, url);
		const id = parseId(params.id);
		if (id === null) return fail(404, { error: 'Maintenance tidak ditemukan.' });
		try {
			await markWaitingParts(actor, id);
			throw redirect(303, `/maintenance/${id}`);
		} catch (err) {
			if (err instanceof DomainError) {
				return fail(err.code === 'DILARANG' ? 403 : 400, { error: err.message });
			}
			throw err;
		}
	},
	complete: async ({ request, locals, params, url }) => {
		const actor = requireUser(locals, url);
		const id = parseId(params.id);
		if (id === null) return fail(404, { error: 'Maintenance tidak ditemukan.' });

		const form = await request.formData();
		const completionDate = String(form.get('completionDate') ?? '').trim();
		const repairDescription = String(form.get('repairDescription') ?? '').trim();
		const fieldErrors: Record<string, string> = {};

		if (!completionDate) fieldErrors.completionDate = 'Tanggal selesai wajib diisi.';
		if (!repairDescription) fieldErrors.repairDescription = 'Deskripsi perbaikan wajib diisi.';
		if (Object.keys(fieldErrors).length > 0) {
			return fail(400, { fieldErrors });
		}

		try {
			await completeMaintenance(actor, id, {
				completionDate,
				repairDescription,
				repairCost: String(form.get('repairCost') ?? '').trim() || null,
				vendor: String(form.get('vendor') ?? '').trim() || null,
				parts: parseParts(form)
			});
			throw redirect(303, `/maintenance/${id}`);
		} catch (err) {
			if (err instanceof DomainError) {
				return fail(err.code === 'DILARANG' ? 403 : 400, { error: err.message });
			}
			throw err;
		}
	},
	cancel: async ({ request, locals, params, url }) => {
		const actor = requireUser(locals, url);
		const id = parseId(params.id);
		if (id === null) return fail(404, { error: 'Maintenance tidak ditemukan.' });
		const form = await request.formData();
		const reason = String(form.get('cancelledReason') ?? '').trim();
		if (!reason) return fail(400, { fieldErrors: { cancelledReason: 'Alasan wajib diisi.' } });

		try {
			await cancelMaintenance(actor, id, reason);
			throw redirect(303, `/maintenance/${id}`);
		} catch (err) {
			if (err instanceof DomainError) {
				return fail(err.code === 'DILARANG' ? 403 : 400, { error: err.message });
			}
			throw err;
		}
	}
};
