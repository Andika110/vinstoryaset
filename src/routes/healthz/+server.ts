import { sql } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.js';
import { logger } from '#lib/server/logger.js';
import type { RequestHandler } from './$types';

const startedAt = Date.now();

export const GET: RequestHandler = async ({ locals }) => {
	const timestamp = new Date().toISOString();
	try {
		await db.execute(sql`select 1`);
		return json(
			{
				status: 'ok',
				checks: { app: 'ok', database: 'ok' },
				uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
				timestamp
			},
			{ headers: { 'cache-control': 'no-store' } }
		);
	} catch (error) {
		await logger.error('healthz_database_unavailable', {
			module: 'health',
			requestId: locals.requestId,
			name: error instanceof Error ? error.name : 'Error',
			errorMessage: error instanceof Error ? error.message : String(error)
		});
		return json(
			{
				status: 'error',
				checks: { app: 'ok', database: 'error' },
				timestamp
			},
			{ status: 503, headers: { 'cache-control': 'no-store' } }
		);
	}
};
