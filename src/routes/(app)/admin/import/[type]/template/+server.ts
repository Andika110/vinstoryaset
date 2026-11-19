import ExcelJS from 'exceljs';
import { error } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import { getImportType, requireImportAccess } from '#lib/server/services/imports.js';
import type { RequestHandler } from './$types';

function csvCell(value: string): string {
	return `"${value.replace(/"/g, '""')}"`;
}

export const GET: RequestHandler = async ({ locals, params, url }) => {
	const actor = requireUser(locals, url);
	const definition = getImportType(params.type);
	if (!definition) throw error(404, 'Jenis impor tidak ditemukan.');

	try {
		requireImportAccess(actor);
	} catch (err) {
		if (err instanceof DomainError) throw error(403, err.message);
		throw err;
	}

	const format = url.searchParams.get('format') === 'csv' ? 'csv' : 'xlsx';
	const headers = definition.columns.map((column) => column.label);
	const sample = definition.columns.map((column) => definition.sample[column.key] ?? '');
	const fileName = `template-import-${definition.key}.${format}`;
	const disposition = `attachment; filename="${fileName}"`;

	if (format === 'csv') {
		const lines = [headers, sample].map((row) => row.map(csvCell).join(','));
		const body = `\uFEFF${lines.join('\r\n')}\r\n`;
		return new Response(body, {
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': disposition
			}
		});
	}

	const workbook = new ExcelJS.Workbook();
	const sheet = workbook.addWorksheet('Template');
	sheet.addRow(headers);
	sheet.addRow(sample);
	sheet.getRow(1).font = { bold: true };
	sheet.columns.forEach((column, index) => {
		column.width = Math.max(14, headers[index].length + 4);
	});
	sheet.views = [{ state: 'frozen', ySplit: 1 }];

	const help = workbook.addWorksheet('Petunjuk');
	help.addRow(['Kolom', 'Wajib', 'Catatan']);
	help.getRow(1).font = { bold: true };
	for (const column of definition.columns) {
		help.addRow([column.label, column.required ? 'Ya' : 'Opsional', column.note ?? '']);
	}
	help.columns.forEach((column) => {
		column.width = 28;
	});
	const rulesRow = help.rowCount + 2;
	help.getCell(`A${rulesRow}`).value = 'Aturan validasi';
	help.getCell(`A${rulesRow}`).font = { bold: true };
	definition.rules.forEach((rule, index) => {
		help.getCell(`A${rulesRow + index + 1}`).value = `• ${rule}`;
	});

	const buffer = await workbook.xlsx.writeBuffer();
	return new Response(new Uint8Array(buffer), {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': disposition
		}
	});
};
