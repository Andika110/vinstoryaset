import { randomBytes } from 'node:crypto';
import { and, desc, eq, gt, ilike, isNull, ne, or, sql, type SQL } from 'drizzle-orm';
import { db } from '#lib/server/db/index.js';
import { outlets, sessions, users } from '#lib/server/db/schema/index.js';
import { writeAudit } from '#lib/server/audit.js';
import { assertCan } from '#lib/server/auth/permissions.js';
import type { AuthUser } from '#lib/server/auth/session.js';
import { isUniqueViolation } from '#lib/server/db/errors.js';
import { DomainError } from '#lib/server/errors.js';
import { MESSAGES } from '#lib/messages.js';

export type UserRole = 'admin' | 'support' | 'outlet';

export type UserListItem = {
	id: number;
	username: string;
	email: string;
	fullName: string;
	role: UserRole;
	outletId: number | null;
	outletName: string | null;
	isActive: boolean;
	mustChangePassword: boolean;
	lastLoginAt: Date | null;
	createdAt: Date;
};

export type UserSessionInfo = {
	id: string;
	userAgent: string | null;
	ipAddress: string | null;
	lastSeenAt: Date;
	expiresAt: Date;
	createdAt: Date;
};

export type UserDetail = UserListItem & {
	sessions: UserSessionInfo[];
};

export type ListUsersFilter = {
	search?: string;
	role?: string;
	outletId?: number | null;
	status?: string;
	page?: number;
	pageSize?: number;
};

export type CreateUserInput = {
	username: string;
	email: string;
	fullName: string;
	role: UserRole;
	outletId: number | null;
	password: string;
	isActive: boolean;
};

export type UpdateUserInput = {
	username: string;
	email: string;
	fullName: string;
	role: UserRole;
	outletId: number | null;
	isActive: boolean;
};

type UserRow = typeof users.$inferSelect;

function isRole(value: string | undefined): value is UserRole {
	return value === 'admin' || value === 'support' || value === 'outlet';
}

function toUserListItem(row: UserRow, outletName: string | null): UserListItem {
	return {
		id: row.id,
		username: row.username,
		email: row.email,
		fullName: row.fullName,
		role: row.role,
		outletId: row.outletId,
		outletName,
		isActive: row.isActive,
		mustChangePassword: row.mustChangePassword,
		lastLoginAt: row.lastLoginAt,
		createdAt: row.createdAt
	};
}

function toSessionInfo(row: typeof sessions.$inferSelect): UserSessionInfo {
	return {
		id: row.id,
		userAgent: row.userAgent,
		ipAddress: row.ipAddress,
		lastSeenAt: row.lastSeenAt,
		expiresAt: row.expiresAt,
		createdAt: row.createdAt
	};
}

function duplicateError(
	row: { username: string; email: string },
	input: { username: string; email: string }
): DomainError {
	if (row.username === input.username) {
		return new DomainError('DUPLIKAT', MESSAGES.duplicate('Username'));
	}
	if (row.email === input.email) {
		return new DomainError('DUPLIKAT', MESSAGES.duplicate('Email'));
	}
	return new DomainError('DUPLIKAT', 'Username atau email sudah digunakan.');
}

function normalizeFields(input: {
	username: string;
	email: string;
	fullName: string;
	role: UserRole;
	outletId: number | null;
}) {
	const username = input.username.trim();
	const email = input.email.trim().toLowerCase();
	const fullName = input.fullName.trim();

	if (!/^[a-zA-Z0-9._-]{3,50}$/.test(username)) {
		throw new DomainError(
			'VALIDASI',
			'Username 3–50 karakter dan hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda hubung.'
		);
	}

	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		throw new DomainError('VALIDASI', 'Format email tidak valid.');
	}

	if (fullName.length < 2 || fullName.length > 100) {
		throw new DomainError('VALIDASI', 'Nama lengkap harus 2–100 karakter.');
	}

	if (input.role === 'outlet' && input.outletId == null) {
		throw new DomainError('VALIDASI', 'Outlet wajib dipilih untuk role Outlet Management.');
	}

	return { username, email, fullName, role: input.role, outletId: input.outletId };
}

