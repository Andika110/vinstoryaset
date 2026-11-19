import { DATABASE_URL } from '$app/env/private';
import { drizzle } from 'drizzle-orm/bun-sql';
import * as schema from './schema';

if (!DATABASE_URL) {
	throw new Error('DATABASE_URL belum diatur. Salin .env.example menjadi .env.');
}

export const db = drizzle(DATABASE_URL, { schema });
export { schema };
