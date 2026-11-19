import { defineEnvVars } from '@sveltejs/kit/env';

/**
 * Environment variables yang boleh dipakai aplikasi.
 * SvelteKit 3 hanya mengekspos variabel yang dideklarasikan di sini
 * melalui `$app/env/private` atau `$app/env/public`.
 */
export const variables = defineEnvVars({
	PORT: {},
	ORIGIN: {},
	DATABASE_URL: {},
	DATABASE_URL_MIGRATE: {},
	SESSION_SECRET: {},
	UPLOAD_DIR: {}
});
