import { and, asc, desc, eq, inArray, lt, sql, type SQL } from 'drizzle-orm';
import type { ResolvedPathname } from '$app/types';
import type {
	ActivityBadge,
	ActivityRowData,
	DashboardData,
	DashboardListData,
	QuickAction,
	SummaryCardData,
	WarningItem,
	Widget
} from '#lib/dashboard.js';
import type { Scope } from '#lib/server/auth/permissions.js';
import { scopeToUser } from '#lib/server/auth/permissions.js';
import type { AuthUser } from '#lib/server/auth/session.js';
import { db } from '#lib/server/db/index.js';
import {
	assetLoans,
	assetMaintenances,
	assetMovements,
	assets,
	inventoryItems,
	itemRequests,
	locations,
	outlets,
	requestStatusEnum,
	stockBalances,
	stockTransactions
} from '#lib/server/db/schema/index.js';

type RequestStatus = (typeof requestStatusEnum.enumValues)[number];

const ACTIVE_MAINTENANCE = ['reported', 'in_progress', 'waiting_parts'] as const;
const PENDING_REQUESTS = ['submitted', 'processing', 'partially_fulfilled'] as const;

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('id-ID', {
	dateStyle: 'medium',
	timeStyle: 'short',
	timeZone: 'Asia/Jakarta'
});
const DATE_FORMAT = new Intl.DateTimeFormat('id-ID', {
	dateStyle: 'medium',
	timeZone: 'Asia/Jakarta'
});
const HOUR_FORMAT = new Intl.DateTimeFormat('id-ID', {
	hour: 'numeric',
	hour12: false,
	timeZone: 'Asia/Jakarta'
});

function jakartaToday(): string {
	return new Intl.DateTimeFormat('en-CA', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		timeZone: 'Asia/Jakarta'
	}).format(new Date());
}

function formatDateTime(value: Date | string | null | undefined): string | undefined {
	if (!value) return undefined;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? undefined : DATE_TIME_FORMAT.format(date);
}

function formatDate(value: string | Date | null | undefined): string | undefined {
	if (!value) return undefined;
	const date = value instanceof Date ? value : new Date(`${value}T00:00:00+07:00`);
	return Number.isNaN(date.getTime()) ? undefined : DATE_FORMAT.format(date);
}

function greeting(name: string): string {
	const hour = Number(HOUR_FORMAT.format(new Date()));
	const part = hour < 11 ? 'pagi' : hour < 15 ? 'siang' : hour < 18 ? 'sore' : 'malam';
	const firstName = name.trim().split(/\s+/)[0] ?? name;
	return `Selamat ${part}, ${firstName}`;
}

function outletCondition(scope: Scope): SQL | undefined {
	return scope.allOutlets ? undefined : eq(locations.outletId, scope.outletId!);
}

function toHref(path: string): ResolvedPathname {
	return path as ResolvedPathname;
}

function assetHref(code: string): ResolvedPathname {
	return toHref(`/assets?search=${encodeURIComponent(code)}`);
}

function inventoryHref(name: string): ResolvedPathname {
	return toHref(`/inventory?search=${encodeURIComponent(name)}`);
}

function requestHref(number: string): ResolvedPathname {
	return toHref(`/requests?search=${encodeURIComponent(number)}`);
}

function requestBadge(status: string): ActivityBadge {
	const map: Record<string, { label: string; tone: ActivityBadge['tone'] }> = {
		submitted: { label: 'Menunggu', tone: 'warning' },
		processing: { label: 'Diproses', tone: 'info' },
		partially_fulfilled: { label: 'Terpenuhi sebagian', tone: 'info' },
		fulfilled: { label: 'Selesai', tone: 'success' },
		rejected: { label: 'Ditolak', tone: 'danger' },
		cancelled: { label: 'Dibatalkan', tone: 'neutral' }
	};
	const entry = map[status] ?? { label: status, tone: 'neutral' as const };
	return entry;
}

