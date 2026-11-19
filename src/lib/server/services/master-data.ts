import { asc, eq, ilike, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '#lib/server/db/index.js';
import {
	assetCategories,
	assetConditions,
	assetModels,
	assetStatusEnum,
	brands,
	departments,
	employees,
	inventoryCategories,
	inventoryItems,
	locations,
	outlets,
	suppliers,
	units
} from '#lib/server/db/schema/index.js';
import { writeAudit } from '#lib/server/audit.js';
import { assertCan } from '#lib/server/auth/permissions.js';
import type { AuthUser } from '#lib/server/auth/session.js';
import { isUniqueViolation } from '#lib/server/db/errors.js';
import { DomainError } from '#lib/server/errors.js';

export type MasterType =
	| 'asset-category'
	| 'inventory-category'
	| 'brand'
	| 'asset-condition'
	| 'unit'
	| 'supplier'
	| 'model'
	| 'department'
	| 'outlet'
	| 'location'
	| 'employee'
	| 'asset-status';

export type MasterFieldType = 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox';
export type MasterOptionsSource =
	'assetCategories' | 'brands' | 'outlets' | 'locations' | 'departments';

export type MasterField = {
	name: string;
	label: string;
	type: MasterFieldType;
	required?: boolean;
	hint?: string;
	optionsSource?: MasterOptionsSource;
};

export type MasterColumn = {
	key: string;
	label: string;
	mobile?: boolean;
	mobilePrimary?: boolean;
	align?: 'left' | 'center' | 'right';
};

export type MasterMeta = {
	type: MasterType;
	label: string;
	pluralLabel: string;
	description: string;
	group: 'Aset' | 'Inventory' | 'Organisasi' | 'Vendor' | 'Sistem';
	supportCanWrite: boolean;
	canCreate: boolean;
	canEdit: boolean;
	canDeactivate: boolean;
	fields: MasterField[];
	columns: MasterColumn[];
};

export type MasterOption = { id: number; label: string };
export type MasterFormOptions = Record<MasterOptionsSource, MasterOption[]>;

export type MasterRow = {
	id: number | string;
	name: string;
	statusLabel: string;
	[key: string]: unknown;
};

export type MasterListResult = {
	meta: MasterMeta;
	items: MasterRow[];
	page: number;
	pageSize: number;
	total: number;
};

export type MasterOverviewModule = {
	type: MasterType | 'inventory-item';
	label: string;
	description: string;
	group: string;
	count: number;
	href: string;
};

const activeField: MasterField = {
	name: 'isActive',
	label: 'Aktif',
	type: 'checkbox',
	hint: 'Master nonaktif tidak muncul di pilihan baru tetapi tetap tampil di riwayat.'
};

const statusColumn: MasterColumn = { key: 'statusLabel', label: 'Status', mobile: true };

function simpleMeta(
	type: MasterType,
	label: string,
	description: string,
	group: MasterMeta['group'],
	supportCanWrite = true
): MasterMeta {
	return {
		type,
		label,
		pluralLabel: label,
		description,
		group,
		supportCanWrite,
		canCreate: true,
		canEdit: true,
		canDeactivate: true,
		fields: [{ name: 'name', label: 'Nama', type: 'text', required: true }, activeField],
		columns: [{ key: 'name', label: 'Nama', mobilePrimary: true }, statusColumn]
	};
}

export const MASTER_TYPES: Record<MasterType, MasterMeta> = {
	'asset-category': simpleMeta(
		'asset-category',
		'Kategori Aset',
		'Kategori untuk mengelompokkan aset IT.',
		'Aset'
	),
	'inventory-category': simpleMeta(
		'inventory-category',
		'Kategori Inventory',
		'Kategori untuk mengelompokkan item inventory.',
		'Inventory'
	),
	brand: simpleMeta('brand', 'Brand', 'Merek perangkat dan item inventory.', 'Aset'),
	'asset-condition': simpleMeta(
		'asset-condition',
		'Kondisi Aset',
		'Nilai kondisi fisik aset.',
		'Aset',
		false
	),
	unit: {
		type: 'unit',
		label: 'Unit',
		pluralLabel: 'Unit',
		description: 'Satuan pengukuran item inventory.',
		group: 'Inventory',
		supportCanWrite: true,
		canCreate: true,
		canEdit: true,
		canDeactivate: true,
		fields: [
			{ name: 'name', label: 'Nama unit', type: 'text', required: true },
			{ name: 'abbreviation', label: 'Singkatan', type: 'text', required: true },
			activeField
		],
		columns: [
			{ key: 'name', label: 'Nama', mobilePrimary: true },
			{ key: 'abbreviation', label: 'Singkatan', mobile: true },
			statusColumn
		]
	},
	supplier: {
		type: 'supplier',
		label: 'Supplier',
		pluralLabel: 'Supplier',
		description: 'Vendor atau supplier penerimaan barang.',
		group: 'Vendor',
		supportCanWrite: true,
		canCreate: true,
		canEdit: true,
		canDeactivate: true,
		fields: [
			{ name: 'name', label: 'Nama supplier', type: 'text', required: true },
			{ name: 'contactName', label: 'Nama kontak', type: 'text' },
			{ name: 'phone', label: 'Telepon', type: 'tel' },
			{ name: 'email', label: 'Email', type: 'email' },
			{ name: 'address', label: 'Alamat', type: 'textarea' },
			activeField
		],
		columns: [
			{ key: 'name', label: 'Nama', mobilePrimary: true },
			{ key: 'contactName', label: 'Kontak', mobile: true },
			{ key: 'phone', label: 'Telepon' },
			statusColumn
		]
	},
	model: {
		type: 'model',
		label: 'Model',
		pluralLabel: 'Model',
		description: 'Model perangkat berdasarkan brand dan kategori aset.',
		group: 'Aset',
		supportCanWrite: true,
		canCreate: true,
		canEdit: true,
		canDeactivate: true,
		fields: [
			{ name: 'name', label: 'Nama model', type: 'text', required: true },
			{
				name: 'categoryId',
				label: 'Kategori aset',
				type: 'select',
				required: true,
				optionsSource: 'assetCategories'
			},
			{
				name: 'brandId',
				label: 'Brand',
				type: 'select',
				required: true,
				optionsSource: 'brands'
			},
			activeField
		],
		columns: [
			{ key: 'name', label: 'Model', mobilePrimary: true },
			{ key: 'categoryName', label: 'Kategori', mobile: true },
			{ key: 'brandName', label: 'Brand', mobile: true },
			statusColumn
		]
	},
	department: {
		type: 'department',
		label: 'Department',
		pluralLabel: 'Department',
		description: 'Departemen di dalam outlet.',
		group: 'Organisasi',
		supportCanWrite: false,
		canCreate: true,
		canEdit: true,
		canDeactivate: true,
		fields: [
			{ name: 'name', label: 'Nama department', type: 'text', required: true },
			{
				name: 'outletId',
				label: 'Outlet',
				type: 'select',
				required: true,
				optionsSource: 'outlets'
			},
			activeField
		],
		columns: [
			{ key: 'name', label: 'Department', mobilePrimary: true },
			{ key: 'outletName', label: 'Outlet', mobile: true },
			statusColumn
		]
	},
	outlet: {
		type: 'outlet',
		label: 'Outlet',
		pluralLabel: 'Outlet',
		description: 'Head Office dan outlet perusahaan.',
		group: 'Organisasi',
		supportCanWrite: false,
		canCreate: true,
		canEdit: true,
		canDeactivate: true,
		fields: [
			{ name: 'code', label: 'Kode outlet', type: 'text', required: true },
			{ name: 'name', label: 'Nama outlet', type: 'text', required: true },
			{ name: 'isHeadOffice', label: 'Head Office', type: 'checkbox' },
			{ name: 'address', label: 'Alamat', type: 'textarea' },
			{ name: 'phone', label: 'Telepon', type: 'tel' },
			activeField
		],
		columns: [
			{ key: 'code', label: 'Kode', mobile: true },
			{ key: 'name', label: 'Nama', mobilePrimary: true },
			{ key: 'isHeadOfficeLabel', label: 'Tipe', mobile: true },
			statusColumn
		]
	},
	location: {
		type: 'location',
		label: 'Lokasi',
		pluralLabel: 'Lokasi',
		description: 'Lokasi hierarkis di dalam outlet.',
		group: 'Organisasi',
		supportCanWrite: false,
		canCreate: true,
		canEdit: true,
		canDeactivate: true,
		fields: [
			{
				name: 'outletId',
				label: 'Outlet',
				type: 'select',
				required: true,
				optionsSource: 'outlets'
			},
			{ name: 'parentId', label: 'Lokasi induk', type: 'select', optionsSource: 'locations' },
			{ name: 'code', label: 'Kode lokasi', type: 'text', required: true },
			{ name: 'name', label: 'Nama lokasi', type: 'text', required: true },
			activeField
		],
		columns: [
			{ key: 'name', label: 'Lokasi', mobilePrimary: true },
			{ key: 'code', label: 'Kode', mobile: true },
			{ key: 'outletName', label: 'Outlet', mobile: true },
			{ key: 'parentName', label: 'Induk' },
			statusColumn
		]
	},
	employee: {
		type: 'employee',
		label: 'Employee',
		pluralLabel: 'Employee',
		description: 'Karyawan pemegang aset. Bukan akun pengguna.',
		group: 'Organisasi',
		supportCanWrite: true,
		canCreate: true,
		canEdit: true,
		canDeactivate: true,
		fields: [
			{ name: 'employeeCode', label: 'Kode employee', type: 'text', required: true },
			{ name: 'fullName', label: 'Nama lengkap', type: 'text', required: true },
			{ name: 'email', label: 'Email', type: 'email' },
			{ name: 'phone', label: 'Telepon', type: 'tel' },
			{
				name: 'outletId',
				label: 'Outlet',
				type: 'select',
				required: true,
				optionsSource: 'outlets'
			},
			{
				name: 'departmentId',
				label: 'Department',
				type: 'select',
				optionsSource: 'departments'
			},
			activeField
		],
		columns: [
			{ key: 'employeeCode', label: 'Kode', mobile: true },
			{ key: 'fullName', label: 'Nama', mobilePrimary: true },
			{ key: 'outletName', label: 'Outlet', mobile: true },
			{ key: 'departmentName', label: 'Department' },
			statusColumn
		]
	},
	'asset-status': {
		type: 'asset-status',
		label: 'Asset Status',
		pluralLabel: 'Asset Status',
		description: 'Nilai status sistem. Tidak dapat diubah dari master data.',
		group: 'Sistem',
		supportCanWrite: false,
		canCreate: false,
		canEdit: false,
		canDeactivate: false,
		fields: [],
		columns: [
			{ key: 'name', label: 'Status', mobilePrimary: true },
			{ key: 'statusLabel', label: 'Tipe' }
		]
	}
};

const parentLocation = alias(locations, 'parent_location');

function isMasterType(value: string): value is MasterType {
	return Object.hasOwn(MASTER_TYPES, value);
}

export function getMasterMeta(type: string): MasterMeta {
	if (!isMasterType(type)) {
		throw new DomainError('TIDAK_DITEMUKAN', 'Jenis master data tidak ditemukan.');
	}
	return MASTER_TYPES[type];
}

function assertCanRead(actor: AuthUser, meta: MasterMeta): void {
	assertCan(actor, 'masterdata:read');
	if (actor.role === 'support' && !meta.supportCanWrite) {
		throw new DomainError('DILARANG', 'Anda tidak punya akses ke master data ini.');
	}
}

function assertCanWrite(actor: AuthUser, meta: MasterMeta, id: number | null): void {
	assertCan(actor, 'masterdata:write', { masterType: meta.type });
	if (actor.role === 'support' && !meta.supportCanWrite) {
		throw new DomainError('DILARANG', 'Anda tidak punya akses ke master data ini.');
	}
	if (id === null && !meta.canCreate) {
		throw new DomainError('DILARANG', 'Master data ini tidak dapat ditambah.');
	}
	if (id !== null && !meta.canEdit) {
		throw new DomainError('DILARANG', 'Master data ini tidak dapat diubah.');
	}
}

function paginate(total: number, requestedPage: number, pageSize: number) {
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const page = Math.min(Math.max(requestedPage, 1), totalPages);
	return { page, totalPages, offset: (page - 1) * pageSize };
}

function normalizeSearch(value: string | undefined): string {
	return value?.trim() ?? '';
}

function statusLabel(isActive: boolean): string {
	return isActive ? 'Aktif' : 'Nonaktif';
}

function text(
	values: Record<string, unknown>,
	key: string,
	label: string,
	required = false
): string {
	const value = String(values[key] ?? '').trim();
	if (required && !value) {
		throw new DomainError('VALIDASI', `${label} wajib diisi.`);
	}
	return value;
}

function numberOrNull(
	values: Record<string, unknown>,
	key: string,
	label: string,
	required = false
): number | null {
	const raw = String(values[key] ?? '').trim();
	if (!raw) {
		if (required) throw new DomainError('VALIDASI', `${label} wajib dipilih.`);
		return null;
	}
	const value = Number(raw);
	if (!Number.isInteger(value)) {
		throw new DomainError('VALIDASI', `${label} tidak valid.`);
	}
	return value;
}

function bool(values: Record<string, unknown>, key: string, fallback = false): boolean {
	if (values[key] === undefined) return fallback;
	return values[key] === true || values[key] === 'on' || values[key] === 'true';
}

function duplicateError(): DomainError {
	return new DomainError('DUPLIKAT', 'Data dengan nama atau kode tersebut sudah ada.');
}

export async function listMasterData(
	actor: AuthUser,
	type: string,
	filter: { search?: string; page?: number; pageSize?: number } = {}
): Promise<MasterListResult> {
	const meta = getMasterMeta(type);
	assertCanRead(actor, meta);
	const search = normalizeSearch(filter.search);
	const pageSize = Math.min(100, Math.max(5, filter.pageSize ?? 10));
	const term = `%${search}%`;

	switch (meta.type) {
		case 'asset-category':
		case 'inventory-category':
		case 'brand':
		case 'asset-condition': {
			const table =
				meta.type === 'asset-category'
					? assetCategories
					: meta.type === 'inventory-category'
						? inventoryCategories
						: meta.type === 'brand'
							? brands
							: assetConditions;
			const where = search ? ilike(table.name, term) : undefined;
			const [{ total }] = await db
				.select({ total: sql<number>`count(*)::int` })
				.from(table)
				.where(where);
			const { page, offset } = paginate(total, filter.page ?? 1, pageSize);
			const rows = await db
				.select({ id: table.id, name: table.name, isActive: table.isActive })
				.from(table)
				.where(where)
				.orderBy(asc(table.name))
				.limit(pageSize)
				.offset(offset);
			return {
				meta,
				items: rows.map((row) => ({
					id: row.id,
					name: row.name,
					isActive: row.isActive,
					statusLabel: statusLabel(row.isActive)
				})),
				page,
				pageSize,
				total
			};
		}
		case 'unit': {
			const where = search ? ilike(units.name, term) : undefined;
			const [{ total }] = await db
				.select({ total: sql<number>`count(*)::int` })
				.from(units)
				.where(where);
			const { page, offset } = paginate(total, filter.page ?? 1, pageSize);
			const rows = await db
				.select({
					id: units.id,
					name: units.name,
					abbreviation: units.abbreviation,
					isActive: units.isActive
				})
				.from(units)
				.where(where)
				.orderBy(asc(units.name))
				.limit(pageSize)
				.offset(offset);
			return {
				meta,
				items: rows.map((row) => ({
					id: row.id,
					name: row.name,
					abbreviation: row.abbreviation,
					isActive: row.isActive,
					statusLabel: statusLabel(row.isActive)
				})),
				page,
				pageSize,
				total
			};
		}
		case 'supplier': {
			const where = search ? ilike(suppliers.name, term) : undefined;
			const [{ total }] = await db
				.select({ total: sql<number>`count(*)::int` })
				.from(suppliers)
				.where(where);
			const { page, offset } = paginate(total, filter.page ?? 1, pageSize);
			const rows = await db
				.select({
					id: suppliers.id,
					name: suppliers.name,
					contactName: suppliers.contactName,
					phone: suppliers.phone,
					email: suppliers.email,
					isActive: suppliers.isActive
				})
				.from(suppliers)
				.where(where)
				.orderBy(asc(suppliers.name))
				.limit(pageSize)
				.offset(offset);
			return {
				meta,
				items: rows.map((row) => ({
					...row,
					statusLabel: statusLabel(row.isActive)
				})),
				page,
				pageSize,
				total
			};
		}
		case 'model': {
			const where = search ? ilike(assetModels.name, term) : undefined;
			const [{ total }] = await db
				.select({ total: sql<number>`count(*)::int` })
				.from(assetModels)
				.where(where);
			const { page, offset } = paginate(total, filter.page ?? 1, pageSize);
			const rows = await db
				.select({
					id: assetModels.id,
					name: assetModels.name,
					categoryName: assetCategories.name,
					brandName: brands.name,
					isActive: assetModels.isActive
				})
				.from(assetModels)
				.innerJoin(assetCategories, eq(assetModels.categoryId, assetCategories.id))
				.innerJoin(brands, eq(assetModels.brandId, brands.id))
				.where(where)
				.orderBy(asc(assetModels.name))
				.limit(pageSize)
				.offset(offset);
			return {
				meta,
				items: rows.map((row) => ({
					...row,
					statusLabel: statusLabel(row.isActive)
				})),
				page,
				pageSize,
				total
			};
		}
		case 'department': {
			const where = search ? ilike(departments.name, term) : undefined;
			const [{ total }] = await db
				.select({ total: sql<number>`count(*)::int` })
				.from(departments)
				.where(where);
			const { page, offset } = paginate(total, filter.page ?? 1, pageSize);
			const rows = await db
				.select({
					id: departments.id,
					name: departments.name,
					outletName: outlets.name,
					isActive: departments.isActive
				})
				.from(departments)
				.innerJoin(outlets, eq(departments.outletId, outlets.id))
				.where(where)
				.orderBy(asc(departments.name))
				.limit(pageSize)
				.offset(offset);
			return {
				meta,
				items: rows.map((row) => ({
					...row,
					statusLabel: statusLabel(row.isActive)
				})),
				page,
				pageSize,
				total
			};
		}
		case 'outlet': {
			const where = search ? ilike(outlets.name, term) : undefined;
			const [{ total }] = await db
				.select({ total: sql<number>`count(*)::int` })
				.from(outlets)
				.where(where);
			const { page, offset } = paginate(total, filter.page ?? 1, pageSize);
			const rows = await db
				.select({
					id: outlets.id,
					code: outlets.code,
					name: outlets.name,
					isHeadOffice: outlets.isHeadOffice,
					isActive: outlets.isActive
				})
				.from(outlets)
				.where(where)
				.orderBy(asc(outlets.name))
				.limit(pageSize)
				.offset(offset);
			return {
				meta,
				items: rows.map((row) => ({
					id: row.id,
					name: row.name,
					code: row.code,
					isHeadOfficeLabel: row.isHeadOffice ? 'Head Office' : 'Outlet',
					isActive: row.isActive,
					statusLabel: statusLabel(row.isActive)
				})),
				page,
				pageSize,
				total
			};
		}
		case 'location': {
			const where = search ? ilike(locations.name, term) : undefined;
			const [{ total }] = await db
				.select({ total: sql<number>`count(*)::int` })
				.from(locations)
				.where(where);
			const { page, offset } = paginate(total, filter.page ?? 1, pageSize);
			const rows = await db
				.select({
					id: locations.id,
					code: locations.code,
					name: locations.name,
					outletName: outlets.name,
					parentName: parentLocation.name,
					isActive: locations.isActive
				})
				.from(locations)
				.innerJoin(outlets, eq(locations.outletId, outlets.id))
				.leftJoin(parentLocation, eq(locations.parentId, parentLocation.id))
				.where(where)
				.orderBy(asc(locations.name))
				.limit(pageSize)
				.offset(offset);
			return {
				meta,
				items: rows.map((row) => ({
					...row,
					statusLabel: statusLabel(row.isActive)
				})),
				page,
				pageSize,
				total
			};
		}
		case 'employee': {
			const where = search
				? sql`(${ilike(employees.fullName, term)} OR ${ilike(employees.employeeCode, term)})`
				: undefined;
			const [{ total }] = await db
				.select({ total: sql<number>`count(*)::int` })
				.from(employees)
				.where(where);
			const { page, offset } = paginate(total, filter.page ?? 1, pageSize);
			const rows = await db
				.select({
					id: employees.id,
					employeeCode: employees.employeeCode,
					fullName: employees.fullName,
					outletName: outlets.name,
					departmentName: departments.name,
					isActive: employees.isActive
				})
				.from(employees)
				.innerJoin(outlets, eq(employees.outletId, outlets.id))
				.leftJoin(departments, eq(employees.departmentId, departments.id))
				.where(where)
				.orderBy(asc(employees.fullName))
				.limit(pageSize)
				.offset(offset);
			return {
				meta,
				items: rows.map((row) => ({
					...row,
					name: row.fullName,
					statusLabel: statusLabel(row.isActive)
				})),
				page,
				pageSize,
				total
			};
		}
		case 'asset-status': {
			const labels: Record<string, string> = {
				available: 'Available',
				in_use: 'In Use',
				on_loan: 'On Loan',
				under_maintenance: 'Under Maintenance',
				damaged: 'Damaged',
				disposed: 'Disposed'
			};
			const all = assetStatusEnum.enumValues
				.map((value) => ({ id: value, name: labels[value] ?? value, statusLabel: 'Sistem' }))
				.filter((row) => (search ? row.name.toLowerCase().includes(search.toLowerCase()) : true));
			const { page, offset } = paginate(all.length, filter.page ?? 1, pageSize);
			return {
				meta,
				items: all.slice(offset, offset + pageSize),
				page,
				pageSize,
				total: all.length
			};
		}
	}
}

export async function getMasterRecord(
	actor: AuthUser,
	type: string,
	id: number
): Promise<Record<string, unknown>> {
	const meta = getMasterMeta(type);
	assertCanRead(actor, meta);

	switch (meta.type) {
		case 'asset-category':
		case 'inventory-category':
		case 'brand':
		case 'asset-condition': {
			const table =
				meta.type === 'asset-category'
					? assetCategories
					: meta.type === 'inventory-category'
						? inventoryCategories
						: meta.type === 'brand'
							? brands
							: assetConditions;
			const [row] = await db.select().from(table).where(eq(table.id, id)).limit(1);
			if (!row) throw new DomainError('TIDAK_DITEMUKAN', 'Data tidak ditemukan.');
			return row;
		}
		case 'unit': {
			const [row] = await db.select().from(units).where(eq(units.id, id)).limit(1);
			if (!row) throw new DomainError('TIDAK_DITEMUKAN', 'Data tidak ditemukan.');
			return row;
		}
		case 'supplier': {
			const [row] = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
			if (!row) throw new DomainError('TIDAK_DITEMUKAN', 'Data tidak ditemukan.');
			return row;
		}
		case 'model': {
			const [row] = await db.select().from(assetModels).where(eq(assetModels.id, id)).limit(1);
			if (!row) throw new DomainError('TIDAK_DITEMUKAN', 'Data tidak ditemukan.');
			return row;
		}
		case 'department': {
			const [row] = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
			if (!row) throw new DomainError('TIDAK_DITEMUKAN', 'Data tidak ditemukan.');
			return row;
		}
		case 'outlet': {
			const [row] = await db.select().from(outlets).where(eq(outlets.id, id)).limit(1);
			if (!row) throw new DomainError('TIDAK_DITEMUKAN', 'Data tidak ditemukan.');
			return row;
		}
		case 'location': {
			const [row] = await db.select().from(locations).where(eq(locations.id, id)).limit(1);
			if (!row) throw new DomainError('TIDAK_DITEMUKAN', 'Data tidak ditemukan.');
			return row;
		}
		case 'employee': {
			const [row] = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
			if (!row) throw new DomainError('TIDAK_DITEMUKAN', 'Data tidak ditemukan.');
			return row;
		}
		case 'asset-status': {
			const match = assetStatusEnum.enumValues.find((value) => value === String(id));
			if (!match) throw new DomainError('TIDAK_DITEMUKAN', 'Data tidak ditemukan.');
			return { id: match, name: match, statusLabel: 'Sistem' };
		}
	}
}

export async function getMasterFormOptions(actor: AuthUser): Promise<MasterFormOptions> {
	assertCan(actor, 'masterdata:read');

	const [categoryRows, brandRows, outletRows, locationRows, departmentRows] = await Promise.all([
		db
			.select({ id: assetCategories.id, name: assetCategories.name })
			.from(assetCategories)
			.where(eq(assetCategories.isActive, true))
			.orderBy(asc(assetCategories.name)),
		db
			.select({ id: brands.id, name: brands.name })
			.from(brands)
			.where(eq(brands.isActive, true))
			.orderBy(asc(brands.name)),
		db
			.select({ id: outlets.id, name: outlets.name })
			.from(outlets)
			.where(eq(outlets.isActive, true))
			.orderBy(asc(outlets.name)),
		db
			.select({ id: locations.id, name: locations.name, outletName: outlets.name })
			.from(locations)
			.innerJoin(outlets, eq(locations.outletId, outlets.id))
			.where(eq(locations.isActive, true))
			.orderBy(asc(locations.name)),
		db
			.select({ id: departments.id, name: departments.name, outletName: outlets.name })
			.from(departments)
			.innerJoin(outlets, eq(departments.outletId, outlets.id))
			.where(eq(departments.isActive, true))
			.orderBy(asc(departments.name))
	]);

	return {
		assetCategories: categoryRows.map((row) => ({ id: row.id, label: row.name })),
		brands: brandRows.map((row) => ({ id: row.id, label: row.name })),
		outlets: outletRows.map((row) => ({ id: row.id, label: row.name })),
		locations: locationRows.map((row) => ({
			id: row.id,
			label: `${row.outletName} · ${row.name}`
		})),
		departments: departmentRows.map((row) => ({
			id: row.id,
			label: `${row.outletName} · ${row.name}`
		}))
	};
}

export async function saveMasterData(
	actor: AuthUser,
	type: string,
	id: number | null,
	values: Record<string, unknown>
): Promise<number> {
	const meta = getMasterMeta(type);
	assertCanWrite(actor, meta, id);
	const active = actor.role === 'admin' ? bool(values, 'isActive', true) : true;

	try {
		switch (meta.type) {
			case 'asset-category':
			case 'inventory-category':
			case 'brand':
			case 'asset-condition': {
				const name = text(values, 'name', 'Nama', true);
				const table =
					meta.type === 'asset-category'
						? assetCategories
						: meta.type === 'inventory-category'
							? inventoryCategories
							: meta.type === 'brand'
								? brands
								: assetConditions;
				return await db.transaction(async (tx) => {
					if (id === null) {
						const [created] = await tx
							.insert(table)
							.values({ name, isActive: active })
							.returning({ id: table.id });
						await writeAudit(tx, actor, {
							module: 'masterdata',
							action: 'masterdata_created',
							recordId: String(created.id),
							newValue: { name, isActive: active }
						});
						return created.id;
					}
					const [target] = await tx.select().from(table).where(eq(table.id, id)).limit(1);
					if (!target) throw new DomainError('TIDAK_DITEMUKAN', 'Data tidak ditemukan.');
					const nextActive = actor.role === 'admin' ? active : target.isActive;
					await tx.update(table).set({ name, isActive: nextActive }).where(eq(table.id, id));
					await writeAudit(tx, actor, {
						module: 'masterdata',
						action: 'masterdata_updated',
						recordId: String(id),
						previousValue: { name: target.name, isActive: target.isActive },
						newValue: { name, isActive: nextActive }
					});
					return id;
				});
			}
			case 'unit': {
				const name = text(values, 'name', 'Nama', true);
				const abbreviation = text(values, 'abbreviation', 'Singkatan', true);
				return await db.transaction(async (tx) => {
					if (id === null) {
						const [created] = await tx
							.insert(units)
							.values({ name, abbreviation, isActive: active })
							.returning({ id: units.id });
						await writeAudit(tx, actor, {
							module: 'masterdata',
							action: 'masterdata_created',
							recordId: String(created.id),
							newValue: { name, abbreviation, isActive: active }
						});
						return created.id;
					}
					const [target] = await tx.select().from(units).where(eq(units.id, id)).limit(1);
					if (!target) throw new DomainError('TIDAK_DITEMUKAN', 'Data tidak ditemukan.');
					const nextActive = actor.role === 'admin' ? active : target.isActive;
					await tx
						.update(units)
						.set({ name, abbreviation, isActive: nextActive })
						.where(eq(units.id, id));
					await writeAudit(tx, actor, {
						module: 'masterdata',
						action: 'masterdata_updated',
						recordId: String(id),
						previousValue: {
							name: target.name,
							abbreviation: target.abbreviation,
							isActive: target.isActive
						},
						newValue: { name, abbreviation, isActive: nextActive }
					});
					return id;
				});
			}
			case 'supplier': {
				const name = text(values, 'name', 'Nama', true);
				const contactName = text(values, 'contactName', 'Nama kontak');
				const phone = text(values, 'phone', 'Telepon');
				const email = text(values, 'email', 'Email');
				const address = text(values, 'address', 'Alamat');
				return await db.transaction(async (tx) => {
					if (id === null) {
						const [created] = await tx
							.insert(suppliers)
							.values({ name, contactName, phone, email, address, isActive: active })
							.returning({ id: suppliers.id });
						await writeAudit(tx, actor, {
							module: 'masterdata',
							action: 'masterdata_created',
							recordId: String(created.id),
							newValue: { name, contactName, phone, email, address, isActive: active }
						});
						return created.id;
					}
					const [target] = await tx.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
					if (!target) throw new DomainError('TIDAK_DITEMUKAN', 'Data tidak ditemukan.');
					const nextActive = actor.role === 'admin' ? active : target.isActive;
					await tx
						.update(suppliers)
						.set({ name, contactName, phone, email, address, isActive: nextActive })
						.where(eq(suppliers.id, id));
					await writeAudit(tx, actor, {
						module: 'masterdata',
						action: 'masterdata_updated',
						recordId: String(id),
						previousValue: { name: target.name, isActive: target.isActive },
						newValue: { name, contactName, phone, email, address, isActive: nextActive }
					});
					return id;
				});
			}
			case 'model': {
				const name = text(values, 'name', 'Nama model', true);
				const categoryId = numberOrNull(values, 'categoryId', 'Kategori aset', true);
				const brandId = numberOrNull(values, 'brandId', 'Brand', true);
				return await db.transaction(async (tx) => {
					if (id === null) {
						const [created] = await tx
							.insert(assetModels)
							.values({ name, categoryId: categoryId!, brandId: brandId!, isActive: active })
							.returning({ id: assetModels.id });
						await writeAudit(tx, actor, {
							module: 'masterdata',
							action: 'masterdata_created',
							recordId: String(created.id),
							newValue: { name, categoryId, brandId, isActive: active }
						});
						return created.id;
					}
					const [target] = await tx
						.select()
						.from(assetModels)
						.where(eq(assetModels.id, id))
						.limit(1);
					if (!target) throw new DomainError('TIDAK_DITEMUKAN', 'Data tidak ditemukan.');
					const nextActive = actor.role === 'admin' ? active : target.isActive;
					await tx
						.update(assetModels)
						.set({ name, categoryId: categoryId!, brandId: brandId!, isActive: nextActive })
						.where(eq(assetModels.id, id));
					await writeAudit(tx, actor, {
						module: 'masterdata',
						action: 'masterdata_updated',
						recordId: String(id),
						previousValue: {
							name: target.name,
							categoryId: target.categoryId,
							brandId: target.brandId,
							isActive: target.isActive
						},
						newValue: { name, categoryId, brandId, isActive: nextActive }
					});
					return id;
				});
			}
			case 'department': {
				const name = text(values, 'name', 'Nama department', true);
				const outletId = numberOrNull(values, 'outletId', 'Outlet', true);
				return await db.transaction(async (tx) => {
					if (id === null) {
						const [created] = await tx
							.insert(departments)
							.values({ name, outletId: outletId!, isActive: active })
							.returning({ id: departments.id });
						await writeAudit(tx, actor, {
							module: 'masterdata',
							action: 'masterdata_created',
							recordId: String(created.id),
							newValue: { name, outletId, isActive: active }
						});
						return created.id;
					}
					const [target] = await tx
						.select()
						.from(departments)
						.where(eq(departments.id, id))
						.limit(1);
					if (!target) throw new DomainError('TIDAK_DITEMUKAN', 'Data tidak ditemukan.');
					const nextActive = actor.role === 'admin' ? active : target.isActive;
					await tx
						.update(departments)
						.set({ name, outletId: outletId!, isActive: nextActive })
						.where(eq(departments.id, id));
					await writeAudit(tx, actor, {
						module: 'masterdata',
						action: 'masterdata_updated',
						recordId: String(id),
						previousValue: {
							name: target.name,
							outletId: target.outletId,
							isActive: target.isActive
						},
						newValue: { name, outletId, isActive: nextActive }
					});
					return id;
				});
			}
			case 'outlet': {
				const code = text(values, 'code', 'Kode outlet', true);
				const name = text(values, 'name', 'Nama outlet', true);
				const isHeadOffice = bool(values, 'isHeadOffice');
				const address = text(values, 'address', 'Alamat');
				const phone = text(values, 'phone', 'Telepon');
				return await db.transaction(async (tx) => {
					if (id === null) {
						const [created] = await tx
							.insert(outlets)
							.values({ code, name, isHeadOffice, address, phone, isActive: active })
							.returning({ id: outlets.id });
						await writeAudit(tx, actor, {
							module: 'masterdata',
							action: 'masterdata_created',
							recordId: String(created.id),
							newValue: { code, name, isHeadOffice, address, phone, isActive: active }
						});
						return created.id;
					}
					const [target] = await tx.select().from(outlets).where(eq(outlets.id, id)).limit(1);
					if (!target) throw new DomainError('TIDAK_DITEMUKAN', 'Data tidak ditemukan.');
					const nextActive = actor.role === 'admin' ? active : target.isActive;
					await tx
						.update(outlets)
						.set({ code, name, isHeadOffice, address, phone, isActive: nextActive })
						.where(eq(outlets.id, id));
					await writeAudit(tx, actor, {
						module: 'masterdata',
						action: 'masterdata_updated',
						recordId: String(id),
						previousValue: {
							code: target.code,
							name: target.name,
							isHeadOffice: target.isHeadOffice,
							isActive: target.isActive
						},
						newValue: { code, name, isHeadOffice, address, phone, isActive: nextActive }
					});
					return id;
				});
			}
			case 'location': {
				const outletId = numberOrNull(values, 'outletId', 'Outlet', true);
				const parentId = numberOrNull(values, 'parentId', 'Lokasi induk');
				const code = text(values, 'code', 'Kode lokasi', true);
				const name = text(values, 'name', 'Nama lokasi', true);
				if (id !== null && parentId === id) {
					throw new DomainError('VALIDASI', 'Lokasi tidak dapat menjadi induk dirinya sendiri.');
				}
				return await db.transaction(async (tx) => {
					if (id === null) {
						const [created] = await tx
							.insert(locations)
							.values({ outletId: outletId!, parentId, code, name, isActive: active })
							.returning({ id: locations.id });
						await writeAudit(tx, actor, {
							module: 'masterdata',
							action: 'masterdata_created',
							recordId: String(created.id),
							newValue: { outletId, parentId, code, name, isActive: active }
						});
						return created.id;
					}
					const [target] = await tx.select().from(locations).where(eq(locations.id, id)).limit(1);
					if (!target) throw new DomainError('TIDAK_DITEMUKAN', 'Data tidak ditemukan.');
					const nextActive = actor.role === 'admin' ? active : target.isActive;
					await tx
						.update(locations)
						.set({ outletId: outletId!, parentId, code, name, isActive: nextActive })
						.where(eq(locations.id, id));
					await writeAudit(tx, actor, {
						module: 'masterdata',
						action: 'masterdata_updated',
						recordId: String(id),
						previousValue: {
							code: target.code,
							name: target.name,
							outletId: target.outletId,
							parentId: target.parentId,
							isActive: target.isActive
						},
						newValue: { outletId, parentId, code, name, isActive: nextActive }
					});
					return id;
				});
			}
			case 'employee': {
				const employeeCode = text(values, 'employeeCode', 'Kode employee', true);
				const fullName = text(values, 'fullName', 'Nama lengkap', true);
				const email = text(values, 'email', 'Email');
				const phone = text(values, 'phone', 'Telepon');
				const outletId = numberOrNull(values, 'outletId', 'Outlet', true);
				const departmentId = numberOrNull(values, 'departmentId', 'Department');
				return await db.transaction(async (tx) => {
					if (id === null) {
						const [created] = await tx
							.insert(employees)
							.values({
								employeeCode,
								fullName,
								email,
								phone,
								outletId: outletId!,
								departmentId,
								isActive: active
							})
							.returning({ id: employees.id });
						await writeAudit(tx, actor, {
							module: 'masterdata',
							action: 'masterdata_created',
							recordId: String(created.id),
							newValue: {
								employeeCode,
								fullName,
								email,
								phone,
								outletId,
								departmentId,
								isActive: active
							}
						});
						return created.id;
					}
					const [target] = await tx.select().from(employees).where(eq(employees.id, id)).limit(1);
					if (!target) throw new DomainError('TIDAK_DITEMUKAN', 'Data tidak ditemukan.');
					const nextActive = actor.role === 'admin' ? active : target.isActive;
					await tx
						.update(employees)
						.set({
							employeeCode,
							fullName,
							email,
							phone,
							outletId: outletId!,
							departmentId,
							isActive: nextActive
						})
						.where(eq(employees.id, id));
					await writeAudit(tx, actor, {
						module: 'masterdata',
						action: 'masterdata_updated',
						recordId: String(id),
						previousValue: {
							employeeCode: target.employeeCode,
							fullName: target.fullName,
							isActive: target.isActive
						},
						newValue: {
							employeeCode,
							fullName,
							email,
							phone,
							outletId,
							departmentId,
							isActive: nextActive
						}
					});
					return id;
				});
			}
			case 'asset-status':
				throw new DomainError(
					'DILARANG',
					'Asset Status adalah nilai sistem dan tidak dapat diubah.'
				);
		}
	} catch (error) {
		if (isUniqueViolation(error)) throw duplicateError();
		throw error;
	}
}

export async function deactivateMasterData(
	actor: AuthUser,
	type: string,
	id: number
): Promise<void> {
	const meta = getMasterMeta(type);
	assertCan(actor, 'masterdata:deactivate');
	if (!meta.canDeactivate) {
		throw new DomainError('DILARANG', 'Master data ini tidak dapat dinonaktifkan.');
	}

	try {
		await db.transaction(async (tx) => {
			switch (meta.type) {
				case 'asset-category':
				case 'inventory-category':
				case 'brand':
				case 'asset-condition': {
					const table =
						meta.type === 'asset-category'
							? assetCategories
							: meta.type === 'inventory-category'
								? inventoryCategories
								: meta.type === 'brand'
									? brands
									: assetConditions;
					const [target] = await tx.select().from(table).where(eq(table.id, id)).limit(1);
					if (!target) throw new DomainError('TIDAK_DITEMUKAN', 'Data tidak ditemukan.');
					await tx.update(table).set({ isActive: false }).where(eq(table.id, id));
					await writeAudit(tx, actor, {
						module: 'masterdata',
						action: 'masterdata_deactivated',
						recordId: String(id),
						previousValue: { isActive: target.isActive },
						newValue: { isActive: false }
					});
					return;
				}
				case 'unit': {
					const [target] = await tx.select().from(units).where(eq(units.id, id)).limit(1);
					if (!target) throw new DomainError('TIDAK_DITEMUKAN', 'Data tidak ditemukan.');
					await tx.update(units).set({ isActive: false }).where(eq(units.id, id));
					await writeAudit(tx, actor, {
						module: 'masterdata',
						action: 'masterdata_deactivated',
						recordId: String(id),
						newValue: { isActive: false }
					});
					return;
				}
				case 'supplier': {
					const [target] = await tx.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
					if (!target) throw new DomainError('TIDAK_DITEMUKAN', 'Data tidak ditemukan.');
					await tx.update(suppliers).set({ isActive: false }).where(eq(suppliers.id, id));
					await writeAudit(tx, actor, {
						module: 'masterdata',
						action: 'masterdata_deactivated',
						recordId: String(id),
						newValue: { isActive: false }
					});
					return;
				}
				case 'model': {
					const [target] = await tx
						.select()
						.from(assetModels)
						.where(eq(assetModels.id, id))
						.limit(1);
					if (!target) throw new DomainError('TIDAK_DITEMUKAN', 'Data tidak ditemukan.');
					await tx.update(assetModels).set({ isActive: false }).where(eq(assetModels.id, id));
					await writeAudit(tx, actor, {
						module: 'masterdata',
						action: 'masterdata_deactivated',
						recordId: String(id),
						newValue: { isActive: false }
					});
					return;
				}
				case 'department': {
					const [target] = await tx
						.select()
						.from(departments)
						.where(eq(departments.id, id))
						.limit(1);
					if (!target) throw new DomainError('TIDAK_DITEMUKAN', 'Data tidak ditemukan.');
					await tx.update(departments).set({ isActive: false }).where(eq(departments.id, id));
					await writeAudit(tx, actor, {
						module: 'masterdata',
						action: 'masterdata_deactivated',
						recordId: String(id),
						newValue: { isActive: false }
					});
					return;
				}
				case 'outlet': {
					const [target] = await tx.select().from(outlets).where(eq(outlets.id, id)).limit(1);
					if (!target) throw new DomainError('TIDAK_DITEMUKAN', 'Data tidak ditemukan.');
					await tx.update(outlets).set({ isActive: false }).where(eq(outlets.id, id));
					await writeAudit(tx, actor, {
						module: 'masterdata',
						action: 'masterdata_deactivated',
						recordId: String(id),
						newValue: { isActive: false }
					});
					return;
				}
				case 'location': {
					const [target] = await tx.select().from(locations).where(eq(locations.id, id)).limit(1);
					if (!target) throw new DomainError('TIDAK_DITEMUKAN', 'Data tidak ditemukan.');
					await tx.update(locations).set({ isActive: false }).where(eq(locations.id, id));
					await writeAudit(tx, actor, {
						module: 'masterdata',
						action: 'masterdata_deactivated',
						recordId: String(id),
						newValue: { isActive: false }
					});
					return;
				}
				case 'employee': {
					const [target] = await tx.select().from(employees).where(eq(employees.id, id)).limit(1);
					if (!target) throw new DomainError('TIDAK_DITEMUKAN', 'Data tidak ditemukan.');
					await tx.update(employees).set({ isActive: false }).where(eq(employees.id, id));
					await writeAudit(tx, actor, {
						module: 'masterdata',
						action: 'masterdata_deactivated',
						recordId: String(id),
						newValue: { isActive: false }
					});
					return;
				}
				case 'asset-status':
					throw new DomainError('DILARANG', 'Asset Status tidak dapat dinonaktifkan.');
			}
		});
	} catch (error) {
		if (isUniqueViolation(error)) throw duplicateError();
		throw error;
	}
}

export async function getMasterOverview(actor: AuthUser): Promise<MasterOverviewModule[]> {
	assertCan(actor, 'masterdata:read');

	const countFor = async (type: MasterType): Promise<number> => {
		switch (type) {
			case 'asset-category': {
				const [row] = await db.select({ value: sql<number>`count(*)::int` }).from(assetCategories);
				return row.value;
			}
			case 'inventory-category': {
				const [row] = await db
					.select({ value: sql<number>`count(*)::int` })
					.from(inventoryCategories);
				return row.value;
			}
			case 'brand': {
				const [row] = await db.select({ value: sql<number>`count(*)::int` }).from(brands);
				return row.value;
			}
			case 'asset-condition': {
				const [row] = await db.select({ value: sql<number>`count(*)::int` }).from(assetConditions);
				return row.value;
			}
			case 'unit': {
				const [row] = await db.select({ value: sql<number>`count(*)::int` }).from(units);
				return row.value;
			}
			case 'supplier': {
				const [row] = await db.select({ value: sql<number>`count(*)::int` }).from(suppliers);
				return row.value;
			}
			case 'model': {
				const [row] = await db.select({ value: sql<number>`count(*)::int` }).from(assetModels);
				return row.value;
			}
			case 'department': {
				const [row] = await db.select({ value: sql<number>`count(*)::int` }).from(departments);
				return row.value;
			}
			case 'outlet': {
				const [row] = await db.select({ value: sql<number>`count(*)::int` }).from(outlets);
				return row.value;
			}
			case 'location': {
				const [row] = await db.select({ value: sql<number>`count(*)::int` }).from(locations);
				return row.value;
			}
			case 'employee': {
				const [row] = await db.select({ value: sql<number>`count(*)::int` }).from(employees);
				return row.value;
			}
			case 'asset-status':
				return assetStatusEnum.enumValues.length;
		}
	};

	const modules: MasterOverviewModule[] = [];
	for (const meta of Object.values(MASTER_TYPES)) {
		if (actor.role === 'support' && !meta.supportCanWrite) continue;
		modules.push({
			type: meta.type,
			label: meta.label,
			description: meta.description,
			group: meta.group,
			count: await countFor(meta.type),
			href: `/admin/master-data/${meta.type}`
		});
	}

	if (actor.role !== 'outlet') {
		const [inventoryCount] = await db
			.select({ value: sql<number>`count(*)::int` })
			.from(inventoryItems);
		modules.push({
			type: 'inventory-item',
			label: 'Item Inventory',
			description: 'Item inventory dan stok per lokasi.',
			group: 'Inventory',
			count: inventoryCount.value,
			href: '/inventory'
		});
	}

	const groupOrder = ['Aset', 'Inventory', 'Organisasi', 'Vendor', 'Sistem'];
	return modules.sort(
		(a, b) =>
			groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group) || a.label.localeCompare(b.label)
	);
}
