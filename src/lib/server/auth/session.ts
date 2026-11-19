import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull, ne } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';
import { dev } from '$app/env';
import { db } from '#lib/server/db/index.js';
import { outlets, sessions, users } from '#lib/server/db/schema/index.js';
import type { Role } from '#lib/navigation.js';

export const SESSION_COOKIE = 'inventory_session';
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000;
const RENEW_AFTER_MS = 60 * 60 * 1000;

export type AuthUser = {
	id: number;
	username: string;
	email: string;
	fullName: string;
	role: Role;
	outletId: number | null;
	outletName: string | null;
	mustChangePassword: boolean;
};

export type SessionContext = {
	userAgent?: string | null;
	ipAddress?: string | null;
};

type UserRow = typeof users.$inferSelect;

export function toAuthUser(row: UserRow, outletName: string | null = null): AuthUser {
	return {
		id: row.id,
		username: row.username,
		email: row.email,
		fullName: row.fullName,
		role: row.role,
		outletId: row.outletId,
		outletName,
		mustChangePassword: row.mustChangePassword
	};
}

export function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: number, context: SessionContext = {}): Promise<string> {
	const token = randomBytes(32).toString('base64url');
	const now = new Date();

	await db.insert(sessions).values({
		userId,
		tokenHash: hashToken(token),
		expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
		lastSeenAt: now,
		userAgent: context.userAgent ?? null,
		ipAddress: context.ipAddress ?? null
	});

	return token;
}

export async function validateSession(
	token: string,
	context: SessionContext = {}
): Promise<{ user: AuthUser; renewed: boolean } | null> {
	const now = new Date();

	const [row] = await db
		.select({
			session: sessions,
			user: users,
			outletName: outlets.name
		})
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.leftJoin(outlets, eq(users.outletId, outlets.id))
		.where(
			and(
				eq(sessions.tokenHash, hashToken(token)),
				isNull(sessions.revokedAt),
				gt(sessions.expiresAt, now)
			)
		)
		.limit(1);

	if (!row || !row.user.isActive) {
		if (row) {
			await db.update(sessions).set({ revokedAt: now }).where(eq(sessions.id, row.session.id));
		}
		return null;
	}

	let renewed = false;

	if (row.session.lastSeenAt.getTime() < now.getTime() - RENEW_AFTER_MS) {
		const nextExpiry = new Date(now.getTime() + SESSION_TTL_MS);
		await db
			.update(sessions)
			.set({
				lastSeenAt: now,
				expiresAt: nextExpiry,
				userAgent: context.userAgent ?? row.session.userAgent,
				ipAddress: context.ipAddress ?? row.session.ipAddress
			})
			.where(eq(sessions.id, row.session.id));
		renewed = true;
	}

	return {
		user: toAuthUser(row.user, row.outletName),
		renewed
	};
}

export async function revokeSession(token: string): Promise<void> {
	await db
		.update(sessions)
		.set({ revokedAt: new Date() })
		.where(and(eq(sessions.tokenHash, hashToken(token)), isNull(sessions.revokedAt)));
}

export async function revokeAllUserSessions(
	userId: number,
	exceptTokenHash?: string
): Promise<void> {
	await db
		.update(sessions)
		.set({ revokedAt: new Date() })
		.where(
			and(
				eq(sessions.userId, userId),
				isNull(sessions.revokedAt),
				exceptTokenHash ? ne(sessions.tokenHash, exceptTokenHash) : undefined
			)
		);
}

export function getSessionToken(cookies: Cookies): string | undefined {
	return cookies.get(SESSION_COOKIE);
}

export function setSessionCookie(cookies: Cookies, token: string): void {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: SESSION_TTL_SECONDS
	});
}

export function clearSessionCookie(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