function maintenanceBadge(status: string): ActivityBadge {
	const map: Record<string, { label: string; tone: ActivityBadge['tone'] }> = {
		reported: { label: 'Dilaporkan', tone: 'warning' },
		in_progress: { label: 'Dikerjakan', tone: 'info' },
		waiting_parts: { label: 'Menunggu sparepart', tone: 'warning' },
		completed: { label: 'Selesai', tone: 'success' },
		cancelled: { label: 'Dibatalkan', tone: 'neutral' }
	};
	const entry = map[status] ?? { label: status, tone: 'neutral' as const };
	return entry;
}

function stockBadge(type: string): ActivityBadge {
	const map: Record<string, { label: string; tone: ActivityBadge['tone'] }> = {
		opening_balance: { label: 'Saldo awal', tone: 'info' },
		stock_in: { label: 'Stok masuk', tone: 'success' },
		stock_out: { label: 'Stok keluar', tone: 'warning' },
		transfer_out: { label: 'Transfer keluar', tone: 'info' },
		transfer_in: { label: 'Transfer masuk', tone: 'info' },
		adjustment: { label: 'Penyesuaian', tone: 'neutral' }
	};
	const entry = map[type] ?? { label: type, tone: 'neutral' as const };
	return entry;
}

async function widget<T>(loader: () => Promise<T>, label?: string): Promise<Widget<T>> {
	try {
		return { status: 'ok', data: await loader() };
	} catch (error) {
		console.error(`Gagal memuat widget dashboard${label ? `: ${label}` : ''}`, error);
		return { status: 'error', label };
	}
}

async function loadAssetCards(scope: Scope): Promise<SummaryCardData[]> {
	const rows = await db
		.select({ status: assets.status, value: sql<number>`count(*)::int` })
		.from(assets)
		.innerJoin(locations, eq(assets.locationId, locations.id))
		.where(outletCondition(scope))
		.groupBy(assets.status);

	const counts: Record<string, number> = {};
	for (const row of rows) counts[row.status] = row.value;
	const total = rows.reduce((sum, row) => sum + row.value, 0);
	const value = (status: string) => counts[status] ?? 0;

	return [
		{ label: 'Total aset', value: total, href: '/assets' },
		{
			label: 'Digunakan',
			value: value('in_use'),
			href: toHref('/assets?status=in_use'),
			tone: 'info'
		},
		{
			label: 'Rusak',
			value: value('damaged'),
			href: toHref('/assets?status=damaged'),
			tone: 'danger'
		},
		{
			label: 'Under maintenance',
			value: value('under_maintenance'),
			href: toHref('/assets?status=under_maintenance'),
			tone: 'warning'
		},
		{
			label: 'Dipinjam',
			value: value('on_loan'),
			href: toHref('/assets?status=on_loan'),
			tone: 'warning'
		},
		{ label: 'Disposed', value: value('disposed'), href: toHref('/assets?status=disposed') }
	];
}

type InventoryOverview = {
	cards: SummaryCardData[];
	lowStock: number;
	outOfStock: number;
};

async function loadInventoryOverview(scope: Scope): Promise<InventoryOverview> {
	let itemTypes: number;

	if (scope.allOutlets) {
		const [row] = await db
			.select({ value: sql<number>`count(*)::int` })
			.from(inventoryItems)
			.where(eq(inventoryItems.isActive, true));
		itemTypes = row.value;
	} else {
		const [row] = await db
			.select({ value: sql<number>`count(distinct ${stockBalances.itemId})::int` })
			.from(stockBalances)
			.innerJoin(locations, eq(stockBalances.locationId, locations.id))
			.where(outletCondition(scope));
		itemTypes = row.value;
	}

	const [aggregate] = await db
		.select({
			available: sql<number>`coalesce(sum(${stockBalances.qty}), 0)::int`,
			lowStock: sql<number>`count(*) filter (where ${stockBalances.minStock} is not null and ${stockBalances.qty} > 0 and ${stockBalances.qty} <= ${stockBalances.minStock})::int`,
			outOfStock: sql<number>`count(*) filter (where ${stockBalances.qty} = 0)::int`
		})
		.from(stockBalances)
		.innerJoin(locations, eq(stockBalances.locationId, locations.id))
		.where(outletCondition(scope));

	return {
		cards: [
			{ label: 'Jenis item', value: itemTypes, href: '/inventory' },
			{ label: 'Stok tersedia', value: aggregate.available, href: '/inventory' },
			{
				label: 'Stok minimum',
				value: aggregate.lowStock,
				href: toHref('/inventory?filter=low'),
				tone: 'warning'
			},
			{
				label: 'Stok habis',
				value: aggregate.outOfStock,
				href: toHref('/inventory?filter=out'),
				tone: 'danger'
			}
		],
		lowStock: aggregate.lowStock,
		outOfStock: aggregate.outOfStock
	};
}

