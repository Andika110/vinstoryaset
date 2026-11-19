import { error } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import { getImportBatch } from '#lib/server/services/imports.js';
import type { RequestHandler } from './$types';

function csvCell(value: string): string {
	return `"${value.replace(/"/g, '""')}"`;
}

export const GET: RequestHandler = async ({ locals, params, url }) => {
	const actor = requireUser(locals, url);
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) throw error(404, 'Batch impor tidak ditemukan.');

	try {
		const detail = await getImportBatch(actor, id);
		const failed = detail.rows.filter((row) => row.status === 'failed');
		if (failed.length === 0) throw error(400, 'Batch ini tidak memiliki baris gagal.');

		const headers = ['Baris', ...detail.columns.map((column) => column.label), 'Alasan Gagal'];
		const lines = [headers.map(csvCell).join(',')];
		for (const row of failed) {
			const cells = [
				String(row.rowNumber),
				...detail.columns.map((column) => row.values[column.key] ?? ''),
				row.message ?? ''
			];
			lines.push(cells.map(csvCell).join(','));
		}

		return new Response(`\uFEFF${lines.join('\r\n')}\r\n`, {
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': `attachment; filename="import-errors-${detail.batch.batchNumber}.csv"`
			}
		});
	} catch (err) {
		if (err instanceof DomainError) {
			throw error(err.code === 'TIDAK_DITEMUKAN' ? 404 : 403, err.message);
		}
		throw err;
	}
};
