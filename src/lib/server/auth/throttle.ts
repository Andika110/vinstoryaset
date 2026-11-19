import { DomainError } from '#lib/server/errors.js';

const MAX_ACCOUNT_ATTEMPTS = 5;
const MAX_IP_ATTEMPTS = 20;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

type Attempt = {
	count: number;
	firstAt: number;
	lockedUntil: number | null;
};

const attempts = new Map<string, Attempt>();

function now(): number {
	return Date.now();
}

function accountKey(identifier: string): string {
	return `account:${identifier.trim().toLowerCase()}`;
}

function ipKey(ipAddress: string | null): string {
	return `ip:${ipAddress ?? 'unknown'}`;
}

function resetIfExpired(key: string, entry: Attempt): Attempt | null {
	const current = now();

	if (entry.lockedUntil && entry.lockedUntil > current) {
		return entry;
	}

	if (entry.lockedUntil && entry.lockedUntil <= current) {
		attempts.delete(key);
		return null;
	}

	if (current - entry.firstAt > WINDOW_MS) {
		attempts.delete(key);
		return null;
	}

	return entry;
}

function getEntry(key: string): Attempt | null {
	const entry = attempts.get(key);
	if (!entry) return null;
	return resetIfExpired(key, entry);
}

function record(key: string, maxAttempts: number): void {
	const current = now();
	const existing = getEntry(key);

	if (!existing) {
		attempts.set(key, { count: 1, firstAt: current, lockedUntil: null });
		return;
	}

	existing.count += 1;

	if (existing.count >= maxAttempts) {
		existing.lockedUntil = current + LOCK_MS;
	}
}

function assertNotLocked(key: string): void {
	const entry = getEntry(key);
	if (!entry?.lockedUntil) return;

	const remainingMs = entry.lockedUntil - now();
	const minutes = Math.max(1, Math.ceil(remainingMs / 60000));
	throw new DomainError(
		'LOGIN_DIBATASI',
		`Terlalu banyak percobaan login. Coba lagi dalam ${minutes} menit.`
	);
}

export function checkLoginAllowed(identifier: string, ipAddress: string | null): void {
	assertNotLocked(accountKey(identifier));
	assertNotLocked(ipKey(ipAddress));
}

export function recordLoginFailure(identifier: string, ipAddress: string | null): void {
	record(accountKey(identifier), MAX_ACCOUNT_ATTEMPTS);
	record(ipKey(ipAddress), MAX_IP_ATTEMPTS);
}

export function recordLoginSuccess(identifier: string, ipAddress: string | null): void {
	attempts.delete(accountKey(identifier));

	const ip = getEntry(ipKey(ipAddress));
	if (ip && !ip.lockedUntil) {
		attempts.delete(ipKey(ipAddress));
	}
}

/** Hanya untuk pengujian lokal. */
export function resetLoginThrottleForTests(): void {
	attempts.clear();
}