async function countOverdueLoans(scope: Scope, today: string): Promise<number> {
	const [row] = await db
		.select({ value: sql<number>`count(*)::int` })
		.from(assetLoans)
		.innerJoin(assets, eq(assetLoans.assetId, assets.id))
		.innerJoin(locations, eq(assets.locationId, locations.id))
		.where(
			and(
				eq(assetLoans.status, 'borrowed'),
				lt(assetLoans.expectedReturnDate, today),
				outletCondition(scope)
			)
		);
	return row.value;
}

async function loadOverdueLoans(
	scope: Scope,
	today: string,
	limit = 5
): Promise<{ count: number; rows: ActivityRowData[] }> {
	const count = await countOverdueLoans(scope, today);
	const rows = await db
		.select({
			id: assetLoans.id,
			assetCode: assets.assetCode,
			assetName: assets.name,
			borrowerName: assetLoans.borrowerName,
			expectedReturnDate: assetLoans.expectedReturnDate
		})
		.from(assetLoans)
		.innerJoin(assets, eq(assetLoans.assetId, assets.id))
		.innerJoin(locations, eq(assets.locationId, locations.id))
		.where(
			and(
				eq(assetLoans.status, 'borrowed'),
				lt(assetLoans.expectedReturnDate, today),
				outletCondition(scope)
			)
		)
		.orderBy(asc(assetLoans.expectedReturnDate))
		.limit(limit);

	return {
		count,
		rows: rows.map((row) => ({
			id: `loan-${row.id}`,
			title: `${row.assetCode} · ${row.assetName}`,
			subtitle: `Peminjam: ${row.borrowerName}`,
			meta: `Jatuh tempo ${formatDate(row.expectedReturnDate) ?? '—'}`,
			badge: { label: 'Terlambat', tone: 'danger' },
			href: assetHref(row.assetCode)
		}))
	};
}

async function fetchRequests(
	scope: Scope,
	options: { statuses?: RequestStatus[]; order: 'asc' | 'desc'; limit: number }
): Promise<{ count: number; rows: ActivityRowData[] }> {
	const condition = and(
		options.statuses ? inArray(itemRequests.status, options.statuses) : undefined,
		scope.allOutlets ? undefined : eq(itemRequests.outletId, scope.outletId!)
	);
	const [countRow] = await db
		.select({ value: sql<number>`count(*)::int` })
		.from(itemRequests)
		.where(condition);

	const rows = await db
		.select({
			id: itemRequests.id,
			requestNumber: itemRequests.requestNumber,
			status: itemRequests.status,
			createdAt: itemRequests.createdAt,
			outletName: outlets.name
		})
		.from(itemRequests)
		.innerJoin(outlets, eq(itemRequests.outletId, outlets.id))
		.where(condition)
		.orderBy(options.order === 'asc' ? asc(itemRequests.createdAt) : desc(itemRequests.createdAt))
		.limit(options.limit);

	return {
		count: countRow.value,
		rows: rows.map((row) => ({
			id: `request-${row.id}`,
			title: row.requestNumber,
			subtitle: row.outletName,
			meta: formatDateTime(row.createdAt),
			badge: requestBadge(row.status),
			href: requestHref(row.requestNumber)
		}))
	};
}