export async function listUsers(actor: AuthUser, filter: ListUsersFilter = {}) {
	assertCan(actor, 'user:read');

	const pageSize = Math.min(100, Math.max(5, filter.pageSize ?? 10));
	const conditions: SQL[] = [];

	if (filter.search?.trim()) {
		const term = `%${filter.search.trim()}%`;
		const searchCondition = or(
			ilike(users.username, term),
			ilike(users.email, term),
			ilike(users.fullName, term)
		);
		if (searchCondition) conditions.push(searchCondition);
	}

	if (isRole(filter.role)) {
		conditions.push(eq(users.role, filter.role));
	}

	if (typeof filter.outletId === 'number') {
		conditions.push(eq(users.outletId, filter.outletId));
	}

	if (filter.status === 'active') {
		conditions.push(eq(users.isActive, true));
	} else if (filter.status === 'inactive') {
		conditions.push(eq(users.isActive, false));
	}

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	const [countRow] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(users)
		.leftJoin(outlets, eq(users.outletId, outlets.id))
		.where(whereClause);

	const total = countRow?.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const page = Math.min(Math.max(filter.page ?? 1, 1), totalPages);

	const rows = await db
		.select({ user: users, outletName: outlets.name })
		.from(users)
		.leftJoin(outlets, eq(users.outletId, outlets.id))
		.where(whereClause)
		.orderBy(desc(users.createdAt))
		.limit(pageSize)
		.offset((page - 1) * pageSize);

	return {
		items: rows.map((row) => toUserListItem(row.user, row.outletName)),
		page,
		pageSize,
		total
	};
}

export async function getUserDetail(actor: AuthUser, id: number): Promise<UserDetail> {
	assertCan(actor, 'user:read');

	const [row] = await db
		.select({ user: users, outletName: outlets.name })
		.from(users)
		.leftJoin(outlets, eq(users.outletId, outlets.id))
		.where(eq(users.id, id))
		.limit(1);

	if (!row) {
		throw new DomainError('TIDAK_DITEMUKAN', 'Pengguna tidak ditemukan.');
	}

	const sessionRows = await db
		.select()
		.from(sessions)
		.where(
			and(eq(sessions.userId, id), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date()))
		)
		.orderBy(desc(sessions.lastSeenAt));

	return {
		...toUserListItem(row.user, row.outletName),
		sessions: sessionRows.map(toSessionInfo)
	};
}

export async function listActiveOutlets(actor: AuthUser) {
	assertCan(actor, 'user:read');

	return db
		.select({ id: outlets.id, code: outlets.code, name: outlets.name })
		.from(outlets)
		.where(eq(outlets.isActive, true))
		.orderBy(outlets.name);
}

export async function createUser(actor: AuthUser, input: CreateUserInput): Promise<number> {
	assertCan(actor, 'user:write');

	const normalized = normalizeFields(input);

	if (input.password.length < 8 || input.password.length > 128) {
		throw new DomainError('VALIDASI', 'Password awal harus 8–128 karakter.');
	}

	const [existing] = await db
		.select({ id: users.id, username: users.username, email: users.email })
		.from(users)
		.where(or(eq(users.username, normalized.username), eq(users.email, normalized.email)))
		.limit(1);

	if (existing) {
		throw duplicateError(existing, normalized);
	}

	const passwordHash = await Bun.password.hash(input.password, { algorithm: 'argon2id' });

	try {
		return await db.transaction(async (tx) => {
			const [created] = await tx
				.insert(users)
				.values({
					username: normalized.username,
					email: normalized.email,
					passwordHash,
					fullName: normalized.fullName,
					role: normalized.role,
					outletId: normalized.outletId,
					isActive: input.isActive,
					mustChangePassword: true
				})
				.returning({ id: users.id });

			await writeAudit(tx, actor, {
				module: 'user',
				action: 'user_created',
				recordId: String(created.id),
				newValue: {
					username: normalized.username,
					email: normalized.email,
					fullName: normalized.fullName,
					role: normalized.role,
					outletId: normalized.outletId,
					isActive: input.isActive,
					mustChangePassword: true
				}
			});

			return created.id;
		});
	} catch (error) {
		if (isUniqueViolation(error)) {
			throw new DomainError('DUPLIKAT', 'Username atau email sudah digunakan.');
		}
		throw error;
	}
}

