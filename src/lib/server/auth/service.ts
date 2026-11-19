import { eq, or } from 'drizzle-orm';
import { db } from '#lib/server/db/index.js';
import { auditLogs, outlets, users } from '#lib/server/db/schema/index.js';
import { DomainError } from '#lib/server/errors.js';
import { createSession, toAuthUser, type AuthUser, type SessionContext } from './session.js';

export async function login(
	identifier: string,
	password: string,
	context: SessionContext = {}
): Promise<{ user: AuthUser; token: string }> {
	const normalized = identifier.trim();

	const [row] = await db
		.select({
			user: users,
			outletName: outlets.name
		})
		.from(users)
		.leftJoin(outlets, eq(users.outletId, outlets.id))
		.where(or(eq(users.username, normalized), eq(users.email, normalized)))
		.limit(1);

	if (!row) {
		throw new DomainError('KREDENSIAL_SALAH', 'Username/email atau password salah.');
	}

	const valid = await Bun.password.verify(password, row.user.passwordHash).catch(() => false);

	if (!valid) {
		throw new DomainError('KREDENSIAL_SALAH', 'Username/email atau password salah.');
	}

	if (!row.user.isActive) {
		throw new DomainError('AKUN_NONAKTIF', 'Akun Anda nonaktif. Hubungi IT Administrator.');
	}

	const now = new Date();
	await db.update(users).set({ lastLoginAt: now, updatedAt: now }).where(eq(users.id, row.user.id));

	const token = await createSession(row.user.id, context);

	return {
		user: toAuthUser(row.user, row.outletName),
		token
	};
}

export async function changeOwnPassword(
	user: AuthUser,
	newPassword: string,
	confirmPassword: string
): Promise<void> {
	if (newPassword.length < 8) {
		throw new DomainError('PASSWORD_TERLALU_PENDEK', 'Password minimal 8 karakter.');
	}

	if (newPassword.length > 128) {
		throw new DomainError('PASSWORD_TERLALU_PANJANG', 'Password maksimal 128 karakter.');
	}

	if (newPassword !== confirmPassword) {
		throw new DomainError('PASSWORD_TIDAK_COCOK', 'Konfirmasi password tidak cocok.');
	}

	const [row] = await db
		.select({ passwordHash: users.passwordHash })
		.from(users)
		.where(eq(users.id, user.id))
		.limit(1);

	if (!row) {
		throw new DomainError('TIDAK_DITEMUKAN', 'Akun tidak ditemukan.');
	}

	const samePassword = await Bun.password.verify(newPassword, row.passwordHash).catch(() => false);

	if (samePassword) {
		throw new DomainError(
			'PASSWORD_SAMA',
			'Password baru tidak boleh sama dengan password saat ini.'
		);
	}

	const passwordHash = await Bun.password.hash(newPassword, { algorithm: 'argon2id' });
	const now = new Date();

	await db.transaction(async (tx) => {
		await tx
			.update(users)
			.set({
				passwordHash,
				mustChangePassword: false,
				updatedAt: now
			})
			.where(eq(users.id, user.id));

		await tx.insert(auditLogs).values({
			userId: user.id,
			action: 'password_changed',
			module: 'auth',
			recordId: String(user.id),
			previousValue: { mustChangePassword: true },
			newValue: { mustChangePassword: false }
		});
	});
}