async function fetchMaintenance(
	scope: Scope,
	options: { activeOnly: boolean; order: 'asc' | 'desc'; limit: number }
): Promise<{ count: number; rows: ActivityRowData[] }> {
	const condition = and(
		options.activeOnly ? inArray(assetMaintenances.status, [...ACTIVE_MAINTENANCE]) : undefined,
		outletCondition(scope)
	);
	const [countRow] = await db
		.select({ value: sql<number>`count(*)::int` })
		.from(assetMaintenances)
		.innerJoin(locations, eq(assetMaintenances.locationId, locations.id))
		.where(condition);

	const rows = await db
		.select({
			id: assetMaintenances.id,
			status: assetMaintenances.status,
			problemDescription: assetMaintenances.problemDescription,
			createdAt: assetMaintenances.createdAt,
			assetCode: assets.assetCode,
			assetName: assets.name
		})
		.from(assetMaintenances)
		.innerJoin(assets, eq(assetMaintenances.assetId, assets.id))
		.innerJoin(locations, eq(assetMaintenances.locationId, locations.id))
		.where(condition)
		.orderBy(
			options.order === 'asc' ? asc(assetMaintenances.createdAt) : desc(assetMaintenances.createdAt)
		)
		.limit(options.limit);

	return {
		count: countRow.value,
		rows: rows.map((row) => ({
			id: `maintenance-${row.id}`,
			title: `${row.assetCode} · ${row.assetName}`,
			subtitle: row.problemDescription,
			meta: formatDateTime(row.createdAt),
			badge: maintenanceBadge(row.status),
			href: assetHref(row.assetCode)
		}))
	};
}

async function loadRecentMutations(scope: Scope, limit = 5): Promise<ActivityRowData[]> {
	const rows = await db
		.select({
			id: assetMovements.id,
			movementDate: assetMovements.movementDate,
			fromLocationName: assetMovements.fromLocationName,
			toLocationName: assetMovements.toLocationName,
			assetCode: assets.assetCode,
			assetName: assets.name
		})
		.from(assetMovements)
		.innerJoin(assets, eq(assetMovements.assetId, assets.id))
		.innerJoin(locations, eq(assets.locationId, locations.id))
		.where(and(eq(assetMovements.movementType, 'mutation'), outletCondition(scope)))
		.orderBy(desc(assetMovements.movementDate))
		.limit(limit);

	return rows.map((row) => ({
		id: `movement-${row.id}`,
		title: `${row.assetCode} · ${row.assetName}`,
		subtitle: `${row.fromLocationName ?? '—'} → ${row.toLocationName ?? '—'}`,
		meta: formatDateTime(row.movementDate),
		badge: { label: 'Mutasi', tone: 'info' },
		href: assetHref(row.assetCode)
	}));
}

async function loadRecentStock(scope: Scope, limit = 5): Promise<ActivityRowData[]> {
	const rows = await db
		.select({
			id: stockTransactions.id,
			signedQty: stockTransactions.signedQty,
			transactionType: stockTransactions.transactionType,
			createdAt: stockTransactions.createdAt,
			itemName: inventoryItems.name,
			locationName: locations.name
		})
		.from(stockTransactions)
		.innerJoin(inventoryItems, eq(stockTransactions.itemId, inventoryItems.id))
		.innerJoin(locations, eq(stockTransactions.locationId, locations.id))
		.where(outletCondition(scope))
		.orderBy(desc(stockTransactions.createdAt))
		.limit(limit);

	return rows.map((row) => ({
		id: `stock-${row.id}`,
		title: row.itemName,
		subtitle: row.locationName,
		meta: `${row.signedQty > 0 ? '+' : ''}${row.signedQty} · ${formatDateTime(row.createdAt) ?? ''}`,
		badge: stockBadge(row.transactionType),
		href: inventoryHref(row.itemName)
	}));
}

