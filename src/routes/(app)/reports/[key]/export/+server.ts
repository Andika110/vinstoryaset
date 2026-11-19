import ExcelJS from 'exceljs';
import { error } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import { parseReportFilters, runReport } from '#lib/server/services/reports.js';
import type { RequestHandler } from './$types';

const MAX_EXPORT_ROWS = 50_000;

function csvCell(value: unknown): string {
	const text = value === null || value === undefined ? '' : String(value);
	return `"${text.replace(/"/g, '""')}"`;
}

function fileName(key: string, extension: string): string {
	const today = new Date().toISOString().slice(0, 10);
	return `${key}-${today}.${extension}`;
}

export const GET: RequestHandler = async ({ locals, params, url }) => {
	const actor = requireUser(locals, url);
	const format = url.searchParams.get('format') ?? 'csv';
	if (format !== 'csv' && format !== 'xlsx') {
		throw error(400, 'Format export tidak dikenal.');
	}

	try {
		const result = await runReport(actor, params.key, parseReportFilters(url), 1, MAX_EXPORT_ROWS);
		if (result.total > MAX_EXPORT_ROWS) {
			throw error(
				400,
				'Data terlalu besar untuk diekspor sekaligus. Persempit filter terlebih dahulu.'
			);
		}

		const headers = result.columns.map((column) => column.label);
		const rows = result.rows.map((row) => result.columns.map((column) => row[column.key] ?? ''));

		if (format === 'csv') {
			const encoder = new TextEncoder();
			const stream = new ReadableStream<Uint8Array>({
				start(controller) {
					controller.enqueue(encoder.encode('\uFEFF'));
					controller.enqueue(encoder.encode(headers.map(csvCell).join(',') + '\r\n'));
					for (const row of rows) {
						controller.enqueue(encoder.encode(row.map(csvCell).join(',') + '\r\n'));
					}
					controller.close();
				}
			});
			return new Response(stream, {
				headers: {
					'Content-Type': 'text/csv; charset=utf-8',
					'Content-Disposition': `attachment; filename="${fileName(params.key, 'csv')}"`,
					'Cache-Control': 'no-store'
				}
			});
		}

		const workbook = new ExcelJS.Workbook();
		const worksheet = workbook.addWorksheet(result.definition.title.slice(0, 31));
		worksheet.columns = result.columns.map((column) => ({
			header: column.label,
			key: column.key,
			width: Math.max(14, Math.min(40, column.label.length + 6))
		}));
		worksheet.getRow(1).font = { bold: true };
		for (const row of result.rows) {
			worksheet.addRow(row);
		}
		const buffer = await workbook.xlsx.writeBuffer();

		return new Response(new Uint8Array(buffer), {
			headers: {
				'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'Content-Disposition': `attachment; filename="${fileName(params.key, 'xlsx')}"`,
				'Cache-Control': 'no-store'
			}
		});
	} catch (err) {
		if (err instanceof DomainError) {
			throw error(err.code === 'TIDAK_DITEMUKAN' ? 404 : 403, err.message);
		}
		throw err;
	}
};
