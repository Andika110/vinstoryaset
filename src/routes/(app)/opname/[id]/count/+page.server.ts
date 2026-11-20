import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import {
	getOpnameDetail,
	OPNAME_RESULT_OPTIONS,
	saveOpnameCount,
	type OpnameCountInput
} from '#lib/server/services/opnames.js';
import type { Actions, PageServerLoad } from './$types';

function parseId(value: string): number | null {
	const id = Number(value);
	return Number.isInteger(id) && id > 0 ? id : null;
}

function integerOrNull(value: FormDataEntryValue | null): number | null {
	const raw = String(value ?? '').trim();
	if (!raw) return null;
	const parsed = Number(raw);
	return Number.isInteger(parsed) ? parsed : NaN;
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const actor = requireUser(locals, url);
	const id = parseId(params.id);
	if (id === null) throw error(404, 'Sesi opname tidak ditemukan.');

	try {
		const detail = await getOpnameDetail(actor, id);
		if (detail.opname.status !== 'in_progress') {
			throw redirect(303, `/opname/${id}`);
		}
		return {
			opname: detail.opname,
			lines: detail.lines,
			summary: detail.summary,
			conditions: detail.conditions,
			resultOptions: OPNAME_RESULT_OPTIONS,
			canScan: detail.opname.itemType === 'asset'
		};
	} catch (err) {
		if (err instanceof DomainError) {
			throw error(err.code === 'TIDAK_DITEMUKAN' ? 404 : 403, err.message);
		}
		throw err;
	}
};

export const actions: Actions = {
	/**
	 * Menyimpan satu baris tanpa JavaScript. Antarmuka normal memakai endpoint
	 * `/opname/[id]/count/save` agar bisa autosave tanpa memuat ulang halaman.
	 */
	saveLine: async ({ request, locals, params, url }) => {
		const actor = requireUser(locals, url);
		const id = parseId(params.id);
		if (id === null) throw error(404, 'Sesi opname tidak ditemukan.');

		const form = await request.formData();
		const lineId = Number(form.get('lineId'));
		if (!Number.isInteger(lineId) || lineId <= 0) {
			return fail(400, { error: 'Baris opname tidak valid.' });
		}

		const input: OpnameCountInput = {
			lineId,
			result: String(form.get('result') ?? '').trim(),
			conditionId: integerOrNull(form.get('conditionId')),
			physicalQty: integerOrNull(form.get('physicalQty')),
			notes: String(form.get('notes') ?? '').trim() || null
		};

		if (
			(input.conditionId !== null && !Number.isInteger(input.conditionId)) ||
			(input.physicalQty !== null && !Number.isInteger(input.physicalQty))
		) {
			return fail(400, { error: 'Jumlah fisik dan kondisi harus berupa angka yang valid.' });
		}

		try {
			await saveOpnameCount(actor, id, [input]);
			return { lineSaved: true, savedLineId: lineId };
		} catch (err) {
			if (err instanceof DomainError) {
				return fail(400, { error: err.message, lineId });
			}
			throw err;
		}
	}
};