async function loadOutletRequestCards(scope: Scope): Promise<SummaryCardData[]> {
	const condition = scope.allOutlets ? undefined : eq(itemRequests.outletId, scope.outletId!);
	const rows = await db
		.select({ status: itemRequests.status, value: sql<number>`count(*)::int` })
		.from(itemRequests)
		.where(condition)
		.groupBy(itemRequests.status);
	const counts = new Map(rows.map((row) => [row.status, row.value]));

	return [
		{
			label: 'Menunggu',
			value: counts.get('submitted') ?? 0,
			href: toHref('/requests?status=submitted'),
			tone: 'warning'
		},
		{
			label: 'Diproses',
			value: counts.get('processing') ?? 0,
			href: toHref('/requests?status=processing'),
			tone: 'info'
		},
		{
			label: 'Terpenuhi sebagian',
			value: counts.get('partially_fulfilled') ?? 0,
			href: toHref('/requests?status=partially_fulfilled'),
			tone: 'info'
		},
		{
			label: 'Selesai',
			value: counts.get('fulfilled') ?? 0,
			href: toHref('/requests?status=fulfilled'),
			tone: 'success'
		}
	];
}

function listWidget(
	loader: () => Promise<ActivityRowData[]>,
	options: {
		title: string;
		emptyTitle: string;
		emptyDescription?: string;
		viewHref?: ResolvedPathname;
		viewLabel?: string;
	}
): Promise<Widget<DashboardListData>> {
	return widget(async () => {
		const rows = await loader();
		return {
			title: options.title,
			emptyTitle: options.emptyTitle,
			emptyDescription: options.emptyDescription,
			viewHref: options.viewHref,
			viewLabel: options.viewLabel,
			rows
		};
	}, options.title);
}

function buildWarnings(
	role: AuthUser['role'],
	inventory: InventoryOverview,
	overdueCount: number
): WarningItem[] {
	const warnings: WarningItem[] = [];

	if (inventory.lowStock > 0) {
		warnings.push({
			title: 'Stok minimum',
			description: `${inventory.lowStock} posisi stok berada pada atau di bawah batas minimum.`,
			href: toHref('/inventory?filter=low'),
			tone: 'warning'
		});
	}

	if (inventory.outOfStock > 0) {
		warnings.push({
			title: 'Stok habis',
			description: `${inventory.outOfStock} posisi stok kosong.`,
			href: toHref('/inventory?filter=out'),
			tone: 'warning'
		});
	}

	if (role !== 'outlet' && overdueCount > 0) {
		warnings.push({
			title: 'Peminjaman terlambat',
			description: `${overdueCount} peminjaman melewati tanggal kembali.`,
			href: toHref('/assets?status=on_loan'),
			tone: 'danger'
		});
	}

	return warnings;
}

function quickActionsFor(role: AuthUser['role']): QuickAction[] {
	if (role === 'outlet') {
		return [
			{ label: 'Buat request', href: '/requests', variant: 'primary' },
			{ label: 'Lapor kerusakan', href: toHref('/assets?status=damaged') }
		];
	}

	if (role === 'support') {
		return [
			{ label: 'Master data', href: '/admin/master-data', variant: 'primary' },
			{ label: 'Audit log', href: '/admin/audit' }
		];
	}

	return [
		{ label: 'Master data', href: '/admin/master-data', variant: 'primary' },
		{ label: 'Kelola pengguna', href: '/admin/users' }
	];
}

