import { randomUUID } from 'node:crypto';
import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import {
	assignAsset,
	assignmentDefaultDate,
	getAssignmentFormOptions
} from '#lib/server/services/assignments.js';
import type { Actions, PageServerLoad } from './$types';

function fieldForMessage(message: string): string | undefined {
	if (message.includes('Aset')) return 'assetId';
	if (message.includes('Lokasi')) return 'locationId';
	if (message.includes('Employee')) return 'employeeId';
	if (message.includes('Department')) return 'departmentId';
	if (message.includes('Tanggal')) return 'assignmentDate';
	return undefined;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const actor = requireUser(locals, url);

	if (actor.role === 'outlet') {
		throw error(403, 'Anda tidak punya akses untuk menempatkan aset.');
	}

	const options = await getAssignmentFormOptions(actor);
	const requestedAsset = Number(url.searchParams.get('asset') ?? '');
	const selectedAsset = options.assets.find((asset) => asset.id === requestedAsset);

	return {
		options,
		submissionId: randomUUID(),
		defaultDate: assignmentDefaultDate(),
		selectedAssetId: selectedAsset ? String(selectedAsset.id) : '',
		defaultLocationId: selectedAsset ? String(selectedAsset.locationId) : ''
	};
};

export const actions: Actions = {
	save: async ({ request, locals, url }) => {
		const actor = requireUser(locals, url);
		const form = await request.formData();

		const values = {
			assetId: String(form.get('assetId') ?? '').trim(),
			employeeId: String(form.get('employeeId') ?? '').trim(),
			departmentId: String(form.get('departmentId') ?? '').trim(),
			locationId: String(form.get('locationId') ?? '').trim(),
			assignmentDate: String(form.get('assignmentDate') ?? '').trim(),
			notes: String(form.get('notes') ?? '').trim(),
			submissionId: String(form.get('submissionId') ?? '').trim()
		};
		const fieldErrors: Record<string, string> = {};

		if (!values.assetId) fieldErrors.assetId = 'Aset wajib dipilih.';
		if (!values.locationId) fieldErrors.locationId = 'Lokasi tujuan wajib dipilih.';
		if (!values.assignmentDate) fieldErrors.assignmentDate = 'Tanggal penempatan wajib diisi.';
		if (!values.submissionId) fieldErrors.submissionId = 'Token idempotensi tidak valid.';

		if (Object.keys(fieldErrors).length > 0) {
			return fail(400, { values, fieldErrors });
		}

		try {
			const assetId = await assignAsset(actor, {
				assetId: values.assetId ? Number(values.assetId) : null,
				employeeId: values.employeeId ? Number(values.employeeId) : null,
				departmentId: values.departmentId ? Number(values.departmentId) : null,
				locationId: values.locationId ? Number(values.locationId) : null,
				assignmentDate: values.assignmentDate,
				notes: values.notes || null,
				submissionId: values.submissionId
			});
			throw redirect(303, `/assets/${assetId}`);
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
