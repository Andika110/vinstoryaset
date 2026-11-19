import { mock } from 'bun:test';
import { setupTestDatabase, TEST_DATABASE_URL } from './helpers/test-db.js';

await setupTestDatabase();

mock.module('$app/env/private', () => ({
	DATABASE_URL: TEST_DATABASE_URL
}));
mock.module('$app/env', () => ({
	browser: false,
	dev: true,
	building: false,
	version: 'test'
}));