export async function getDashboard(actor: AuthUser): Promise<DashboardData> {
	const scope = scopeToUser(actor);
	const today = jakartaToday();
	const scopeLabel =
		actor.role === 'outlet' ? `Outlet ${actor.outletName ?? 'Anda'}` : 'Seluruh lokasi';

	const inventory = widget(() => loadInventoryOverview(scope));

	if (actor.role === 'admin') {
		const [assetWidget, inventoryWidget, overdue, requests, maintenance, mutations, stock] =
			await Promise.all([
				widget(() => loadAssetCards(scope)),
				inventory,
				widget(() => loadOverdueLoans(scope, today, 5)),
				listWidget(() => fetchRequests(scope, { order: 'desc', limit: 5 }).then((r) => r.rows), {
					title: 'Request terbaru',
					emptyTitle: 'Belum ada request',
					emptyDescription: 'Request dari outlet akan tampil di sini.',
					viewHref: '/requests',
					viewLabel: 'Lihat semua request'
				}),
				listWidget(
					() =>
						fetchMaintenance(scope, { activeOnly: false, order: 'desc', limit: 5 }).then(
							(r) => r.rows
						),
					{
						title: 'Maintenance terbaru',
						emptyTitle: 'Belum ada maintenance',
						viewHref: toHref('/assets?status=under_maintenance'),
						viewLabel: 'Lihat aset maintenance'
					}
				),
				listWidget(() => loadRecentMutations(scope, 5), {
					title: 'Mutasi terbaru',
					emptyTitle: 'Belum ada mutasi',
					viewHref: '/assets',
					viewLabel: 'Lihat aset'
				}),
				listWidget(() => loadRecentStock(scope, 5), {
					title: 'Transaksi stok terbaru',
					emptyTitle: 'Belum ada transaksi stok',
					viewHref: '/inventory',
					viewLabel: 'Lihat inventory'
				})
			]);

		const warnings: Widget<WarningItem[]> =
			inventoryWidget.status === 'ok' && overdue.status === 'ok'
				? {
						status: 'ok',
						data: buildWarnings(actor.role, inventoryWidget.data, overdue.data.count)
					}
				: { status: 'error', label: 'Peringatan' };

		const overdueList: Widget<DashboardListData> =
			overdue.status === 'ok'
				? {
						status: 'ok',
						data: {
							title: 'Peminjaman terlambat',
							emptyTitle: 'Tidak ada peminjaman terlambat',
							viewHref: toHref('/assets?status=on_loan'),
							viewLabel: 'Lihat aset dipinjam',
							rows: overdue.data.rows
						}
					}
				: { status: 'error', label: 'Peminjaman terlambat' };

		return {
			role: actor.role,
			scopeLabel,
			greeting: greeting(actor.fullName),
			warnings,
			quickActions: quickActionsFor(actor.role),
			sections: [
				{
					title: 'Ringkasan aset',
					description: 'Status aset di seluruh lokasi.',
					cards:
						assetWidget.status === 'ok'
							? { status: 'ok', data: assetWidget.data }
							: { status: 'error' }
				},
				{
					title: 'Ringkasan inventory',
					description: 'Stok item per lokasi.',
					cards:
						inventoryWidget.status === 'ok'
							? { status: 'ok', data: inventoryWidget.data.cards }
							: { status: 'error' }
				},
				{
					title: 'Operasional',
					description: 'Antrean dan aktivitas terbaru.',
					lists: [requests, maintenance, overdueList, mutations, stock]
				}
			]
		};
	}

	if (actor.role === 'support') {
		const [inventoryWidget, overdue, requests, maintenance, stock] = await Promise.all([
			inventory,
			widget(() => loadOverdueLoans(scope, today, 5)),
			widget(() =>
				fetchRequests(scope, { statuses: [...PENDING_REQUESTS], order: 'asc', limit: 5 })
			),
			widget(() => fetchMaintenance(scope, { activeOnly: true, order: 'asc', limit: 5 })),
			listWidget(() => loadRecentStock(scope, 5), {
				title: 'Aktivitas stok terbaru',
				emptyTitle: 'Belum ada aktivitas stok',
				viewHref: '/inventory',
				viewLabel: 'Lihat inventory'
			})
		]);

		const cards: Widget<SummaryCardData[]> =
			inventoryWidget.status === 'ok' &&
			overdue.status === 'ok' &&
			requests.status === 'ok' &&
			maintenance.status === 'ok'
				? {
						status: 'ok',
						data: [
							{
								label: 'Antrean maintenance',
								value: maintenance.data.count,
								href: toHref('/assets?status=under_maintenance'),
								tone: 'warning'
							},
							{
								label: 'Antrean request',
								value: requests.data.count,
								href: toHref('/requests?status=submitted'),
								tone: 'warning'
							},
							{
								label: 'Peminjaman terlambat',
								value: overdue.data.count,
								href: toHref('/assets?status=on_loan'),
								tone: 'danger'
							},
							{
								label: 'Stok minimum',
								value: inventoryWidget.data.lowStock,
								href: toHref('/inventory?filter=low'),
								tone: 'warning'
							}
						]
					}
				: { status: 'error', label: 'Ringkasan antrean' };

		const warnings: Widget<WarningItem[]> =
			inventoryWidget.status === 'ok' && overdue.status === 'ok'
				? {
						status: 'ok',
						data: buildWarnings(actor.role, inventoryWidget.data, overdue.data.count)
					}
				: { status: 'error' };

		const requestList: Widget<DashboardListData> =
			requests.status === 'ok'
				? {
						status: 'ok',
						data: {
							title: 'Antrean request',
							description: 'Request yang menunggu diproses.',
							emptyTitle: 'Tidak ada request menunggu',
							viewHref: '/requests',
							viewLabel: 'Lihat semua request',
							rows: requests.data.rows
						}
					}
				: { status: 'error', label: 'Antrean request' };

		const maintenanceList: Widget<DashboardListData> =
			maintenance.status === 'ok'
				? {
						status: 'ok',
						data: {
							title: 'Antrean maintenance',
							description: 'Perbaikan yang belum selesai.',
							emptyTitle: 'Tidak ada maintenance aktif',
							viewHref: toHref('/assets?status=under_maintenance'),
							viewLabel: 'Lihat aset maintenance',
							rows: maintenance.data.rows
						}
					}
				: { status: 'error', label: 'Antrean maintenance' };

		const overdueList: Widget<DashboardListData> =
			overdue.status === 'ok'
				? {
						status: 'ok',
						data: {
							title: 'Peminjaman terlambat',
							description: 'Melewati tanggal kembali.',
							emptyTitle: 'Tidak ada peminjaman terlambat',
							viewHref: toHref('/assets?status=on_loan'),
							viewLabel: 'Lihat aset dipinjam',
							rows: overdue.data.rows
						}
					}
				: { status: 'error', label: 'Peminjaman terlambat' };

		return {
			role: actor.role,
			scopeLabel,
			greeting: greeting(actor.fullName),
			warnings,
			quickActions: quickActionsFor(actor.role),
			sections: [
				{
					title: 'Antrean pekerjaan',
					description: 'Pekerjaan operasional yang perlu ditangani.',
					cards,
					lists: [maintenanceList, requestList, overdueList]
				},
				{ title: 'Aktivitas terbaru', lists: [stock] }
			]
		};
	}

	const [assetWidget, inventoryWidget, requestCards, recentRequests] = await Promise.all([
		widget(() => loadAssetCards(scope)),
		inventory,
		widget(() => loadOutletRequestCards(scope)),
		listWidget(() => fetchRequests(scope, { order: 'desc', limit: 5 }).then((r) => r.rows), {
			title: 'Request terbaru',
			emptyTitle: 'Belum ada request',
			emptyDescription: 'Request yang Anda buat akan tampil di sini.',
			viewHref: '/requests',
			viewLabel: 'Lihat semua request'
		})
	]);

	const warnings: Widget<WarningItem[]> =
		inventoryWidget.status === 'ok'
			? {
					status: 'ok',
					data: buildWarnings(actor.role, inventoryWidget.data, 0)
				}
			: { status: 'error', label: 'Peringatan' };

	return {
		role: actor.role,
		scopeLabel,
		greeting: greeting(actor.fullName),
		warnings,
		quickActions: quickActionsFor(actor.role),
		sections: [
			{
				title: 'Ringkasan aset',
				description: `Aset milik ${scopeLabel.toLowerCase()}.`,
				cards:
					assetWidget.status === 'ok'
						? { status: 'ok', data: assetWidget.data }
						: { status: 'error' }
			},
			{
				title: 'Ringkasan inventory',
				description: 'Stok item di outlet Anda.',
				cards:
					inventoryWidget.status === 'ok'
						? { status: 'ok', data: inventoryWidget.data.cards }
						: { status: 'error' }
			},
			{
				title: 'Request outlet',
				description: 'Ringkasan dan request terbaru outlet Anda.',
				cards:
					requestCards.status === 'ok'
						? { status: 'ok', data: requestCards.data }
						: { status: 'error' },
				lists: [recentRequests]
			}
		]
	};
}
