import { drizzle } from 'drizzle-orm/bun-sql';
import { migrate } from 'drizzle-orm/bun-sql/migrator';
import postgres from 'postgres';
import * as schema from '../../src/lib/server/db/schema/index.js';

const adminBase = process.env.DATABASE_URL_MIGRATE;
const appBase = process.env.DATABASE_URL;
if (!adminBase || !appBase) {
	throw new Error('DATABASE_URL dan DATABASE_URL_MIGRATE wajib diatur untuk test.');
}

const TEST_DB = process.env.TEST_DB_NAME ?? 'inventory_test';

function withDatabase(url: string, database: string): string {
	const parsed = new URL(url);
	parsed.pathname = `/${database}`;
	return parsed.toString();
}

function quoteIdent(value: string): string {
	return `"${value.replace(/"/g, '""')}"`;
}

export const TEST_DATABASE_URL = withDatabase(appBase, TEST_DB);
const TEST_ADMIN_URL = withDatabase(adminBase, TEST_DB);
const ownerRole = decodeURIComponent(new URL(adminBase).username);
const appRole = decodeURIComponent(new URL(appBase).username);

async function ensureDatabase(): Promise<void> {
	const server = postgres(withDatabase(adminBase, 'postgres'), { max: 1, onnotice: () => {} });
	try {
		const existing = await server`select 1 from pg_database where datname = ${TEST_DB}`;
		if (existing.length === 0) {
			await server.unsafe(`CREATE DATABASE ${quoteIdent(TEST_DB)} OWNER ${quoteIdent(ownerRole)}`);
		}
	} finally {
		await server.end();
	}
}

async function grantTestPrivileges(): Promise<void> {
	const sql = postgres(TEST_ADMIN_URL, { max: 1, onnotice: () => {} });
	try {
		await sql.unsafe(`GRANT USAGE ON SCHEMA public TO ${quoteIdent(appRole)}`);
		await sql.unsafe(
			`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${quoteIdent(appRole)}`
		);
		await sql.unsafe(
			`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${quoteIdent(appRole)}`
		);
		await sql.unsafe(
			`REVOKE UPDATE, DELETE, TRUNCATE ON TABLE "audit_logs", "import_batches", "import_batch_rows" FROM ${quoteIdent(appRole)}`
		);
		await sql.unsafe(
			`GRANT SELECT, INSERT ON TABLE "audit_logs", "import_batches", "import_batch_rows" TO ${quoteIdent(appRole)}`
		);
	} finally {
		await sql.end();
	}
}

export async function setupTestDatabase(): Promise<void> {
	await ensureDatabase();
	const migrationDb = drizzle(TEST_ADMIN_URL, { schema });
	await migrate(migrationDb, { migrationsFolder: 'drizzle' });
	await grantTestPrivileges();
}

/** Bersihkan seluruh tabel public di database test tanpa menyentuh tabel migrasi. */
export async function resetTestDatabase(): Promise<void> {
	const sql = postgres(TEST_ADMIN_URL, { max: 1, onnotice: () => {} });
	try {
		await sql.unsafe(`
			DO $$
			DECLARE
				table_list text;
			BEGIN
				SELECT string_agg(format('public.%I', tablename), ', ')
				INTO table_list
				FROM pg_tables
				WHERE schemaname = 'public' AND tablename <> '__drizzle_migrations';

				IF table_list IS NOT NULL THEN
					EXECUTE 'TRUNCATE TABLE ' || table_list || ' RESTART IDENTITY CASCADE';
				END IF;
			END
			$$;
		`);
	} finally {
		await sql.end();
	}
}
