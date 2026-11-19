import { describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { formatLogLine, redactLogContext, rotateLogFiles } from '#lib/server/logger.js';

describe('structured logger', () => {
	test('membuat JSON dengan level, pesan, dan request id', () => {
		const line = formatLogLine('info', 'request_completed', {
			requestId: 'req_test',
			module: 'http',
			status: 200
		});
		const parsed = JSON.parse(line) as Record<string, unknown>;
		expect(parsed.level).toBe('info');
		expect(parsed.message).toBe('request_completed');
		expect(parsed.requestId).toBe('req_test');
		expect(typeof parsed.timestamp).toBe('string');
	});

	test('meredaksi password, token, body, dan file content', () => {
		const redacted = redactLogContext({
			username: 'qa',
			password: 'secret',
			nested: { token: 'abc', note: 'ok' },
			body: 'isi request',
			file_content: 'isi file',
			stack: 'Error: contoh'
		}) as Record<string, unknown>;
		expect(redacted.username).toBe('qa');
		expect(redacted.password).toBe('[REDACTED]');
		expect((redacted.nested as Record<string, unknown>).token).toBe('[REDACTED]');
		expect((redacted.nested as Record<string, unknown>).note).toBe('ok');
		expect(redacted.body).toBe('[REDACTED]');
		expect(redacted.file_content).toBe('[REDACTED]');
		expect(redacted.stack).toBe('Error: contoh');
	});

	test('rotasi memindahkan app.log dan membatasi jumlah file', async () => {
		const dir = await mkdtemp(path.join(os.tmpdir(), `qa-log-${randomUUID()}-`));
		const file = path.join(dir, 'app.log');
		try {
			await writeFile(file, 'baru', 'utf8');
			await writeFile(`${file}.1`, 'lama-1', 'utf8');
			await writeFile(`${file}.2`, 'lama-2', 'utf8');
			await writeFile(`${file}.3`, 'tertua', 'utf8');

			await rotateLogFiles(file, 3);

			expect(await readFile(`${file}.1`, 'utf8')).toBe('baru');
			expect(await readFile(`${file}.2`, 'utf8')).toBe('lama-1');
			expect(await readFile(`${file}.3`, 'utf8')).toBe('lama-2');
			await expect(readFile(`${file}.4`, 'utf8')).rejects.toThrow();
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});
});
