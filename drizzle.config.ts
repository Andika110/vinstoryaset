import { defineConfig } from 'drizzle-kit';

const databaseUrl = process.env.DATABASE_URL_MIGRATE;

if (!databaseUrl) {
	throw new Error('DATABASE_URL_MIGRATE belum diatur. Diperlukan untuk menjalankan migrasi.');
}

export default defineConfig({
	dialect: 'postgresql',
	schema: './src/lib/server/db/schema/index.ts',
	out: './drizzle',
	dbCredentials: {
		url: databaseUrl
	},
	strict: true,
	verbose: true
});