export async function updateUser(
	actor: AuthUser,
	id: number,
	input: UpdateUserInput
): Promise<void> {
	assertCan(actor, 'user:write');

	const normalized = normalizeFields(input);

	try {
		await db.transaction(async (tx) => {
			const [target] = await tx.select().from(users).where(eq(users.id, id)).limit(1);

			if (!target) {
				throw new DomainError('TIDAK_DITEMUKAN', 'Pengguna tidak ditemukan.');
			}

			if (target.id === actor.id && !input.isActive) {
				throw new DomainError('DILARANG', 'Anda tidak dapat menonaktifkan akun sendiri.');
			}

			if (target.role === 'admin' && (normalized.role !== 'admin' || !input.isActive)) {
				const [adminCount] = await tx
					.select({ value: sql<number>`count(*)::int` })
					.from(users)
					.where(and(eq(users.role, 'admin'), eq(users.isActive, true), ne(users.id, id)));

				if ((adminCount?.value ?? 0) === 0) {
					throw new DomainError(
						'ADMIN_TERAKHIR',
						'Tidak dapat menonaktifkan atau mengubah role admin aktif terakhir.'
					);
				}
			}

			const [duplicate] = await tx
				.select({ id: users.id, username: users.username, email: users.email })
				.from(users)
				.where(
					and(
						ne(users.id, id),
						or(eq(users.username, normalized.username), eq(users.email, normalized.email))
					)
				)
				.limit(1);

			if (duplicate) {
				throw duplicateError(duplicate, normalized);
			}

			const now = new Date();
			await tx
				.update(users)
				.set({
					username: normalized.username,
					email: normalized.email,
					fullName: normalized.fullName,
					role: normalized.role,
					outletId: normalized.outletId,
					isActive: input.isActive,
					updatedAt: now
				})
				.where(eq(users.id, id));

			if (
				target.role !== normalized.role ||
				target.outletId !== normalized.outletId ||
				target.isActive !== input.isActive
			) {
				await tx
					.update(sessions)
					.set({ revokedAt: now })
					.where(and(eq(sessions.userId, id), isNull(sessions.revokedAt)));
			}

			await writeAudit(tx, actor, {
				module: 'user',
				action: 'user_updated',
				recordId: String(id),
				previousValue: {
					username: target.username,
					email: target.email,
					fullName: target.fullName,
					role: target.role,
					outletId: target.outletId,
					isActive: target.isActive
				},
				newValue: {
					username: normalized.username,
					email: normalized.email,
					fullName: normalized.fullName,
					role: normalized.role,
					outletId: normalized.outletId,
					isActive: input.isActive
				}
			});
		});
	} catch (error) {
		if (isUniqueViolation(error)) {
			throw new DomainError('DUPLIKAT', 'Username atau email sudah digunakan.');
		}
		throw error;
	}
}

export async function resetUserPassword(actor: AuthUser, id: number): Promise<string> {
	assertCan(actor, 'user:write');

	const temporaryPassword = randomBytes(9).toString('base64url');
	const passwordHash = await Bun.password.hash(temporaryPassword, { algorithm: 'argon2id' });

	await db.transaction(async (tx) => {
		const [target] = await tx
			.update(users)
			.set({
				passwordHash,
				mustChangePassword: true,
				updatedAt: new Date()
			})
			.where(eq(users.id, id))
			.returning({ id: users.id, username: users.username });

		if (!target) {
			throw new DomainError('TIDAK_DITEMUKAN', 'Pengguna tidak ditemukan.');
		}

		await tx
			.update(sessions)
			.set({ revokedAt: new Date() })
			.where(and(eq(sessions.userId, id), isNull(sessions.revokedAt)));

		await writeAudit(tx, actor, {
			module: 'user',
			action: 'password_reset',
			recordId: String(id),
			newValue: {
				username: target.username,
				mustChangePassword: true,
				sessionsRevoked: true
			}
		});
	});

	return temporaryPassword;
}

export async function revokeSession(
	actor: AuthUser,
	userId: number,
	sessionId: string
): Promise<void> {
	assertCan(actor, 'user:write');

	await db.transaction(async (tx) => {
		const [revoked] = await tx
			.update(sessions)
			.set({ revokedAt: new Date() })
			.where(
				and(eq(sessions.id, sessionId), eq(sessions.userId, userId), isNull(sessions.revokedAt))
			)
			.returning({ id: sessions.id });

		if (!revoked) {
			throw new DomainError('TIDAK_DITEMUKAN', 'Sesi tidak ditemukan.');
		}

		await writeAudit(tx, actor, {
			module: 'user',
			action: 'session_revoked',
			recordId: sessionId,
			newValue: { userId, sessionId }
		});
	});
}

export async function revokeAllSessions(actor: AuthUser, userId: number): Promise<void> {
	assertCan(actor, 'user:write');

	await db.transaction(async (tx) => {
		await tx
			.update(sessions)
			.set({ revokedAt: new Date() })
			.where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));

		await writeAudit(tx, actor, {
			module: 'user',
			action: 'sessions_revoked',
			recordId: String(userId),
			newValue: { userId, allSessions: true }
		});
	});
}
