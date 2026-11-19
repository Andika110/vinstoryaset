import { randomUUID } from 'node:crypto';
import { fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import {
	getMaintenanceReportOptions,
	reportMaintenance
} from '#lib/server/services/maintenance.js';
import type { Actions, PageServerLoad } from './$types';

function fieldForMessage(message: string): string | undefined {
	if (message.includes('Aset')) return 'assetId';
	if (message.includes('Deskripsi')) return 'problemDescription';
	if (message.includes('Jenis')) return 'maintenanceType';
	if (message.includes('gambar') || message.includes('file')) return 'photo';
	return undefined;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const actor = requireUser(locals, url);
	const options = await getMaintenanceReportOptions(actor);
	const requestedAsset = Number(url.searchParams.get('asset') ?? '');
	const selected = options.assets.find((asset) => asset.id === requestedAsset);

	return {
		options,
		submissionId: randomUUID(),
		selectedAssetId: selected ? String(selected.id) : ''
	};
};

export const actions: Actions = {
	save: async ({ request, locals, url }) => {
		const actor = requireUser(locals, url);
		const form = await request.formData();
		const values = {
			assetId: String(form.get('assetId') ?? '').trim(),
			maintenanceType: String(form.get('maintenanceType') ?? '').trim(),
			problemDescription: String(form.get('problemDescription') ?? '').trim(),
			submissionId: String(form.get('submissionId') ?? '').trim()
		};
		const fieldErrors: Record<string, string> = {};

		if (!values.assetId) fieldErrors.assetId = 'Aset wajib dipilih.';
		if (!values.problemDescription) {
			fieldErrors.problemDescription = 'Deskripsi masalah wajib diisi.';
		}
		if (!values.submissionId) fieldErrors.submissionId = 'Token idempotensi tidak valid.';

		if (Object.keys(fieldErrors).length > 0) {
			return fail(400, { values, fieldErrors });
		}

		const photoEntry = form.get('photo');
		const photo = photoEntry instanceof File && photoEntry.size > 0 ? photoEntry : null;

		try {
			const id = await reportMaintenance(actor, {
				assetId: Number(values.assetId),
				maintenanceType: values.maintenanceType,
				problemDescription: values.problemDescription,
				photo,
				submissionId: values.submissionId
			});
			throw redirect(303, `/maintenance/${id}`);
		} catch (err) {
			if (err instanceof DomainError) {
				const field = fieldForMessage(err.message);
				return fail(400, {
					values,
					error: err.message,
					fieldErrors: field ? { [field]: err.message } : undefined
				});
			}
			throw err;
		}
	}
};
