import { randomUUID } from 'node:crypto';
import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import {
	createLoan,
	getLoanFormOptions,
	loanDefaultDate,
	loanDefaultReturnDate
} from '#lib/server/services/loans.js';
import type { Actions, PageServerLoad } from './$types';

function fieldForMessage(message: string): string | undefined {
	if (message.includes('Aset')) return 'assetId';
	if (message.includes('Kondisi')) return 'conditionBeforeId';
	if (message.includes('Tanggal pinjam')) return 'borrowingDate';
	if (message.includes('Rencana kembali')) return 'expectedReturnDate';
	if (message.includes('Nama peminjam')) return 'borrowerName';
	if (message.includes('Employee')) return 'employeeId';
	return undefined;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const actor = requireUser(locals, url);
	if (actor.role === 'outlet') {
		throw error(403, 'Anda tidak punya akses untuk membuat peminjaman.');
	}

	const options = await getLoanFormOptions(actor);
	const requestedAsset = Number(url.searchParams.get('asset') ?? '');
	const selected = options.assets.find((asset) => asset.id === requestedAsset);

	return {
		options,
		submissionId: randomUUID(),
		defaultBorrowingDate: loanDefaultDate(),
		defaultExpectedReturnDate: loanDefaultReturnDate(),
		selectedAssetId: selected ? String(selected.id) : ''
	};
};

export const actions: Actions = {
	save: async ({ request, locals, url }) => {
		const actor = requireUser(locals, url);
		const form = await request.formData();
		const values = {
			assetId: String(form.get('assetId') ?? '').trim(),
			employeeId: String(form.get('employeeId') ?? '').trim(),
			borrowerName: String(form.get('borrowerName') ?? '').trim(),
			borrowingDate: String(form.get('borrowingDate') ?? '').trim(),
			expectedReturnDate: String(form.get('expectedReturnDate') ?? '').trim(),
			conditionBeforeId: String(form.get('conditionBeforeId') ?? '').trim(),
			notes: String(form.get('notes') ?? '').trim(),
			submissionId: String(form.get('submissionId') ?? '').trim()
		};
		const fieldErrors: Record<string, string> = {};

		if (!values.assetId) fieldErrors.assetId = 'Aset wajib dipilih.';
		if (!values.borrowerName) fieldErrors.borrowerName = 'Nama peminjam wajib diisi.';
		if (!values.borrowingDate) fieldErrors.borrowingDate = 'Tanggal pinjam wajib diisi.';
		if (!values.expectedReturnDate) {
			fieldErrors.expectedReturnDate = 'Rencana tanggal kembali wajib diisi.';
		}
		if (!values.conditionBeforeId) {
			fieldErrors.conditionBeforeId = 'Kondisi awal wajib dipilih.';
		}
		if (!values.submissionId) fieldErrors.submissionId = 'Token idempotensi tidak valid.';

		if (Object.keys(fieldErrors).length > 0) {
			return fail(400, { values, fieldErrors });
		}

		try {
			const id = await createLoan(actor, {
				assetId: Number(values.assetId),
				employeeId: values.employeeId ? Number(values.employeeId) : null,
				borrowerName: values.borrowerName,
				borrowingDate: values.borrowingDate,
				expectedReturnDate: values.expectedReturnDate,
				conditionBeforeId: Number(values.conditionBeforeId),
				notes: values.notes || null,
				submissionId: values.submissionId
			});
			throw redirect(303, `/assets/loans/${id}`);
		} catch (err) {
			if (err instanceof DomainError) {
				const field = fieldForMessage(err.message);
				return fail(err.code === 'DILARANG' ? 403 : 400, {
					values,
					error: err.message,
					fieldErrors: field ? { [field]: err.message } : undefined
				});
			}
			throw err;
		}
	}
};
