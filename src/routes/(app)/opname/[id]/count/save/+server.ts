import { error, json } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import {
	getOpnameDetail,
	saveOpnameCount,
	scanOpnameAsset,
	type OpnameCountInput
} from '#lib/server/services/opnames.js';
import type { RequestHandler } from './$types';

function parseId(value: string): number | null {
	const id = Number(value);
	return Number.isInteger(id) && id > 0 ? id : null;
}

function parseInteger(value: FormDataEntryValue | null): number | null {
	const raw = String(value ?? '').trim();
	if (!raw) return null;
	const parsed = Number(raw);
	return Number.isInteger(parsed) ? parsed : NaN;
}

export const POST: RequestHandler = async ({ locals, params, request, url }) => {
	const actor = requireUser(locals, url);
	const id = parseId(params.id ?? '');
	if (id === null) throw error(404, 'Sesi opname tidak ditemukan.');

	const form = await request.formData();
	const intent = String(form.get('intent') ?? '').trim();

	try {
		if (intent === 'scan') {
			const code = String(form.get('code') ?? '').trim();
			if (!code || code.length > 100) {
				return json({ ok: false, error: 'Kode aset tidak valid.' }, { status: 400 });
			}
			const outcome = await scanOpnameAsset(actor, id, code);
			return json({ ok: true, outcome });
		}

		const lineId = Number(form.get('lineId'));
		if (!Number.isInteger(lineId) || lineId <= 0) {
			return json({ ok: false, error: 'Baris opname tidak valid.' }, { status: 400 });
		}

		let input: OpnameCountInput;
		if (intent === 'undo') {
			input = {
				lineId,
				result: '',
				conditionId: null,
				physicalQty: null,
				notes: String(form.get('notes') ?? '').trim() || null
			};
		} else {
			const conditionId = parseInteger(form.get('conditionId'));
			const physicalQty = parseInteger(form.get('physicalQty'));
			if (Number.isNaN(conditionId) || Number.isNaN(physicalQty)) {
				return json(
					{ ok: false, error: 'Jumlah fisik dan kondisi harus berupa angka yang valid.' },
					{ status: 400 }
				);
			}
			input = {
				lineId,
				result: String(form.get('result') ?? '').trim(),
				conditionId,
				physicalQty,
				notes: String(form.get('notes') ?? '').trim() || null
			};
		}

		await saveOpnameCount(actor, id, [input]);
		const detail = await getOpnameDetail(actor, id);
		return json({
			ok: true,
			line: detail.lines.find((line) => line.id === lineId) ?? null,
			summary: detail.summary
		});
	} catch (err) {
		if (err instanceof DomainError) {
			return json({ ok: false, error: err.message }, { status: 400 });
		}
		throw err;
	}
};
