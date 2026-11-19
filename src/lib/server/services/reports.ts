import { and, asc, desc, eq, gte, inArray, lte, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { assertCan } from '#lib/server/auth/permissions.js';
import type { AuthUser } from '#lib/server/auth/session.js';
import { db } from '#lib/server/db/index.js';
import {
	assetCategories,
	assetConditions,
	assetLoans,
	assetMaintenances,
	assetMovements,
	assetStatusEnum,
	assets,
	disposals,
	inventoryItems,
	itemRequests,
	loanStatusEnum,
	locations,
	maintenanceStatusEnum,
	opnameStatusEnum,
	outlets,
	requestLines,
	requestStatusEnum,
	stockBalances,
	stockDocuments,
	stockOpnames,
	stockTransactions,
	units,
	users
} from '#lib/server/db/schema/index.js';
import { ASSET_STATUS_LABEL } from '#lib/server/domain/transitions.js';
import { DomainError } from '#lib/server/errors.js';

export type ReportCategory = 'Aset' | 'Inventory' | 'Operasional';

export type ReportColumn = {
	key: string;
	label: string;
	align?: 'left' | 'right';
	internal?: boolean;
};

export type ReportFilterField =
	'from' | 'to' | 'location' | 'category' | 'status' | 'item' | 'outlet';

export type ReportStatusOption = { value: string; label: string };

export type ReportDefinition = {
	key: string;
	title: string;
	description: string;
	category: ReportCategory;
	advanced?: boolean;
	columns: ReportColumn[];
	filters: ReportFilterField[];
	statusOptions?: ReportStatusOption[];
};

export type ReportFilters = {
	from?: string;
	to?: string;
	locationId?: number | null;
	categoryId?: number | null;
	itemId?: number | null;
	outletId?: number | null;
	status?: string;
};

export type ReportFilterOptions = {
	locations: { id: number; label: string }[];
	categories: { id: number; label: string }[];
	items: { id: number; label: string }[];
	outlets: { id: number; label: string }[];
	statuses: ReportStatusOption[];
};

export type ReportRow = Record<string, string | number | null>;

export type ReportResult = {
	definition: ReportDefinition;
	columns: ReportColumn[];
	rows: ReportRow[];
	total: number;
	page: number;
	pageSize: number;
	filters: ReportFilters;
	summary: string[];
	options: ReportFilterOptions;
};

const assetStatusOptions: ReportStatusOption[] = assetStatusEnum.enumValues.map((value) => ({
	value,
	label: ASSET_STATUS_LABEL[value]
}));
const loanStatusOptions: ReportStatusOption[] = loanStatusEnum.enumValues.map((value) => ({
	value,
	label: value === 'borrowed' ? 'Dipinjam' : value === 'returned' ? 'Dikembalikan' : 'Dibatalkan'
}));
const maintenanceStatusLabels: Record<string, string> = {
	reported: 'Dilaporkan',
	in_progress: 'Dikerjakan',
	waiting_parts: 'Menunggu Sparepart',
	completed: 'Selesai',
	cancelled: 'Dibatalkan'
};
const maintenanceStatusOptions: ReportStatusOption[] = maintenanceStatusEnum.enumValues.map(
	(value) => ({ value, label: maintenanceStatusLabels[value] ?? value })
);
const requestStatusLabels: Record<string, string> = {
	submitted: 'Menunggu',
	processing: 'Diproses',
	partially_fulfilled: 'Terpenuhi Sebagian',
	fulfilled: 'Selesai',
	rejected: 'Ditolak',
	cancelled: 'Dibatalkan'
};
const requestStatusOptions: ReportStatusOption[] = requestStatusEnum.enumValues.map((value) => ({
	value,
	label: requestStatusLabels[value] ?? value
}));
const opnameStatusOptions: ReportStatusOption[] = opnameStatusEnum.enumValues.map((value) => ({
	value,
	label:
		value === 'draft'
			? 'Draft'
			: value === 'in_progress'
				? 'Berjalan'
				: value === 'completed'
					? 'Selesai'
					: 'Dibatalkan'
}));

const REPORT_DEFINITIONS: ReportDefinition[] = [
	{
		key: 'asset-list',
		title: 'Daftar Aset',
		description: 'Seluruh aset dengan identitas, lokasi, status, dan kondisi.',
		category: 'Aset',
		columns: [
			{ key: 'code', label: 'Asset Code' },
			{ key: 'name', label: 'Nama' },
			{ key: 'category', label: 'Kategori' },
			{ key: 'location', label: 'Lokasi' },
			{ key: 'outlet', label: 'Outlet' },
			{ key: 'status', label: 'Status' },
			{ key: 'condition', label: 'Kondisi' }
		],
		filters: ['location', 'category', 'status'],
		statusOptions: assetStatusOptions
	},
	{
		key: 'asset-by-category',
		title: 'Aset per Kategori',
		description: 'Jumlah aset dikelompokkan per kategori.',
		category: 'Aset',
		columns: [
			{ key: 'category', label: 'Kategori' },
			{ key: 'total', label: 'Jumlah', align: 'right' }
		],
		filters: ['category', 'location']
	},
	{
		key: 'asset-by-location',
		title: 'Aset per Lokasi',
		description: 'Jumlah aset dikelompokkan per lokasi dan outlet.',
		category: 'Aset',
		columns: [
			{ key: 'location', label: 'Lokasi' },
			{ key: 'outlet', label: 'Outlet' },
			{ key: 'total', label: 'Jumlah', align: 'right' }
		],
		filters: ['location']
	},
	{
		key: 'asset-by-status',
		title: 'Aset per Status',
		description: 'Jumlah aset berdasarkan status sistem.',
		category: 'Aset',
		columns: [
			{ key: 'status', label: 'Status' },
			{ key: 'total', label: 'Jumlah', align: 'right' }
		],
		filters: []
	},
	{
		key: 'asset-by-condition',
		title: 'Aset per Kondisi',
		description: 'Jumlah aset berdasarkan kondisi fisik.',
		category: 'Aset',
		columns: [
			{ key: 'condition', label: 'Kondisi' },
			{ key: 'total', label: 'Jumlah', align: 'right' }
		],
		filters: []
	},
	{
		key: 'asset-assignment-history',
		title: 'Riwayat Penempatan Aset',
		description: 'Penempatan aset ke lokasi atau karyawan.',
		category: 'Aset',
		columns: [
			{ key: 'date', label: 'Tanggal' },
			{ key: 'number', label: 'Nomor' },
			{ key: 'asset', label: 'Aset' },
			{ key: 'from', label: 'Dari' },
			{ key: 'to', label: 'Ke' },
			{ key: 'employee', label: 'Pemegang' },
			{ key: 'performedBy', label: 'Oleh' }
		],
		filters: ['from', 'to', 'location']
	},
	{
		key: 'asset-mutation-history',
		title: 'Riwayat Mutasi Aset',
		description: 'Perpindahan aset antar lokasi.',
		category: 'Aset',
		columns: [
			{ key: 'date', label: 'Tanggal' },
			{ key: 'number', label: 'Nomor' },
			{ key: 'asset', label: 'Aset' },
			{ key: 'from', label: 'Dari' },
			{ key: 'to', label: 'Ke' },
			{ key: 'receivedBy', label: 'Penerima' },
			{ key: 'performedBy', label: 'Oleh' }
		],
		filters: ['from', 'to', 'location']
	},
	{
		key: 'asset-maintenance-history',
		title: 'Riwayat Maintenance Aset',
		description: 'Laporan kerusakan dan perbaikan aset.',
		category: 'Aset',
		columns: [
			{ key: 'date', label: 'Dilaporkan' },
			{ key: 'number', label: 'Nomor' },
			{ key: 'asset', label: 'Aset' },
			{ key: 'status', label: 'Status' },
			{ key: 'problem', label: 'Masalah' },
			{ key: 'technician', label: 'Teknisi' },
			{ key: 'cost', label: 'Biaya', align: 'right', internal: true }
		],
		filters: ['from', 'to', 'location', 'status'],
		statusOptions: maintenanceStatusOptions
	},
	{
		key: 'asset-disposal',
		title: 'Laporan Disposal Aset',
		description: 'Aset yang dihapuskan beserta alasan dan status.',
		category: 'Aset',
		advanced: true,
		columns: [
			{ key: 'date', label: 'Tanggal' },
			{ key: 'number', label: 'Nomor' },
			{ key: 'asset', label: 'Aset' },
			{ key: 'reason', label: 'Alasan' },
			{ key: 'status', label: 'Status' }
		],
		filters: ['from', 'to', 'location']
	},
	{
		key: 'inventory-current-stock',
		title: 'Stok Saat Ini',
		description: 'Saldo stok per item dan lokasi.',
		category: 'Inventory',
		columns: [
			{ key: 'item', label: 'Item' },
			{ key: 'code', label: 'Kode' },
			{ key: 'location', label: 'Lokasi' },
			{ key: 'qty', label: 'Qty', align: 'right' },
			{ key: 'unit', label: 'Unit' },
			{ key: 'minStock', label: 'Minimum', align: 'right' },
			{ key: 'status', label: 'Status' }
		],
		filters: ['location', 'item']
	},
	{
		key: 'stock-by-location',
		title: 'Stok per Lokasi',
		description: 'Jumlah jenis item dan total stok per lokasi.',
		category: 'Inventory',
		columns: [
			{ key: 'location', label: 'Lokasi' },
			{ key: 'outlet', label: 'Outlet' },
			{ key: 'itemTypes', label: 'Jenis Item', align: 'right' },
			{ key: 'totalQty', label: 'Total Qty', align: 'right' }
		],
		filters: ['location']
	},
	{
		key: 'stock-in',
		title: 'Laporan Stock In',
		description: 'Transaksi stok masuk, termasuk penerimaan.',
		category: 'Inventory',
		columns: [
			{ key: 'date', label: 'Tanggal' },
			{ key: 'document', label: 'Dokumen' },
			{ key: 'item', label: 'Item' },
			{ key: 'location', label: 'Lokasi' },
			{ key: 'qty', label: 'Qty', align: 'right' },
			{ key: 'performedBy', label: 'Oleh' }
		],
		filters: ['from', 'to', 'location', 'item']
	},
	{
		key: 'stock-out',
		title: 'Laporan Stock Out',
		description: 'Transaksi stok keluar untuk operasional.',
		category: 'Inventory',
		columns: [
			{ key: 'date', label: 'Tanggal' },
			{ key: 'document', label: 'Dokumen' },
			{ key: 'item', label: 'Item' },
			{ key: 'location', label: 'Lokasi' },
			{ key: 'qty', label: 'Qty', align: 'right' },
			{ key: 'performedBy', label: 'Oleh' }
		],
		filters: ['from', 'to', 'location', 'item']
	},
	{
		key: 'stock-transfer',
		title: 'Laporan Transfer Stok',
		description: 'Perpindahan stok antar lokasi.',
		category: 'Inventory',
		columns: [
			{ key: 'date', label: 'Tanggal' },
			{ key: 'document', label: 'Dokumen' },
			{ key: 'item', label: 'Item' },
			{ key: 'type', label: 'Arah' },
			{ key: 'location', label: 'Lokasi' },
			{ key: 'qty', label: 'Qty', align: 'right' }
		],
		filters: ['from', 'to', 'location', 'item']
	},
	{
		key: 'stock-adjustment',
		title: 'Laporan Penyesuaian Stok',
		description: 'Transaksi penyesuaian stok.',
		category: 'Inventory',
		columns: [
			{ key: 'date', label: 'Tanggal' },
			{ key: 'document', label: 'Dokumen' },
			{ key: 'item', label: 'Item' },
			{ key: 'location', label: 'Lokasi' },
			{ key: 'qty', label: 'Qty', align: 'right' },
			{ key: 'performedBy', label: 'Oleh' }
		],
		filters: ['from', 'to', 'location', 'item']
	},
	{
		key: 'low-stock',
		title: 'Laporan Stok Minimum',
		description: 'Item pada atau di bawah minimum stok per lokasi.',
		category: 'Inventory',
		columns: [
			{ key: 'item', label: 'Item' },
			{ key: 'location', label: 'Lokasi' },
			{ key: 'qty', label: 'Qty', align: 'right' },
			{ key: 'minStock', label: 'Minimum', align: 'right' },
			{ key: 'status', label: 'Status' }
		],
		filters: ['location', 'item']
	},
	{
		key: 'inventory-transaction-history',
		title: 'Riwayat Transaksi Inventory',
		description: 'Seluruh transaksi stok lintas jenis.',
		category: 'Inventory',
		columns: [
			{ key: 'date', label: 'Tanggal' },
			{ key: 'document', label: 'Dokumen' },
			{ key: 'type', label: 'Jenis' },
			{ key: 'item', label: 'Item' },
			{ key: 'location', label: 'Lokasi' },
			{ key: 'qty', label: 'Qty', align: 'right' }
		],
		filters: ['from', 'to', 'location', 'item']
	},
	{
		key: 'borrowing',
		title: 'Laporan Peminjaman',
		description: 'Seluruh peminjaman aset dan statusnya.',
		category: 'Operasional',
		columns: [
			{ key: 'number', label: 'Nomor' },
			{ key: 'asset', label: 'Aset' },
			{ key: 'borrower', label: 'Peminjam' },
			{ key: 'borrowDate', label: 'Pinjam' },
			{ key: 'expectedDate', label: 'Rencana Kembali' },
			{ key: 'actualDate', label: 'Aktual Kembali' },
			{ key: 'status', label: 'Status' }
		],
		filters: ['from', 'to', 'location', 'status'],
		statusOptions: loanStatusOptions
	},
	{
		key: 'overdue-loan',
		title: 'Peminjaman Terlambat',
		description: 'Peminjaman yang melewati tanggal kembali.',
		category: 'Operasional',
		columns: [
			{ key: 'number', label: 'Nomor' },
			{ key: 'asset', label: 'Aset' },
			{ key: 'borrower', label: 'Peminjam' },
			{ key: 'expectedDate', label: 'Jatuh Tempo' },
			{ key: 'daysLate', label: 'Hari Terlambat', align: 'right' },
			{ key: 'location', label: 'Lokasi' }
		],
		filters: ['from', 'to', 'location']
	},
	{
		key: 'maintenance',
		title: 'Laporan Maintenance',
		description: 'Laporan kerusakan dan proses perbaikan.',
		category: 'Operasional',
		columns: [
			{ key: 'number', label: 'Nomor' },
			{ key: 'asset', label: 'Aset' },
			{ key: 'status', label: 'Status' },
			{ key: 'problem', label: 'Masalah' },
			{ key: 'technician', label: 'Teknisi' },
			{ key: 'reportedAt', label: 'Dilaporkan' },
			{ key: 'completedAt', label: 'Selesai' },
			{ key: 'cost', label: 'Biaya', align: 'right', internal: true }
		],
		filters: ['from', 'to', 'location', 'status'],
		statusOptions: maintenanceStatusOptions
	},
	{
		key: 'stock-opname',
		title: 'Laporan Stock Opname',
		description: 'Sesi stock opname per lokasi.',
		category: 'Operasional',
		advanced: true,
		columns: [
			{ key: 'number', label: 'Nomor' },
			{ key: 'location', label: 'Lokasi' },
			{ key: 'itemType', label: 'Jenis Item' },
			{ key: 'status', label: 'Status' },
			{ key: 'startedAt', label: 'Mulai' },
			{ key: 'completedAt', label: 'Selesai' }
		],
		filters: ['from', 'to', 'location', 'status'],
		statusOptions: opnameStatusOptions
	},
	{
		key: 'outlet-request',
		title: 'Laporan Request Outlet',
		description: 'Request item inventory dari outlet.',
		category: 'Operasional',
		columns: [
			{ key: 'number', label: 'Nomor' },
			{ key: 'outlet', label: 'Outlet' },
			{ key: 'requestedBy', label: 'Diminta Oleh' },
			{ key: 'createdAt', label: 'Tanggal' },
			{ key: 'requestedQty', label: 'Diminta', align: 'right' },
			{ key: 'fulfilledQty', label: 'Terpenuhi', align: 'right' },
			{ key: 'status', label: 'Status' }
		],
		filters: ['from', 'to', 'status', 'outlet'],
		statusOptions: requestStatusOptions
	}
];

const DEFINITION_MAP = new Map(
	REPORT_DEFINITIONS.map((definition) => [definition.key, definition])
);

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('id-ID', {
	dateStyle: 'medium',
	timeStyle: 'short',
	timeZone: 'Asia/Jakarta'
});
const DATE_FORMAT = new Intl.DateTimeFormat('id-ID', {
	dateStyle: 'medium',
	timeZone: 'Asia/Jakarta'
});

function formatDateTime(value: Date | null | undefined): string {
	return value ? DATE_TIME_FORMAT.format(value) : '—';
}

function formatDate(value: Date | string | null | undefined): string {
	if (!value) return '—';
	const date = value instanceof Date ? value : new Date(`${value}T00:00:00+07:00`);
	return Number.isNaN(date.getTime()) ? String(value) : DATE_FORMAT.format(date);
}

function startOfDay(value: string | undefined): Date | null {
	return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00+07:00`) : null;
}

function endOfDay(value: string | undefined): Date | null {
	return value && /^\d{4}-\d{2}-\d{2}$/.test(value)
		? new Date(`${value}T23:59:59.999+07:00`)
		: null;
}

function outletId(actor: AuthUser): number | null {
	return actor.role === 'outlet' ? actor.outletId : null;
}

function filterNumber(value: string | null): number | null {
	if (!value) return null;
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parseReportFilters(url: URL): ReportFilters {
	const params = url.searchParams;
	const from = params.get('from') ?? '';
	const to = params.get('to') ?? '';
	return {
		from: /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : undefined,
		to: /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : undefined,
		locationId: filterNumber(params.get('location')),
		categoryId: filterNumber(params.get('category')),
		itemId: filterNumber(params.get('item')),
		outletId: filterNumber(params.get('outlet')),
		status: params.get('status') || undefined
	};
}

export function getReportDefinition(key: string, role: string): ReportDefinition {
	const definition = DEFINITION_MAP.get(key);
	if (!definition) throw new DomainError('TIDAK_DITEMUKAN', 'Laporan tidak ditemukan.');
	const columns = definition.columns.filter((column) => !column.internal || role !== 'outlet');
	return { ...definition, columns };
}

export function getReportOverview(actor: AuthUser): {
	category: ReportCategory;
	reports: ReportDefinition[];
}[] {
	assertCan(
		actor,
		'report:read',
		actor.role === 'outlet' ? { outletId: actor.outletId } : undefined
	);
	const categories: ReportCategory[] = ['Aset', 'Inventory', 'Operasional'];
	return categories.map((category) => ({
		category,
		reports: REPORT_DEFINITIONS.filter((definition) => definition.category === category).map(
			(definition) => getReportDefinition(definition.key, actor.role)
		)
	}));
}

export async function getReportFilterOptions(
	actor: AuthUser,
	key: string
): Promise<ReportFilterOptions> {
	const definition = getReportDefinition(key, actor.role);
	assertCan(
		actor,
		'report:read',
		actor.role === 'outlet' ? { outletId: actor.outletId } : undefined
	);
	const scopeOutlet = outletId(actor);

	const [locationRows, categoryRows, itemRows, outletRows] = await Promise.all([
		db
			.select({ id: locations.id, name: locations.name, outletName: outlets.name })
			.from(locations)
			.innerJoin(outlets, eq(locations.outletId, outlets.id))
			.where(
				and(
					eq(locations.isActive, true),
					scopeOutlet ? eq(locations.outletId, scopeOutlet) : undefined
				)
			)
			.orderBy(asc(outlets.name), asc(locations.name)),
		db
			.select({ id: assetCategories.id, name: assetCategories.name })
			.from(assetCategories)
			.where(eq(assetCategories.isActive, true))
			.orderBy(asc(assetCategories.name)),
		db
			.select({
				id: inventoryItems.id,
				itemCode: inventoryItems.itemCode,
				name: inventoryItems.name
			})
			.from(inventoryItems)
			.where(eq(inventoryItems.isActive, true))
			.orderBy(asc(inventoryItems.name)),
		scopeOutlet
			? Promise.resolve([])
			: db
					.select({ id: outlets.id, name: outlets.name })
					.from(outlets)
					.where(eq(outlets.isActive, true))
					.orderBy(asc(outlets.name))
	]);

	return {
		locations: locationRows.map((row) => ({
			id: row.id,
			label: `${row.outletName} · ${row.name}`
		})),
		categories: categoryRows.map((row) => ({ id: row.id, label: row.name })),
		items: itemRows.map((row) => ({ id: row.id, label: `${row.itemCode} · ${row.name}` })),
		outlets: outletRows.map((row) => ({ id: row.id, label: row.name })),
		statuses: definition.statusOptions ?? []
	};
}

function filterSummary(
	definition: ReportDefinition,
	options: ReportFilterOptions,
	filters: ReportFilters
): string[] {
	const summary: string[] = [`Jenis: ${definition.title}`];
	const location = options.locations.find((option) => option.id === filters.locationId);
	const category = options.categories.find((option) => option.id === filters.categoryId);
	const item = options.items.find((option) => option.id === filters.itemId);
	const outlet = options.outlets.find((option) => option.id === filters.outletId);
	const status = options.statuses.find((option) => option.value === filters.status);
	if (filters.from) summary.push(`Dari: ${filters.from}`);
	if (filters.to) summary.push(`Sampai: ${filters.to}`);
	if (location) summary.push(`Lokasi: ${location.label}`);
	if (category) summary.push(`Kategori: ${category.label}`);
	if (item) summary.push(`Item: ${item.label}`);
	if (outlet) summary.push(`Outlet: ${outlet.label}`);
	if (status) summary.push(`Status: ${status.label}`);
	return summary;
}

export async function runReport(
	actor: AuthUser,
	key: string,
	filters: ReportFilters,
	page = 1,
	pageSize = 20
): Promise<ReportResult> {
	const definition = getReportDefinition(key, actor.role);
	assertCan(
		actor,
		'report:read',
		actor.role === 'outlet' ? { outletId: actor.outletId } : undefined
	);
	const options = await getReportFilterOptions(actor, key);
	const scopeOutlet = outletId(actor);
	const rows = await loadReportRows(definition, filters, scopeOutlet);
	const total = rows.length;
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const currentPage = Math.min(Math.max(page, 1), totalPages);
	const start = (currentPage - 1) * pageSize;
	return {
		definition,
		columns: definition.columns,
		rows: rows.slice(start, start + pageSize),
		total,
		page: currentPage,
		pageSize,
		filters,
		summary: filterSummary(definition, options, filters),
		options
	};
}

async function loadReportRows(
	definition: ReportDefinition,
	filters: ReportFilters,
	scopeOutlet: number | null
): Promise<ReportRow[]> {
	const from = startOfDay(filters.from);
	const to = endOfDay(filters.to);
	const fromValue =
		filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from) ? filters.from : undefined;
	const toValue = filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to) ? filters.to : undefined;
	const locationId = filters.locationId ?? null;
	const categoryId = filters.categoryId ?? null;
	const itemId = filters.itemId ?? null;
	const outletFilter = filters.outletId ?? null;
	const status = filters.status || null;

	const assetWhere = and(
		scopeOutlet ? eq(locations.outletId, scopeOutlet) : undefined,
		locationId ? eq(assets.locationId, locationId) : undefined,
		categoryId ? eq(assets.categoryId, categoryId) : undefined,
		status && definition.key === 'asset-list' ? eq(assets.status, status as never) : undefined
	);

	switch (definition.key) {
		case 'asset-list': {
			const rows = await db
				.select({
					code: assets.assetCode,
					name: assets.name,
					category: assetCategories.name,
					location: locations.name,
					outlet: outlets.name,
					status: assets.status,
					condition: assetConditions.name
				})
				.from(assets)
				.innerJoin(assetCategories, eq(assets.categoryId, assetCategories.id))
				.innerJoin(locations, eq(assets.locationId, locations.id))
				.innerJoin(outlets, eq(locations.outletId, outlets.id))
				.innerJoin(assetConditions, eq(assets.conditionId, assetConditions.id))
				.where(assetWhere)
				.orderBy(asc(assets.assetCode));
			return rows.map((row) => ({ ...row, status: ASSET_STATUS_LABEL[row.status] }));
		}
		case 'asset-by-category': {
			const rows = await db
				.select({ category: assetCategories.name, total: sql<number>`count(*)::int` })
				.from(assets)
				.innerJoin(assetCategories, eq(assets.categoryId, assetCategories.id))
				.innerJoin(locations, eq(assets.locationId, locations.id))
				.where(assetWhere)
				.groupBy(assetCategories.name)
				.orderBy(asc(assetCategories.name));
			return rows.map((row) => ({ ...row }));
		}
		case 'asset-by-location': {
			const rows = await db
				.select({
					location: locations.name,
					outlet: outlets.name,
					total: sql<number>`count(*)::int`
				})
				.from(assets)
				.innerJoin(locations, eq(assets.locationId, locations.id))
				.innerJoin(outlets, eq(locations.outletId, outlets.id))
				.where(assetWhere)
				.groupBy(locations.name, outlets.name)
				.orderBy(asc(outlets.name), asc(locations.name));
			return rows.map((row) => ({ ...row }));
		}
		case 'asset-by-status': {
			const rows = await db
				.select({ status: assets.status, total: sql<number>`count(*)::int` })
				.from(assets)
				.innerJoin(locations, eq(assets.locationId, locations.id))
				.where(assetWhere)
				.groupBy(assets.status)
				.orderBy(asc(assets.status));
			return rows.map((row) => ({ status: ASSET_STATUS_LABEL[row.status], total: row.total }));
		}
		case 'asset-by-condition': {
			const rows = await db
				.select({ condition: assetConditions.name, total: sql<number>`count(*)::int` })
				.from(assets)
				.innerJoin(locations, eq(assets.locationId, locations.id))
				.innerJoin(assetConditions, eq(assets.conditionId, assetConditions.id))
				.where(assetWhere)
				.groupBy(assetConditions.name)
				.orderBy(asc(assetConditions.name));
			return rows.map((row) => ({ ...row }));
		}
		case 'asset-assignment-history':
		case 'asset-mutation-history': {
			const type = definition.key === 'asset-assignment-history' ? 'assignment' : 'mutation';
			const fromLocation = alias(locations, 'from_location');
			const toLocation = alias(locations, 'to_location');
			const rows = await db
				.select({
					date: assetMovements.movementDate,
					number: assetMovements.movementNumber,
					assetCode: assets.assetCode,
					assetName: assets.name,
					from: assetMovements.fromLocationName,
					to: assetMovements.toLocationName,
					employee: assetMovements.toEmployeeName,
					receivedBy: assetMovements.receivedByName,
					performedBy: users.fullName
				})
				.from(assetMovements)
				.innerJoin(assets, eq(assetMovements.assetId, assets.id))
				.innerJoin(users, eq(assetMovements.performedBy, users.id))
				.leftJoin(fromLocation, eq(assetMovements.fromLocationId, fromLocation.id))
				.leftJoin(toLocation, eq(assetMovements.toLocationId, toLocation.id))
				.where(
					and(
						eq(assetMovements.movementType, type),
						scopeOutlet
							? or(eq(fromLocation.outletId, scopeOutlet), eq(toLocation.outletId, scopeOutlet))
							: undefined,
						locationId
							? or(
									eq(assetMovements.fromLocationId, locationId),
									eq(assetMovements.toLocationId, locationId)
								)
							: undefined,
						from ? gte(assetMovements.movementDate, from) : undefined,
						to ? lte(assetMovements.movementDate, to) : undefined
					)
				)
				.orderBy(desc(assetMovements.movementDate));
			return rows.map((row) => ({
				date: formatDateTime(row.date),
				number: row.number,
				asset: `${row.assetCode} · ${row.assetName}`,
				from: row.from ?? '—',
				to: row.to ?? '—',
				employee: row.employee,
				receivedBy: row.receivedBy,
				performedBy: row.performedBy
			}));
		}
		case 'asset-maintenance-history':
		case 'maintenance': {
			const rows = await db
				.select({
					date: assetMaintenances.createdAt,
					number: assetMaintenances.maintenanceNumber,
					assetCode: assets.assetCode,
					assetName: assets.name,
					status: assetMaintenances.status,
					problem: assetMaintenances.problemDescription,
					technician: assetMaintenances.technician,
					reportedAt: assetMaintenances.createdAt,
					completedAt: assetMaintenances.completionDate,
					cost: assetMaintenances.repairCost
				})
				.from(assetMaintenances)
				.innerJoin(assets, eq(assetMaintenances.assetId, assets.id))
				.innerJoin(locations, eq(assetMaintenances.locationId, locations.id))
				.where(
					and(
						scopeOutlet ? eq(locations.outletId, scopeOutlet) : undefined,
						locationId ? eq(assetMaintenances.locationId, locationId) : undefined,
						status ? eq(assetMaintenances.status, status as never) : undefined,
						from ? gte(assetMaintenances.createdAt, from) : undefined,
						to ? lte(assetMaintenances.createdAt, to) : undefined
					)
				)
				.orderBy(desc(assetMaintenances.createdAt));
			return rows.map((row) => ({
				date: formatDateTime(row.date),
				number: row.number,
				asset: `${row.assetCode} · ${row.assetName}`,
				status: maintenanceStatusLabels[row.status] ?? row.status,
				problem: row.problem,
				technician: row.technician,
				reportedAt: formatDateTime(row.reportedAt),
				completedAt: row.completedAt ? formatDate(row.completedAt) : '—',
				cost: row.cost ? Number(row.cost).toLocaleString('id-ID') : '—'
			}));
		}
		case 'asset-disposal': {
			const rows = await db
				.select({
					date: disposals.disposalDate,
					number: disposals.disposalNumber,
					assetCode: assets.assetCode,
					assetName: assets.name,
					reason: disposals.reason,
					status: disposals.status
				})
				.from(disposals)
				.innerJoin(assets, eq(disposals.assetId, assets.id))
				.innerJoin(locations, eq(assets.locationId, locations.id))
				.where(
					and(
						scopeOutlet ? eq(locations.outletId, scopeOutlet) : undefined,
						fromValue ? gte(disposals.disposalDate, fromValue) : undefined,
						toValue ? lte(disposals.disposalDate, toValue) : undefined
					)
				)
				.orderBy(desc(disposals.disposalDate));
			return rows.map((row) => ({
				date: formatDate(row.date),
				number: row.number,
				asset: `${row.assetCode} · ${row.assetName}`,
				reason: row.reason,
				status: row.status
			}));
		}
		case 'inventory-current-stock':
		case 'low-stock': {
			const rows = await db
				.select({
					item: inventoryItems.name,
					code: inventoryItems.itemCode,
					location: locations.name,
					qty: stockBalances.qty,
					unit: units.abbreviation,
					minStock: stockBalances.minStock
				})
				.from(stockBalances)
				.innerJoin(inventoryItems, eq(stockBalances.itemId, inventoryItems.id))
				.innerJoin(units, eq(inventoryItems.unitId, units.id))
				.innerJoin(locations, eq(stockBalances.locationId, locations.id))
				.where(
					and(
						scopeOutlet ? eq(locations.outletId, scopeOutlet) : undefined,
						locationId ? eq(stockBalances.locationId, locationId) : undefined,
						itemId ? eq(stockBalances.itemId, itemId) : undefined,
						definition.key === 'low-stock'
							? and(
									sql`${stockBalances.minStock} is not null`,
									sql`${stockBalances.qty} <= ${stockBalances.minStock}`
								)
							: undefined
					)
				)
				.orderBy(asc(inventoryItems.name));
			return rows.map((row) => ({
				item: row.item,
				code: row.code,
				location: row.location,
				qty: row.qty,
				unit: row.unit,
				minStock: row.minStock,
				status:
					row.qty === 0
						? 'Habis'
						: row.minStock !== null && row.qty <= row.minStock
							? 'Menipis'
							: 'Tersedia'
			}));
		}
		case 'stock-by-location': {
			const rows = await db
				.select({
					location: locations.name,
					outlet: outlets.name,
					itemTypes: sql<number>`count(distinct ${stockBalances.itemId})::int`,
					totalQty: sql<number>`coalesce(sum(${stockBalances.qty}), 0)::int`
				})
				.from(stockBalances)
				.innerJoin(locations, eq(stockBalances.locationId, locations.id))
				.innerJoin(outlets, eq(locations.outletId, outlets.id))
				.where(
					and(
						scopeOutlet ? eq(locations.outletId, scopeOutlet) : undefined,
						locationId ? eq(stockBalances.locationId, locationId) : undefined
					)
				)
				.groupBy(locations.name, outlets.name)
				.orderBy(asc(outlets.name), asc(locations.name));
			return rows.map((row) => ({ ...row }));
		}
		case 'stock-in':
		case 'stock-out':
		case 'stock-transfer':
		case 'stock-adjustment':
		case 'inventory-transaction-history': {
			const types =
				definition.key === 'stock-in'
					? ['stock_in']
					: definition.key === 'stock-out'
						? ['stock_out']
						: definition.key === 'stock-transfer'
							? ['transfer_out', 'transfer_in']
							: definition.key === 'stock-adjustment'
								? ['adjustment']
								: undefined;
			const rows = await db
				.select({
					date: stockTransactions.createdAt,
					document: stockDocuments.documentNumber,
					type: stockTransactions.transactionType,
					item: inventoryItems.name,
					location: locations.name,
					qty: stockTransactions.signedQty,
					performedBy: users.fullName
				})
				.from(stockTransactions)
				.innerJoin(stockDocuments, eq(stockTransactions.documentId, stockDocuments.id))
				.innerJoin(inventoryItems, eq(stockTransactions.itemId, inventoryItems.id))
				.innerJoin(locations, eq(stockTransactions.locationId, locations.id))
				.innerJoin(users, eq(stockDocuments.performedBy, users.id))
				.where(
					and(
						types ? inArray(stockTransactions.transactionType, types as never[]) : undefined,
						scopeOutlet ? eq(locations.outletId, scopeOutlet) : undefined,
						locationId ? eq(stockTransactions.locationId, locationId) : undefined,
						itemId ? eq(stockTransactions.itemId, itemId) : undefined,
						from ? gte(stockTransactions.createdAt, from) : undefined,
						to ? lte(stockTransactions.createdAt, to) : undefined
					)
				)
				.orderBy(desc(stockTransactions.createdAt));
			return rows.map((row) => ({
				date: formatDateTime(row.date),
				document: row.document,
				type: row.type,
				item: row.item,
				location: row.location,
				qty: row.qty,
				performedBy: row.performedBy
			}));
		}
		case 'borrowing':
		case 'overdue-loan': {
			const rows = await db
				.select({
					number: assetLoans.loanNumber,
					assetCode: assets.assetCode,
					assetName: assets.name,
					borrower: assetLoans.borrowerName,
					borrowDate: assetLoans.borrowingDate,
					expectedDate: assetLoans.expectedReturnDate,
					actualDate: assetLoans.actualReturnDate,
					status: assetLoans.status,
					location: locations.name
				})
				.from(assetLoans)
				.innerJoin(assets, eq(assetLoans.assetId, assets.id))
				.innerJoin(locations, eq(assets.locationId, locations.id))
				.where(
					and(
						scopeOutlet ? eq(locations.outletId, scopeOutlet) : undefined,
						locationId ? eq(assets.locationId, locationId) : undefined,
						status && definition.key === 'borrowing'
							? eq(assetLoans.status, status as never)
							: undefined,
						definition.key === 'overdue-loan'
							? and(
									eq(assetLoans.status, 'borrowed'),
									sql`${assetLoans.expectedReturnDate} < current_date`
								)
							: undefined,
						fromValue ? gte(assetLoans.borrowingDate, fromValue) : undefined,
						toValue ? lte(assetLoans.borrowingDate, toValue) : undefined
					)
				)
				.orderBy(desc(assetLoans.borrowingDate));
			return rows.map((row) => {
				const daysLate = Math.max(
					0,
					Math.floor(
						(Date.parse(new Date().toISOString().slice(0, 10) + 'T00:00:00Z') -
							Date.parse(row.expectedDate + 'T00:00:00Z')) /
							86_400_000
					)
				);
				return {
					number: row.number,
					asset: `${row.assetCode} · ${row.assetName}`,
					borrower: row.borrower,
					borrowDate: formatDate(row.borrowDate),
					expectedDate: formatDate(row.expectedDate),
					actualDate: row.actualDate ? formatDate(row.actualDate) : '—',
					status:
						row.status === 'borrowed' && daysLate > 0
							? 'Terlambat'
							: row.status === 'borrowed'
								? 'Dipinjam'
								: row.status === 'returned'
									? 'Dikembalikan'
									: 'Dibatalkan',
					daysLate,
					location: row.location
				};
			});
		}
		case 'stock-opname': {
			const rows = await db
				.select({
					number: stockOpnames.opnameNumber,
					location: locations.name,
					itemType: stockOpnames.itemType,
					status: stockOpnames.status,
					startedAt: stockOpnames.startedAt,
					completedAt: stockOpnames.completedAt
				})
				.from(stockOpnames)
				.innerJoin(locations, eq(stockOpnames.locationId, locations.id))
				.where(
					and(
						scopeOutlet ? eq(locations.outletId, scopeOutlet) : undefined,
						locationId ? eq(stockOpnames.locationId, locationId) : undefined,
						status ? eq(stockOpnames.status, status as never) : undefined,
						from ? gte(stockOpnames.createdAt, from) : undefined,
						to ? lte(stockOpnames.createdAt, to) : undefined
					)
				)
				.orderBy(desc(stockOpnames.createdAt));
			return rows.map((row) => ({
				number: row.number,
				location: row.location,
				itemType: row.itemType,
				status: row.status,
				startedAt: formatDateTime(row.startedAt),
				completedAt: formatDateTime(row.completedAt)
			}));
		}
		case 'outlet-request': {
			const rows = await db
				.select({
					number: itemRequests.requestNumber,
					outlet: outlets.name,
					requestedBy: users.fullName,
					createdAt: itemRequests.createdAt,
					status: itemRequests.status,
					requestedQty: sql<number>`coalesce(sum(${requestLines.requestedQty}), 0)::int`,
					fulfilledQty: sql<number>`coalesce(sum(${requestLines.fulfilledQty}), 0)::int`
				})
				.from(itemRequests)
				.innerJoin(outlets, eq(itemRequests.outletId, outlets.id))
				.innerJoin(users, eq(itemRequests.requestedBy, users.id))
				.leftJoin(requestLines, eq(requestLines.requestId, itemRequests.id))
				.where(
					and(
						scopeOutlet ? eq(itemRequests.outletId, scopeOutlet) : undefined,
						outletFilter ? eq(itemRequests.outletId, outletFilter) : undefined,
						status ? eq(itemRequests.status, status as never) : undefined,
						from ? gte(itemRequests.createdAt, from) : undefined,
						to ? lte(itemRequests.createdAt, to) : undefined
					)
				)
				.groupBy(
					itemRequests.id,
					itemRequests.requestNumber,
					outlets.name,
					users.fullName,
					itemRequests.createdAt,
					itemRequests.status
				)
				.orderBy(desc(itemRequests.createdAt));
			return rows.map((row) => ({
				number: row.number,
				outlet: row.outlet,
				requestedBy: row.requestedBy,
				createdAt: formatDateTime(row.createdAt),
				requestedQty: row.requestedQty,
				fulfilledQty: row.fulfilledQty,
				status: requestStatusLabels[row.status] ?? row.status
			}));
		}
		default:
			throw new DomainError('TIDAK_DITEMUKAN', 'Laporan tidak ditemukan.');
	}
}
