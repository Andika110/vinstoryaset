import { sql } from 'drizzle-orm';
import {
	boolean,
	check,
	index,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';
import { timestamps } from './columns';
import { userRoleEnum } from './enums';
import { outlets } from './organization';

export const users = pgTable(
	'users',
	{
		id: serial('id').primaryKey(),
		username: text('username').notNull(),
		email: text('email').notNull(),
		passwordHash: text('password_hash').notNull(),
		fullName: text('full_name').notNull(),
		role: userRoleEnum('role').notNull(),
		outletId: integer('outlet_id').references(() => outlets.id),
		isActive: boolean('is_active').notNull().default(true),
		mustChangePassword: boolean('must_change_password').notNull().default(true),
		lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
		...timestamps()
	},
	(t) => [
		uniqueIndex('users_username_unique').on(t.username),
		uniqueIndex('users_email_unique').on(t.email),
		index('users_role_idx').on(t.role),
		index('users_outlet_idx').on(t.outletId),
		index('users_active_idx').on(t.isActive),
		check('users_outlet_required', sql`(${t.role}::text <> 'outlet' OR ${t.outletId} IS NOT NULL)`)
	]
);

export const sessions = pgTable(
	'sessions',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id),
		tokenHash: text('token_hash').notNull(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
		userAgent: text('user_agent'),
		ipAddress: text('ip_address'),
		revokedAt: timestamp('revoked_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		uniqueIndex('sessions_token_hash_unique').on(t.tokenHash),
		index('sessions_user_idx').on(t.userId),
		index('sessions_expires_idx').on(t.expiresAt)
	]
);
