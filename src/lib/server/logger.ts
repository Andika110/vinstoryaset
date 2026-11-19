import { appendFile, mkdir, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
	debug: 10,
	info: 20,
	warn: 30,
	error: 40
};

const SENSITIVE_KEY =
	/(password|passwd|token|secret|hash|credential|authorization|cookie|file_content|filecontent|body)/i;
const MAX_STRING_LENGTH = 8000;

function positiveInt(value: string | undefined, fallback: number): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

const LOG_DIR = process.env.LOG_DIR ?? './data/logs';
const LOG_FILE = path.join(LOG_DIR, 'app.log');
const MAX_BYTES = positiveInt(process.env.LOG_MAX_BYTES, 5 * 1024 * 1024);
const MAX_FILES = positiveInt(process.env.LOG_MAX_FILES, 5);
const configuredLevel = process.env.LOG_LEVEL;
const MIN_LEVEL: LogLevel =
	configuredLevel === 'debug' ||
	configuredLevel === 'info' ||
	configuredLevel === 'warn' ||
	configuredLevel === 'error'
		? configuredLevel
		: 'info';

export function redactLogContext(value: unknown, depth = 0): unknown {
	if (depth > 6) return '[TRUNCATED]';
	if (typeof value === 'string') {
		return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;
	}
	if (Array.isArray(value)) return value.map((entry) => redactLogContext(entry, depth + 1));
	if (value && typeof value === 'object') {
		const result: Record<string, unknown> = {};
		for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
			result[key] = SENSITIVE_KEY.test(key) ? '[REDACTED]' : redactLogContext(entry, depth + 1);
		}
		return result;
	}
	return value;
}

export function formatLogLine(
	level: LogLevel,
	message: string,
	context: Record<string, unknown> = {}
): string {
	return JSON.stringify({
		...((redactLogContext(context) as Record<string, unknown>) ?? {}),
		timestamp: new Date().toISOString(),
		level,
		message
	});
}

/** Rotasi manual: app.log → app.log.1 → ... → app.log.N; file tertua dihapus. */
export async function rotateLogFiles(filePath: string, maxFiles: number): Promise<void> {
	const safeMax = Math.max(1, Math.floor(maxFiles));
	await rm(`${filePath}.${safeMax}`, { force: true });
	for (let index = safeMax - 1; index >= 1; index -= 1) {
		await rename(`${filePath}.${index}`, `${filePath}.${index + 1}`).catch(() => undefined);
	}
	await rename(filePath, `${filePath}.1`).catch(() => undefined);
}

let writeQueue: Promise<void> = Promise.resolve();

async function writeLine(line: string): Promise<void> {
	await mkdir(LOG_DIR, { recursive: true });

	const current = await stat(LOG_FILE).catch(() => null);
	if (current && current.size >= MAX_BYTES) {
		await rotateLogFiles(LOG_FILE, MAX_FILES);
	}

	await appendFile(LOG_FILE, `${line}\n`, 'utf8');
}

function enqueue(line: string): Promise<void> {
	writeQueue = writeQueue
		.then(() => writeLine(line))
		.catch((error) => {
			console.error(
				formatLogLine('error', 'log_write_failed', {
					error: error instanceof Error ? error.message : String(error)
				})
			);
		});
	return writeQueue;
}

export function logEvent(
	level: LogLevel,
	message: string,
	context: Record<string, unknown> = {}
): Promise<void> {
	if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[MIN_LEVEL]) return Promise.resolve();
	return enqueue(formatLogLine(level, message, context));
}

export const logger = {
	debug: (message: string, context?: Record<string, unknown>) =>
		logEvent('debug', message, context),
	info: (message: string, context?: Record<string, unknown>) => logEvent('info', message, context),
	warn: (message: string, context?: Record<string, unknown>) => logEvent('warn', message, context),
	error: (message: string, context?: Record<string, unknown>) =>
		logEvent('error', message, context),
	logEvent
};
