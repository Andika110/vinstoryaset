import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm';
import { assertCan } from '#lib/server/auth/permissions.js';
import type { AuthUser } from '#lib/server/auth/session.js';
import { db } from '#lib/server/db/index.js';
import { auditLogs, users } from '#lib/server/db/schema/index.js';
import { DomainError } from '#lib/server/errors.js';

const SUPPORT_MODULES = [
	'asset',
	'assignment',
	'mutation',
	'loan',
	'maintenance',
	'stock',
	'receiving',
	'inventory',
	'request',
	'import',
	'opname',
	'disposal'
] as const;

export type AuditListItem = {
	id: number;
	userName: string;
	username: string;
	action: string;
	module: string;
	recordId: string | null;
	createdAtLabel: string;
};

export type AuditFilter = {
	search?: string;
	userId?: number | null;
	module?: string;
	action?: string;
	from?: string;
	to?: string;
	page?: number;
	pageSize?: number;
};

export type AuditListResult = {
	items: AuditListItem[];
	page: number;
	pageSize: number;
	total: number;
	filters: {
		users: { id: number; label: string }[];
		modules: { value: string; label: string }[];
		actions: { value: string; label: string }[];
	};
};

export type AuditDetail = AuditListItem & {
	role: string;
	previousValue: unknown;
	newValue: unknown;
};

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('id-ID', {
	dateStyle: 'medium',
	timeStyle: 'short',
	timeZone: 'Asia/Jakarta'
});

const SENSITIVE_KEY = /(password|passwd|token|secret|hash|credential|authorization|cookie)/i;

function formatDateTime(value: Date): string {
	return DATE_TIME_FORMAT.format(value);
}

function canReadAll(actor: AuthUser): boolean {
	return actor.role === 'admin';
}

function assertAuditAccess(actor: AuthUser): void {
	if (actor.role === 'admin') {
		assertCan(actor, 'audit:read:all');
		return;
	}
	if (actor.role === 'support') {
		assertCan(actor, 'audit:read:limited');
		return;
	}
	throw new DomainError('DILARANG', 'Anda tidak punya akses ke audit log.');
}

function moduleAllowed(actor: AuthUser, module: string): boolean {
	return canReadAll(actor) || (SUPPORT_MODULES as readonly string[]).includes(module);
}

export function redactAuditValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(redactAuditValue);
	if (value && typeof value === 'object') {
		const result: Record<string, unknown> = {};
		for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
			result[key] = SENSITIVE_KEY.test(key) ? '[REDACTED]' : redactAuditValue(entry);
		}
		return result;
	}
	return value;
}

export async function listAuditLogs(
	actor: AuthUser,
	filter: AuditFilter = {}
): Promise<AuditListResult> {
	assertAuditAccess(actor);
	const search = String(filter.search ?? '').trim();
	const term = `%${search}%`;
	const pageSize = Math.min(100, Math.max(5, filter.pageSize ?? 20));
	const from = filter.from && /^\d{4}-\d{2}-\d{2}$/.test(filter.from) ? filter.from : null;
	const to = filter.to && /^\d{4}-\d{2}-\d{2}$/.test(filter.to) ? filter.to : null;
	const fromDate = from ? new Date(`${from}T00:00:00+07:00`) : null;
	const toDate = to ? new Date(`${to}T23:59:59.999+07:00`) : null;
	const module = filter.module && filter.module.trim() ? filter.module.trim() : null;
	const action = filter.action && filter.action.trim() ? filter.action.trim() : null;

	if (module && !moduleAllowed(actor, module)) {
		throw new DomainError('DILARANG', 'Anda tidak punya akses ke modul audit ini.');
	}

	const where = and(
		canReadAll(actor) ? undefined : inArray(auditLogs.module, [...SUPPORT_MODULES]),
		module ? eq(auditLogs.module, module) : undefined,
		action ? eq(auditLogs.action, action) : undefined,
		filter.userId ? eq(auditLogs.userId, filter.userId) : undefined,
		fromDate ? gte(auditLogs.createdAt, fromDate) : undefined,
		toDate ? lte(auditLogs.createdAt, toDate) : undefined,
		search
			? or(
					ilike(users.fullName, term),
					ilike(users.username, term),
					ilike(auditLogs.action, term),
					ilike(auditLogs.module, term),
					ilike(auditLogs.recordId, term)
				)
			: undefined
	);

	const [{ total }] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(auditLogs)
		.innerJoin(users, eq(auditLogs.userId, users.id))
		.where(where);

	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const page = Math.min(Math.max(filter.page ?? 1, 1), totalPages);
	const offset = (page - 1) * pageSize;

	const rows = await db
		.select({
			id: auditLogs.id,
			action: auditLogs.action,
			module: auditLogs.module,
			recordId: auditLogs.recordId,
			createdAt: auditLogs.createdAt,
			userName: users.fullName,
			username: users.username
		})
		.from(auditLogs)
		.innerJoin(users, eq(auditLogs.userId, users.id))
		.where(where)
		.orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
		.limit(pageSize)
		.offset(offset);

	const moduleWhere = canReadAll(actor)
		? undefined
		: inArray(auditLogs.module, [...SUPPORT_MODULES]);
	const [moduleRows, actionRows, userRows] = await Promise.all([
		db
			.selectDistinct({ module: auditLogs.module })
			.from(auditLogs)
			.where(moduleWhere)
			.orderBy(asc(auditLogs.module)),
		db
			.selectDistinct({ action: auditLogs.action })
			.from(auditLogs)
			.where(moduleWhere)
			.orderBy(asc(auditLogs.action)),
		db
			.selectDistinct({ id: users.id, fullName: users.fullName, username: users.username })
			.from(auditLogs)
			.innerJoin(users, eq(auditLogs.userId, users.id))
			.where(moduleWhere)
			.orderBy(asc(users.fullName))
	]);

	return {
		items: rows.map((row) => ({
			id: row.id,
			userName: row.userName,
			username: row.username,
			action: row.action,
			module: row.module,
			recordId: row.recordId,
			createdAtLabel: formatDateTime(row.createdAt)
		})),
		page,
		pageSize,
		total,
		filters: {
			users: userRows.map((row) => ({
				id: row.id,
				label: `${row.fullName} (${row.username})`
			})),
			modules: moduleRows.map((row) => ({ value: row.module, label: row.module })),
			actions: actionRows.map((row) => ({ value: row.action, label: row.action }))
		}
	};
}

export async function getAuditLog(actor: AuthUser, id: number): Promise<AuditDetail> {
	assertAuditAccess(actor);
	const [row] = await db
		.select({
			id: auditLogs.id,
			action: auditLogs.action,
			module: auditLogs.module,
			recordId: auditLogs.recordId,
			previousValue: auditLogs.previousValue,
			newValue: auditLogs.newValue,
			createdAt: auditLogs.createdAt,
			userName: users.fullName,
			username: users.username,
			role: users.role
		})
		.from(auditLogs)
		.innerJoin(users, eq(auditLogs.userId, users.id))
		.where(eq(auditLogs.id, id))
		.limit(1);

	if (!row || !moduleAllowed(actor, row.module)) {
		throw new DomainError('TIDAK_DITEMUKAN', 'Audit log tidak ditemukan.');
	}

	return {
		id: row.id,
		userName: row.userName,
		username: row.username,
		role: row.role,
		action: row.action,
		module: row.module,
		recordId: row.recordId,
		createdAtLabel: formatDateTime(row.createdAt),
		previousValue: redactAuditValue(row.previousValue),
		newValue: redactAuditValue(row.newValue)
	};
}
