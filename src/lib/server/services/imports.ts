import { randomUUID } from 'node:crypto';
import ExcelJS from 'exceljs';
import { asc, desc, eq, sql } from 'drizzle-orm';
import { writeAudit } from '#lib/server/audit.js';
import { assertCan } from '#lib/server/auth/permissions.js';
import type { AuthUser } from '#lib/server/auth/session.js';
import { db } from '#lib/server/db/index.js';
import {
	assetCategories,
	assetConditions,
	assetModels,
	assets,
	brands,
	departments,
	employees,
	importBatchRows,
	importBatches,
	inventoryCategories,
	inventoryItems,
	locations,
	outlets,
	stockBalances,
	stockDocuments,
	stockTransactions,
	units,
	users
} from '#lib/server/db/schema/index.js';
import { DomainError } from '#lib/server/errors.js';

export type ImportTypeKey =
	'location' | 'employee' | 'asset' | 'inventory-item' | 'opening-balance';

export type ImportColumn = {
	key: string;
	label: string;
	required?: boolean;
	note?: string;
};

export type ImportTypeDefinition = {
	key: ImportTypeKey;
	label: string;
	description: string;
	columns: ImportColumn[];
	rules: string[];
	sample: Record<string, string>;
};

export type ImportStatus = 'completed' | 'partial' | 'failed';
export type ImportRowStatus = 'imported' | 'failed';

export const IMPORT_STATUS_LABEL: Record<ImportStatus, string> = {
	completed: 'Berhasil',
	partial: 'Sebagian berhasil',
	failed: 'Gagal'
};

export const IMPORT_STATUS_TONE: Record<ImportStatus, 'success' | 'warning' | 'danger'> = {
	completed: 'success',
	partial: 'warning',
	failed: 'danger'
};

const TYPE_LABEL: Record<ImportTypeKey, string> = {
	location: 'Lokasi',
	employee: 'Karyawan',
	asset: 'Aset',
	'inventory-item': 'Item Inventory',
	'opening-balance': 'Saldo Awal Stok'
};

export const IMPORT_TYPES: ImportTypeDefinition[] = [
	{
		key: 'location',
		label: 'Lokasi',
		description: 'Menambahkan lokasi baru pada outlet yang sudah terdaftar.',
		columns: [
			{ key: 'outlet_code', label: 'Outlet Code', required: true, note: 'Kode outlet, mis. HO' },
			{ key: 'code', label: 'Location Code', required: true, note: 'Unik per outlet' },
			{ key: 'name', label: 'Nama Lokasi', required: true },
			{ key: 'is_active', label: 'Aktif', note: 'TRUE/FALSE, default TRUE' }
		],
		rules: [
			'Outlet Code harus sudah ada di sistem.',
			'Location Code tidak boleh duplikat di outlet yang sama.',
			'Baris dengan kode duplikat akan dilewati.'
		],
		sample: {
			outlet_code: 'HO',
			code: 'HO-QA',
			name: 'QA Room',
			is_active: 'TRUE'
		}
	},
	{
		key: 'employee',
		label: 'Karyawan',
		description: 'Menambahkan data karyawan untuk kebutuhan penempatan aset.',
		columns: [
			{ key: 'employee_code', label: 'Employee Code', required: true, note: 'Unik' },
			{ key: 'full_name', label: 'Nama Lengkap', required: true },
			{ key: 'email', label: 'Email', note: 'Opsional, format email' },
			{ key: 'phone', label: 'Telepon' },
			{ key: 'outlet_code', label: 'Outlet Code', required: true },
			{ key: 'department', label: 'Departemen', note: 'Harus ada di outlet yang sama' },
			{ key: 'is_active', label: 'Aktif', note: 'TRUE/FALSE, default TRUE' }
		],
		rules: [
			'Employee Code harus unik dan belum terdaftar.',
			'Outlet Code harus sudah ada.',
			'Departemen (jika diisi) harus terdaftar pada outlet tersebut.'
		],
		sample: {
			employee_code: 'EMP-QA-001',
			full_name: 'QA Karyawan',
			email: 'qa.karyawan@example.local',
			phone: '0812000000',
			outlet_code: 'HO',
			department: 'IT',
			is_active: 'TRUE'
		}
	},
	{
		key: 'asset',
		label: 'Aset',
		description: 'Menambahkan aset baru beserta kategori, lokasi, dan kondisinya.',
		columns: [
			{ key: 'asset_code', label: 'Asset Code', required: true, note: 'Unik' },
			{ key: 'name', label: 'Nama Aset', required: true },
			{ key: 'category', label: 'Kategori', required: true, note: 'Nama kategori aset' },
			{ key: 'outlet_code', label: 'Outlet Code', required: true },
			{
				key: 'location_code',
				label: 'Location Code',
				required: true,
				note: 'Pada outlet tersebut'
			},
			{ key: 'condition', label: 'Kondisi', required: true, note: 'Mis. Baik, Cukup, Rusak' },
			{ key: 'brand', label: 'Brand', note: 'Opsional, harus terdaftar' },
			{ key: 'model', label: 'Model', note: 'Butuh Brand; harus sesuai kategori' },
			{ key: 'serial_number', label: 'Serial Number', note: 'Opsional, unik' },
			{ key: 'purchase_date', label: 'Tanggal Pembelian', note: 'YYYY-MM-DD atau DD/MM/YYYY' },
			{ key: 'warranty_expiration', label: 'Garansi Berakhir', note: 'YYYY-MM-DD atau DD/MM/YYYY' },
			{ key: 'acquisition_cost', label: 'Nilai Perolehan', note: 'Angka, tanpa simbol mata uang' },
			{ key: 'description', label: 'Keterangan' }
		],
		rules: [
			'Kategori, lokasi, dan kondisi harus sudah terdaftar.',
			'Asset Code dan Serial Number tidak boleh duplikat.',
			'Model harus memiliki Brand dan sesuai dengan kategori aset.',
			'Status awal aset yang diimpor adalah Available.'
		],
		sample: {
			asset_code: 'AST-QA-001',
			name: 'QA Laptop',
			category: 'Laptop',
			outlet_code: 'HO',
			location_code: 'HO-IT',
			condition: 'Baik',
			brand: 'HP',
			model: 'HP ProBook 450',
			serial_number: 'QA-SN-001',
			purchase_date: '2026-01-15',
			warranty_expiration: '2027-01-15',
			acquisition_cost: '12000000',
			description: 'Contoh baris template'
		}
	},
	{
		key: 'inventory-item',
		label: 'Item Inventory',
		description: 'Menambahkan item inventory baru beserta kategori dan satuannya.',
		columns: [
			{ key: 'item_code', label: 'Item Code', required: true, note: 'Unik' },
			{ key: 'name', label: 'Nama Item', required: true },
			{ key: 'category', label: 'Kategori', required: true, note: 'Nama kategori inventory' },
			{ key: 'unit', label: 'Satuan', required: true, note: 'Nama atau singkatan satuan' },
			{ key: 'brand', label: 'Brand', note: 'Opsional, harus terdaftar' },
			{ key: 'description', label: 'Keterangan' },
			{ key: 'is_active', label: 'Aktif', note: 'TRUE/FALSE, default TRUE' }
		],
		rules: [
			'Kategori inventory dan satuan harus sudah terdaftar.',
			'Item Code tidak boleh duplikat.',
			'Brand (jika diisi) harus terdaftar.'
		],
		sample: {
			item_code: 'INV-QA-001',
			name: 'QA Kabel LAN',
			category: 'Computer Components',
			unit: 'pcs',
			brand: 'TP-Link',
			description: 'Contoh baris template',
			is_active: 'TRUE'
		}
	},
	{
		key: 'opening-balance',
		label: 'Saldo Awal Stok',
		description: 'Mencatat saldo awal item inventory pada satu lokasi.',
		columns: [
			{ key: 'item_code', label: 'Item Code', required: true },
			{ key: 'outlet_code', label: 'Outlet Code', required: true },
			{ key: 'location_code', label: 'Location Code', required: true },
			{ key: 'qty', label: 'Qty', required: true, note: 'Bilangan bulat lebih dari 0' },
			{ key: 'min_stock', label: 'Min Stock', note: 'Opsional, bilangan bulat >= 0' }
		],
		rules: [
			'Item, outlet, dan lokasi harus sudah terdaftar.',
			'Saldo untuk kombinasi item + lokasi tidak boleh sudah ada.',
			'Setiap baris membuat transaksi Saldo Awal (opening balance) pada ledger stok.'
		],
		sample: {
			item_code: 'INV-QA-001',
			outlet_code: 'HO',
			location_code: 'HO-IT',
			qty: '10',
			min_stock: '2'
		}
	}
];

export function getImportType(key: string): ImportTypeDefinition | null {
	return IMPORT_TYPES.find((entry) => entry.key === key) ?? null;
}

export function importTypeLabel(key: string): string {
	return TYPE_LABEL[key as ImportTypeKey] ?? key;
}

function requireImportType(key: string): ImportTypeDefinition {
	const definition = getImportType(key);
	if (!definition) throw new DomainError('TIDAK_DITEMUKAN', 'Jenis impor tidak ditemukan.');
	return definition;
}

function assertImportAccess(actor: AuthUser): void {
	if (actor.role === 'outlet') {
		throw new DomainError('DILARANG', 'Anda tidak punya akses ke modul impor.');
	}
	assertCan(actor, 'import:write');
}

export function requireImportAccess(actor: AuthUser): void {
	assertImportAccess(actor);
}

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('id-ID', {
	dateStyle: 'medium',
	timeStyle: 'short',
	timeZone: 'Asia/Jakarta'
});

function formatDateTime(value: Date): string {
	return DATE_TIME_FORMAT.format(value);
}

function canonical(value: string): string {
	return value
		.toLowerCase()
		.replace(/\*/g, '')
		.replace(/[^a-z0-9]/g, '');
}

function normalizeHeader(value: string): string {
	return canonical(value);
}

function clean(value: unknown): string {
	return value === null || value === undefined ? '' : String(value).trim();
}

export type RawImportRow = { rowNumber: number; values: Record<string, string> };

export type ParsedImportFile = {
	fileName: string;
	rows: RawImportRow[];
};

function parseCsvRows(text: string): string[][] {
	const content = text.replace(/^\uFEFF/, '');
	const firstLine = content.split(/\r?\n/, 1)[0] ?? '';
	let commas = 0;
	let semicolons = 0;
	let quoted = false;
	for (const char of firstLine) {
		if (char === '"') quoted = !quoted;
		else if (!quoted && char === ',') commas += 1;
		else if (!quoted && char === ';') semicolons += 1;
	}
	const delimiter = semicolons > commas ? ';' : ',';

	const rows: string[][] = [];
	let row: string[] = [];
	let field = '';
	let inQuotes = false;

	for (let index = 0; index < content.length; index += 1) {
		const char = content[index];
		if (inQuotes) {
			if (char === '"') {
				if (content[index + 1] === '"') {
					field += '"';
					index += 1;
				} else {
					inQuotes = false;
				}
			} else {
				field += char;
			}
			continue;
		}
		if (char === '"') {
			inQuotes = true;
		} else if (char === delimiter) {
			row.push(field);
			field = '';
		} else if (char === '\n') {
			row.push(field);
			rows.push(row);
			row = [];
			field = '';
		} else if (char === '\r') {
			continue;
		} else {
			field += char;
		}
	}

	if (field.length > 0 || row.length > 0) {
		row.push(field);
		rows.push(row);
	}

	return rows;
}

function excelCellText(value: ExcelJS.CellValue): string {
	if (value === null || value === undefined) return '';
	if (value instanceof Date) {
		return value.toISOString().slice(0, 10);
	}
	if (typeof value === 'object') {
		const record = value as unknown as Record<string, unknown>;
		if (typeof record.text === 'string') return record.text;
		if (record.result !== undefined && record.result !== null) return String(record.result);
		if (Array.isArray(record.richText)) {
			return record.richText
				.map((part) => (part && typeof part === 'object' ? String(part.text ?? '') : ''))
				.join('');
		}
		return '';
	}
	return String(value);
}

function mapRows(definition: ImportTypeDefinition, matrix: string[][]): RawImportRow[] {
	let headerIndex = -1;
	for (let index = 0; index < matrix.length; index += 1) {
		if (matrix[index].some((cell) => clean(cell) !== '')) {
			headerIndex = index;
			break;
		}
	}
	if (headerIndex < 0) {
		throw new DomainError('IMPOR_INVALID', 'File kosong. Tidak ada header yang ditemukan.');
	}

	const lookup = new Map<string, string>();
	for (const column of definition.columns) {
		lookup.set(normalizeHeader(column.key), column.key);
		lookup.set(normalizeHeader(column.label), column.key);
	}

	const header = matrix[headerIndex];
	const mapped: (string | null)[] = [];
	const unknown: string[] = [];
	for (const cell of header) {
		const label = clean(cell);
		if (!label) {
			mapped.push(null);
			continue;
		}
		const key = lookup.get(normalizeHeader(label));
		if (key) {
			mapped.push(key);
		} else {
			mapped.push(null);
			unknown.push(label);
		}
	}

	if (unknown.length > 0) {
		throw new DomainError(
			'IMPOR_INVALID',
			`Header tidak dikenal: ${unknown.join(', ')}. Gunakan template terbaru.`
		);
	}

	const requiredColumns = definition.columns.filter((column) => column.required);
	const present = new Set(mapped.filter((entry): entry is string => Boolean(entry)));
	const missing = requiredColumns.filter((column) => !present.has(column.key));
	if (missing.length > 0) {
		throw new DomainError(
			'IMPOR_INVALID',
			`Kolom wajib belum ada: ${missing.map((column) => column.label).join(', ')}.`
		);
	}

	const rows: RawImportRow[] = [];
	for (let index = headerIndex + 1; index < matrix.length; index += 1) {
		const cells = matrix[index];
		if (!cells.some((cell) => clean(cell) !== '')) continue;
		const values: Record<string, string> = {};
		for (const column of definition.columns) {
			values[column.key] = '';
		}
		for (let position = 0; position < mapped.length; position += 1) {
			const key = mapped[position];
			if (!key) continue;
			values[key] = clean(cells[position]);
		}
		rows.push({ rowNumber: index + 1, values });
	}

	if (rows.length === 0) {
		throw new DomainError('IMPOR_INVALID', 'File tidak memiliki baris data.');
	}
	if (rows.length > 2000) {
		throw new DomainError('IMPOR_INVALID', 'Maksimal 2.000 baris per file impor.');
	}
	return rows;
}

export async function parseImportFile(
	definition: ImportTypeDefinition,
	fileName: string,
	buffer: Buffer
): Promise<ParsedImportFile> {
	const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
	if (extension !== 'csv' && extension !== 'xlsx') {
		throw new DomainError('IMPOR_INVALID', 'Format file harus .csv atau .xlsx.');
	}
	if (buffer.length === 0) {
		throw new DomainError('IMPOR_INVALID', 'File kosong.');
	}
	if (buffer.length > 5 * 1024 * 1024) {
		throw new DomainError('IMPOR_INVALID', 'Ukuran file maksimal 5 MB.');
	}

	let matrix: string[][];
	if (extension === 'csv') {
		const text = new TextDecoder('utf-8').decode(buffer);
		matrix = parseCsvRows(text);
	} else {
		const workbook = new ExcelJS.Workbook();
		await workbook.xlsx.load(buffer as never);
		const sheet = workbook.worksheets[0];
		if (!sheet) {
			throw new DomainError('IMPOR_INVALID', 'File Excel tidak memiliki worksheet.');
		}
		matrix = [];
		sheet.eachRow({ includeEmpty: false }, (row) => {
			const values: string[] = [];
			for (let column = 1; column <= row.cellCount; column += 1) {
				values.push(excelCellText(row.getCell(column).value));
			}
			matrix.push(values);
		});
	}

	return { fileName, rows: mapRows(definition, matrix) };
}

type ResolvedRow =
	| {
			kind: 'location';
			outletId: number;
			code: string;
			name: string;
			isActive: boolean;
	  }
	| {
			kind: 'employee';
			employeeCode: string;
			fullName: string;
			email: string | null;
			phone: string | null;
			outletId: number;
			departmentId: number | null;
			isActive: boolean;
	  }
	| {
			kind: 'asset';
			assetCode: string;
			name: string;
			categoryId: number;
			locationId: number;
			conditionId: number;
			brandId: number | null;
			modelId: number | null;
			serialNumber: string | null;
			purchaseDate: string | null;
			warrantyExpiration: string | null;
			acquisitionCost: string | null;
			description: string | null;
	  }
	| {
			kind: 'inventory-item';
			itemCode: string;
			name: string;
			categoryId: number;
			unitId: number;
			brandId: number | null;
			description: string | null;
			isActive: boolean;
	  }
	| {
			kind: 'opening-balance';
			itemId: number;
			locationId: number;
			qty: number;
			minStock: number | null;
	  };

export type ValidatedImportRow = {
	rowNumber: number;
	values: Record<string, string>;
	errors: string[];
	resolved: ResolvedRow | null;
};

type ReferenceData = {
	outletByCode: Map<string, number>;
	locationByKey: Map<string, number>;
	departmentByKey: Map<string, number>;
	assetCategoryByName: Map<string, number>;
	assetConditionByName: Map<string, number>;
	brandByName: Map<string, number>;
	modelByKey: Map<string, { id: number; categoryId: number }>;
	inventoryCategoryByName: Map<string, number>;
	unitByKey: Map<string, number>;
	itemByCode: Map<string, number>;
	existingLocationKeys: Set<string>;
	existingEmployeeCodes: Set<string>;
	existingAssetCodes: Set<string>;
	existingAssetSerials: Set<string>;
	existingItemCodes: Set<string>;
	existingBalanceKeys: Set<string>;
};

async function loadReferenceData(): Promise<ReferenceData> {
	const [
		outletRows,
		locationRows,
		departmentRows,
		assetCategoryRows,
		assetConditionRows,
		brandRows,
		modelRows,
		inventoryCategoryRows,
		unitRows,
		itemRows,
		assetRows,
		employeeRows,
		balanceRows
	] = await Promise.all([
		db.select({ id: outlets.id, code: outlets.code }).from(outlets),
		db
			.select({ id: locations.id, outletId: locations.outletId, code: locations.code })
			.from(locations),
		db
			.select({ id: departments.id, outletId: departments.outletId, name: departments.name })
			.from(departments),
		db.select({ id: assetCategories.id, name: assetCategories.name }).from(assetCategories),
		db.select({ id: assetConditions.id, name: assetConditions.name }).from(assetConditions),
		db.select({ id: brands.id, name: brands.name }).from(brands),
		db
			.select({
				id: assetModels.id,
				brandId: assetModels.brandId,
				categoryId: assetModels.categoryId,
				name: assetModels.name
			})
			.from(assetModels),
		db
			.select({ id: inventoryCategories.id, name: inventoryCategories.name })
			.from(inventoryCategories),
		db.select({ id: units.id, name: units.name, abbreviation: units.abbreviation }).from(units),
		db.select({ id: inventoryItems.id, itemCode: inventoryItems.itemCode }).from(inventoryItems),
		db
			.select({
				assetCode: assets.assetCode,
				serialNumber: assets.serialNumber
			})
			.from(assets),
		db.select({ employeeCode: employees.employeeCode }).from(employees),
		db
			.select({ itemId: stockBalances.itemId, locationId: stockBalances.locationId })
			.from(stockBalances)
	]);

	const outletByCode = new Map<string, number>();
	for (const row of outletRows) outletByCode.set(canonical(row.code), row.id);

	const locationByKey = new Map<string, number>();
	const existingLocationKeys = new Set<string>();
	for (const row of locationRows) {
		const key = `${row.outletId}:${canonical(row.code)}`;
		locationByKey.set(key, row.id);
		existingLocationKeys.add(key);
	}

	const departmentByKey = new Map<string, number>();
	for (const row of departmentRows) {
		departmentByKey.set(`${row.outletId}:${canonical(row.name)}`, row.id);
	}

	const assetCategoryByName = new Map<string, number>();
	for (const row of assetCategoryRows) assetCategoryByName.set(canonical(row.name), row.id);

	const assetConditionByName = new Map<string, number>();
	for (const row of assetConditionRows) assetConditionByName.set(canonical(row.name), row.id);

	const brandByName = new Map<string, number>();
	for (const row of brandRows) brandByName.set(canonical(row.name), row.id);

	const modelByKey = new Map<string, { id: number; categoryId: number }>();
	for (const row of modelRows) {
		modelByKey.set(`${row.brandId}:${canonical(row.name)}`, {
			id: row.id,
			categoryId: row.categoryId
		});
	}

	const inventoryCategoryByName = new Map<string, number>();
	for (const row of inventoryCategoryRows) {
		inventoryCategoryByName.set(canonical(row.name), row.id);
	}

	const unitByKey = new Map<string, number>();
	for (const row of unitRows) {
		unitByKey.set(canonical(row.abbreviation), row.id);
		unitByKey.set(canonical(row.name), row.id);
	}

	const itemByCode = new Map<string, number>();
	for (const row of itemRows) itemByCode.set(canonical(row.itemCode), row.id);

	const existingAssetCodes = new Set<string>();
	const existingAssetSerials = new Set<string>();
	for (const row of assetRows) {
		existingAssetCodes.add(canonical(row.assetCode));
		if (row.serialNumber) existingAssetSerials.add(canonical(row.serialNumber));
	}

	const existingEmployeeCodes = new Set<string>();
	for (const row of employeeRows) existingEmployeeCodes.add(canonical(row.employeeCode));

	const existingItemCodes = new Set<string>();
	for (const row of itemRows) existingItemCodes.add(canonical(row.itemCode));

	const existingBalanceKeys = new Set<string>();
	for (const row of balanceRows) existingBalanceKeys.add(`${row.itemId}:${row.locationId}`);

	return {
		outletByCode,
		locationByKey,
		departmentByKey,
		assetCategoryByName,
		assetConditionByName,
		brandByName,
		modelByKey,
		inventoryCategoryByName,
		unitByKey,
		itemByCode,
		existingLocationKeys,
		existingEmployeeCodes,
		existingAssetCodes,
		existingAssetSerials,
		existingItemCodes,
		existingBalanceKeys
	};
}

function integerValue(raw: string): { value?: number; error?: string } {
	if (!raw) return { error: 'wajib diisi' };
	if (!/^\d+$/.test(raw)) return { error: 'harus bilangan bulat' };
	const value = Number(raw);
	if (!Number.isSafeInteger(value)) return { error: 'terlalu besar' };
	return { value };
}

function decimalValue(raw: string): { value?: string; error?: string } {
	if (!raw) return { value: undefined };
	const normalized = raw
		.replace(/\s/g, '')
		.replace(/^Rp/i, '')
		.replace(/[^\d.,-]/g, '');
	let parsed: number;
	if (normalized.includes('.') && normalized.includes(',')) {
		parsed = Number(normalized.replace(/\./g, '').replace(',', '.'));
	} else if (normalized.includes(',')) {
		parsed = Number(normalized.replace(',', '.'));
	} else {
		parsed = Number(normalized);
	}
	if (!Number.isFinite(parsed) || parsed < 0) return { error: 'harus angka >= 0' };
	return { value: parsed.toFixed(2) };
}

function dateValue(raw: string): { value?: string | null; error?: string } {
	if (!raw) return { value: null };
	let year: number;
	let month: number;
	let day: number;
	const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	const local = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
	if (iso) {
		year = Number(iso[1]);
		month = Number(iso[2]);
		day = Number(iso[3]);
	} else if (local) {
		day = Number(local[1]);
		month = Number(local[2]);
		year = Number(local[3]);
	} else {
		return { error: 'format tanggal harus YYYY-MM-DD atau DD/MM/YYYY' };
	}
	const date = new Date(Date.UTC(year, month - 1, day));
	if (
		date.getUTCFullYear() !== year ||
		date.getUTCMonth() !== month - 1 ||
		date.getUTCDate() !== day
	) {
		return { error: 'tanggal tidak valid' };
	}
	return {
		value: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
	};
}

function booleanValue(raw: string): { value?: boolean; error?: string } {
	if (!raw) return { value: true };
	const normalized = canonical(raw);
	if (['true', '1', 'ya', 'yes', 'aktif', 'active'].includes(normalized)) return { value: true };
	if (['false', '0', 'tidak', 'no', 'nonaktif', 'inactive'].includes(normalized)) {
		return { value: false };
	}
	return { error: 'nilai aktif harus TRUE atau FALSE' };
}

function resolveRow(
	type: ImportTypeKey,
	values: Record<string, string>,
	refs: ReferenceData,
	seen: Set<string>
): { errors: string[]; resolved: ResolvedRow | null } {
	const errors: string[] = [];
	const get = (key: string): string => values[key] ?? '';
	const required = (key: string, label: string): string => {
		const value = get(key);
		if (!value) errors.push(`${label} wajib diisi`);
		return value;
	};

	if (type === 'location') {
		const outletCode = required('outlet_code', 'Outlet Code');
		const code = required('code', 'Location Code');
		const name = required('name', 'Nama Lokasi');
		const outletId = outletCode ? refs.outletByCode.get(canonical(outletCode)) : undefined;
		if (outletCode && !outletId) errors.push(`Outlet Code "${outletCode}" tidak dikenal`);
		const active = booleanValue(get('is_active'));
		if (active.error) errors.push(`Aktif: ${active.error}`);

		const key = outletId && code ? `${outletId}:${canonical(code)}` : '';
		if (key && refs.existingLocationKeys.has(key)) {
			errors.push('Location Code sudah digunakan di outlet ini');
		} else if (key && seen.has(key)) {
			errors.push('Location Code duplikat di dalam file');
		}
		if (key) seen.add(key);

		if (errors.length > 0 || !outletId || !code || !name || active.value === undefined) {
			return { errors, resolved: null };
		}
		return {
			errors,
			resolved: {
				kind: 'location',
				outletId,
				code,
				name,
				isActive: active.value
			}
		};
	}

	if (type === 'employee') {
		const employeeCode = required('employee_code', 'Employee Code');
		const fullName = required('full_name', 'Nama Lengkap');
		const outletCode = required('outlet_code', 'Outlet Code');
		const outletId = outletCode ? refs.outletByCode.get(canonical(outletCode)) : undefined;
		if (outletCode && !outletId) errors.push(`Outlet Code "${outletCode}" tidak dikenal`);
		const email = get('email');
		if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			errors.push('Email tidak valid');
		}
		const department = get('department');
		let departmentId: number | null = null;
		if (department) {
			if (!outletId) {
				errors.push('Departemen tidak dapat divalidasi tanpa outlet yang valid');
			} else {
				departmentId = refs.departmentByKey.get(`${outletId}:${canonical(department)}`) ?? null;
				if (!departmentId) errors.push(`Departemen "${department}" tidak dikenal di outlet ini`);
			}
		}
		const active = booleanValue(get('is_active'));
		if (active.error) errors.push(`Aktif: ${active.error}`);

		const key = employeeCode ? canonical(employeeCode) : '';
		if (key && refs.existingEmployeeCodes.has(key)) {
			errors.push('Employee Code sudah terdaftar');
		} else if (key && seen.has(key)) {
			errors.push('Employee Code duplikat di dalam file');
		}
		if (key) seen.add(key);

		if (
			errors.length > 0 ||
			!employeeCode ||
			!fullName ||
			!outletId ||
			active.value === undefined
		) {
			return { errors, resolved: null };
		}
		return {
			errors,
			resolved: {
				kind: 'employee',
				employeeCode,
				fullName,
				email: email || null,
				phone: get('phone') || null,
				outletId,
				departmentId,
				isActive: active.value
			}
		};
	}

	if (type === 'asset') {
		const assetCode = required('asset_code', 'Asset Code');
		const name = required('name', 'Nama Aset');
		const category = required('category', 'Kategori');
		const outletCode = required('outlet_code', 'Outlet Code');
		const locationCode = required('location_code', 'Location Code');
		const condition = required('condition', 'Kondisi');

		const categoryId = category ? refs.assetCategoryByName.get(canonical(category)) : undefined;
		if (category && !categoryId) errors.push(`Kategori "${category}" tidak dikenal`);
		const conditionId = condition ? refs.assetConditionByName.get(canonical(condition)) : undefined;
		if (condition && !conditionId) errors.push(`Kondisi "${condition}" tidak dikenal`);
		const outletId = outletCode ? refs.outletByCode.get(canonical(outletCode)) : undefined;
		if (outletCode && !outletId) errors.push(`Outlet Code "${outletCode}" tidak dikenal`);
		const locationId =
			outletId && locationCode
				? refs.locationByKey.get(`${outletId}:${canonical(locationCode)}`)
				: undefined;
		if (locationCode && !locationId) errors.push(`Location Code "${locationCode}" tidak dikenal`);

		const brand = get('brand');
		const model = get('model');
		let brandId: number | null = null;
		let modelId: number | null = null;
		if (brand) {
			brandId = refs.brandByName.get(canonical(brand)) ?? null;
			if (!brandId) errors.push(`Brand "${brand}" tidak dikenal`);
		}
		if (model) {
			if (!brandId) {
				errors.push('Model membutuhkan Brand yang valid');
			} else {
				const found = refs.modelByKey.get(`${brandId}:${canonical(model)}`);
				if (!found) {
					errors.push(`Model "${model}" tidak dikenal untuk brand tersebut`);
				} else if (categoryId && found.categoryId !== categoryId) {
					errors.push('Model tidak sesuai dengan kategori aset');
				} else {
					modelId = found.id;
				}
			}
		}

		const purchaseDate = dateValue(get('purchase_date'));
		if (purchaseDate.error) errors.push(`Tanggal Pembelian: ${purchaseDate.error}`);
		const warranty = dateValue(get('warranty_expiration'));
		if (warranty.error) errors.push(`Garansi Berakhir: ${warranty.error}`);
		const cost = decimalValue(get('acquisition_cost'));
		if (cost.error) errors.push(`Nilai Perolehan: ${cost.error}`);

		const serial = get('serial_number');
		const codeKey = assetCode ? canonical(assetCode) : '';
		if (codeKey && refs.existingAssetCodes.has(codeKey)) {
			errors.push('Asset Code sudah terdaftar');
		} else if (codeKey && seen.has(`code:${codeKey}`)) {
			errors.push('Asset Code duplikat di dalam file');
		}
		if (codeKey) seen.add(`code:${codeKey}`);
		const serialKey = serial ? canonical(serial) : '';
		if (serialKey && refs.existingAssetSerials.has(serialKey)) {
			errors.push('Serial Number sudah terdaftar');
		} else if (serialKey && seen.has(`serial:${serialKey}`)) {
			errors.push('Serial Number duplikat di dalam file');
		}
		if (serialKey) seen.add(`serial:${serialKey}`);

		if (errors.length > 0 || !assetCode || !name || !categoryId || !locationId || !conditionId) {
			return { errors, resolved: null };
		}
		return {
			errors,
			resolved: {
				kind: 'asset',
				assetCode,
				name,
				categoryId,
				locationId,
				conditionId,
				brandId,
				modelId,
				serialNumber: serial || null,
				purchaseDate: purchaseDate.value ?? null,
				warrantyExpiration: warranty.value ?? null,
				acquisitionCost: cost.value ?? null,
				description: get('description') || null
			}
		};
	}

	if (type === 'inventory-item') {
		const itemCode = required('item_code', 'Item Code');
		const name = required('name', 'Nama Item');
		const category = required('category', 'Kategori');
		const unit = required('unit', 'Satuan');
		const categoryId = category ? refs.inventoryCategoryByName.get(canonical(category)) : undefined;
		if (category && !categoryId) errors.push(`Kategori "${category}" tidak dikenal`);
		const unitId = unit ? refs.unitByKey.get(canonical(unit)) : undefined;
		if (unit && !unitId) errors.push(`Satuan "${unit}" tidak dikenal`);
		const brand = get('brand');
		let brandId: number | null = null;
		if (brand) {
			brandId = refs.brandByName.get(canonical(brand)) ?? null;
			if (!brandId) errors.push(`Brand "${brand}" tidak dikenal`);
		}
		const active = booleanValue(get('is_active'));
		if (active.error) errors.push(`Aktif: ${active.error}`);

		const key = itemCode ? canonical(itemCode) : '';
		if (key && refs.existingItemCodes.has(key)) {
			errors.push('Item Code sudah terdaftar');
		} else if (key && seen.has(key)) {
			errors.push('Item Code duplikat di dalam file');
		}
		if (key) seen.add(key);

		if (
			errors.length > 0 ||
			!itemCode ||
			!name ||
			!categoryId ||
			!unitId ||
			active.value === undefined
		) {
			return { errors, resolved: null };
		}
		return {
			errors,
			resolved: {
				kind: 'inventory-item',
				itemCode,
				name,
				categoryId,
				unitId,
				brandId,
				description: get('description') || null,
				isActive: active.value
			}
		};
	}

	const itemCode = required('item_code', 'Item Code');
	const outletCode = required('outlet_code', 'Outlet Code');
	const locationCode = required('location_code', 'Location Code');
	const qtyRaw = required('qty', 'Qty');
	const itemId = itemCode ? refs.itemByCode.get(canonical(itemCode)) : undefined;
	if (itemCode && !itemId) errors.push(`Item Code "${itemCode}" tidak dikenal`);
	const outletId = outletCode ? refs.outletByCode.get(canonical(outletCode)) : undefined;
	if (outletCode && !outletId) errors.push(`Outlet Code "${outletCode}" tidak dikenal`);
	const locationId =
		outletId && locationCode
			? refs.locationByKey.get(`${outletId}:${canonical(locationCode)}`)
			: undefined;
	if (locationCode && !locationId) errors.push(`Location Code "${locationCode}" tidak dikenal`);
	const qty = integerValue(qtyRaw);
	if (qty.error) errors.push(`Qty ${qty.error}`);
	else if ((qty.value ?? 0) <= 0) errors.push('Qty harus lebih dari 0');
	const minStockRaw = get('min_stock');
	const minStock = minStockRaw ? integerValue(minStockRaw) : { value: undefined };
	if (minStock.error) errors.push(`Min Stock ${minStock.error}`);

	const key = itemId && locationId ? `${itemId}:${locationId}` : '';
	if (key && refs.existingBalanceKeys.has(key)) {
		errors.push('Saldo untuk item dan lokasi ini sudah ada');
	} else if (key && seen.has(key)) {
		errors.push('Saldo item + lokasi duplikat di dalam file');
	}
	if (key) seen.add(key);

	if (errors.length > 0 || !itemId || !locationId || !qty.value) {
		return { errors, resolved: null };
	}
	return {
		errors,
		resolved: {
			kind: 'opening-balance',
			itemId,
			locationId,
			qty: qty.value,
			minStock: minStock.value ?? null
		}
	};
}

export async function validateImportRows(
	type: ImportTypeKey,
	rows: RawImportRow[]
): Promise<ValidatedImportRow[]> {
	const refs = await loadReferenceData();
	const seen = new Set<string>();
	return rows.map((row) => {
		const result = resolveRow(type, row.values, refs, seen);
		return {
			rowNumber: row.rowNumber,
			values: row.values,
			errors: result.errors,
			resolved: result.resolved
		};
	});
}

type PreviewInternal = {
	token: string;
	userId: number;
	type: ImportTypeKey;
	fileName: string;
	rows: ValidatedImportRow[];
	createdAt: number;
	confirmedBatchId: number | null;
	processing: boolean;
	autoCreate: boolean;
	autoCreated: {
		inventoryCategories: string[];
		units: string[];
		brands: string[];
		assetCategories: string[];
		conditions: string[];
		models: string[];
	};
};

export type ImportPreviewView = {
	token: string;
	fileName: string;
	type: ImportTypeDefinition;
	total: number;
	validCount: number;
	invalidCount: number;
	rows: ValidatedImportRow[];
	autoCreated: {
		inventoryCategories: string[];
		units: string[];
		brands: string[];
		assetCategories: string[];
		conditions: string[];
		models: string[];
	};
};

const PREVIEW_TTL_MS = 30 * 60 * 1000;
const previews = new Map<string, PreviewInternal>();

function purgePreviews(): void {
	const cutoff = Date.now() - PREVIEW_TTL_MS;
	for (const [token, preview] of previews) {
		if (preview.createdAt < cutoff) previews.delete(token);
	}
}

function previewView(preview: PreviewInternal): ImportPreviewView {
	const validCount = preview.rows.filter((row) => row.errors.length === 0).length;
	return {
		token: preview.token,
		fileName: preview.fileName,
		type: requireImportType(preview.type),
		total: preview.rows.length,
		validCount,
		invalidCount: preview.rows.length - validCount,
		rows: preview.rows,
		autoCreated: preview.autoCreated
	};
}

export async function createImportPreview(
	actor: AuthUser,
	type: ImportTypeKey,
	fileName: string,
	rows: RawImportRow[],
	autoCreate = false
): Promise<ImportPreviewView> {
	assertImportAccess(actor);
	const definition = requireImportType(type);

	const autoCreated = autoCreate
		? await autoCreateMissingMasterData(actor, type, rows)
		: {
				inventoryCategories: [] as string[],
				units: [] as string[],
				brands: [] as string[],
				assetCategories: [] as string[],
				conditions: [] as string[],
				models: [] as string[]
			};

	const validated = await validateImportRows(definition.key, rows);
	purgePreviews();
	const token = randomUUID();
	const preview: PreviewInternal = {
		token,
		userId: actor.id,
		type: definition.key,
		fileName,
		rows: validated,
		createdAt: Date.now(),
		confirmedBatchId: null,
		processing: false,
		autoCreate,
		autoCreated
	};
	previews.set(token, preview);
	return previewView(preview);
}

export async function getImportPreview(actor: AuthUser, token: string): Promise<ImportPreviewView> {
	assertImportAccess(actor);
	purgePreviews();
	const preview = previews.get(token);
	if (!preview || preview.userId !== actor.id) {
		throw new DomainError(
			'TIDAK_DITEMUKAN',
			'Sesi pratinjau tidak ditemukan atau sudah kedaluwarsa. Silakan unggah ulang file.'
		);
	}
	return previewView(preview);
}

async function autoCreateMissingMasterData(
	actor: AuthUser,
	type: ImportTypeKey,
	rows: RawImportRow[]
): Promise<{
	inventoryCategories: string[];
	units: string[];
	brands: string[];
	assetCategories: string[];
	conditions: string[];
	models: string[];
}> {
	const refs = await loadReferenceData();
	const created = {
		inventoryCategories: [] as string[],
		units: [] as string[],
		brands: [] as string[],
		assetCategories: [] as string[],
		conditions: [] as string[],
		models: [] as string[]
	};

	const missingInventoryCategories = new Set<string>();
	const missingUnits = new Set<string>();
	const missingBrands = new Set<string>();
	const missingAssetCategories = new Set<string>();
	const missingConditions = new Set<string>();
	const missingModels = new Set<string>();

	for (const row of rows) {
		const values = row.values;
		if (type === 'inventory-item') {
			const category = (values.category ?? '').trim();
			if (category && !refs.inventoryCategoryByName.has(canonical(category))) {
				missingInventoryCategories.add(category);
			}
			const unit = (values.unit ?? '').trim();
			if (unit && !refs.unitByKey.has(canonical(unit))) {
				missingUnits.add(unit);
			}
			const brand = (values.brand ?? '').trim();
			if (brand && !refs.brandByName.has(canonical(brand))) {
				missingBrands.add(brand);
			}
		} else if (type === 'asset') {
			const category = (values.category ?? '').trim();
			if (category && !refs.assetCategoryByName.has(canonical(category))) {
				missingAssetCategories.add(category);
			}
			const condition = (values.condition ?? '').trim();
			if (condition && !refs.assetConditionByName.has(canonical(condition))) {
				missingConditions.add(condition);
			}
			const brand = (values.brand ?? '').trim();
			if (brand && !refs.brandByName.has(canonical(brand))) {
				missingBrands.add(brand);
			}
		}
	}

	await db.transaction(async (tx) => {
		for (const name of missingInventoryCategories) {
			const inserted = await tx
				.insert(inventoryCategories)
				.values({ name, isActive: true })
				.onConflictDoNothing()
				.returning({ id: inventoryCategories.id });
			if (inserted.length > 0) {
				created.inventoryCategories.push(name);
				refs.inventoryCategoryByName.set(canonical(name), inserted[0].id);
			}
		}
		for (const name of missingUnits) {
			const inserted = await tx
				.insert(units)
				.values({ name, abbreviation: name, isActive: true })
				.onConflictDoNothing()
				.returning({ id: units.id });
			if (inserted.length > 0) {
				created.units.push(name);
				refs.unitByKey.set(canonical(name), inserted[0].id);
			}
		}
		for (const name of missingBrands) {
			const inserted = await tx
				.insert(brands)
				.values({ name, isActive: true })
				.onConflictDoNothing()
				.returning({ id: brands.id });
			if (inserted.length > 0) {
				created.brands.push(name);
				refs.brandByName.set(canonical(name), inserted[0].id);
			}
		}
		for (const name of missingAssetCategories) {
			const inserted = await tx
				.insert(assetCategories)
				.values({ name, isActive: true })
				.onConflictDoNothing()
				.returning({ id: assetCategories.id });
			if (inserted.length > 0) {
				created.assetCategories.push(name);
				refs.assetCategoryByName.set(canonical(name), inserted[0].id);
			}
		}
		for (const name of missingConditions) {
			const inserted = await tx
				.insert(assetConditions)
				.values({ name, isActive: true })
				.onConflictDoNothing()
				.returning({ id: assetConditions.id });
			if (inserted.length > 0) {
				created.conditions.push(name);
				refs.assetConditionByName.set(canonical(name), inserted[0].id);
			}
		}

		if (type === 'asset') {
			for (const row of rows) {
				const model = (row.values.model ?? '').trim();
				const brand = (row.values.brand ?? '').trim();
				const category = (row.values.category ?? '').trim();
				if (!model || !brand || !category) continue;
				const brandId = refs.brandByName.get(canonical(brand));
				const categoryId = refs.assetCategoryByName.get(canonical(category));
				if (!brandId || !categoryId) continue;
				if (refs.modelByKey.has(`${brandId}:${canonical(model)}`)) continue;
				missingModels.add(`${brandId}:${categoryId}:${model}`);
			}
		}

		for (const key of missingModels) {
			const [brandIdRaw, categoryIdRaw, ...modelParts] = key.split(':');
			const brandId = Number(brandIdRaw);
			const categoryId = Number(categoryIdRaw);
			const modelName = modelParts.join(':');
			if (!Number.isInteger(brandId) || !Number.isInteger(categoryId) || !modelName) continue;
			const inserted = await tx
				.insert(assetModels)
				.values({
					brandId,
					categoryId,
					name: modelName,
					isActive: true
				})
				.onConflictDoNothing()
				.returning({ id: assetModels.id });
			if (inserted.length > 0) {
				created.models.push(modelName);
				refs.modelByKey.set(`${brandId}:${canonical(modelName)}`, {
					id: inserted[0].id,
					categoryId
				});
			}
		}
		const totalCreated =
			created.inventoryCategories.length +
			created.units.length +
			created.brands.length +
			created.assetCategories.length +
			created.conditions.length +
			created.models.length;
		if (totalCreated > 0) {
			await writeAudit(tx, actor, {
				module: 'import',
				action: 'import_auto_create_master_data',
				recordId: type,
				newValue: {
					type,
					inventoryCategories: created.inventoryCategories,
					units: created.units,
					brands: created.brands,
					assetCategories: created.assetCategories,
					conditions: created.conditions,
					models: created.models
				}
			});
		}
	});

	return created;
}

function rowErrorMessage(error: unknown): string {
	if (error instanceof DomainError) return error.message;
	return 'Gagal menyimpan baris ini.';
}

async function insertResolved(
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
	actor: AuthUser,
	resolved: ResolvedRow
): Promise<boolean> {
	if (resolved.kind === 'location') {
		const inserted = await tx
			.insert(locations)
			.values({
				outletId: resolved.outletId,
				code: resolved.code,
				name: resolved.name,
				isActive: resolved.isActive
			})
			.onConflictDoNothing()
			.returning({ id: locations.id });
		return inserted.length > 0;
	}

	if (resolved.kind === 'employee') {
		const inserted = await tx
			.insert(employees)
			.values({
				employeeCode: resolved.employeeCode,
				fullName: resolved.fullName,
				email: resolved.email,
				phone: resolved.phone,
				outletId: resolved.outletId,
				departmentId: resolved.departmentId,
				isActive: resolved.isActive
			})
			.onConflictDoNothing()
			.returning({ id: employees.id });
		return inserted.length > 0;
	}

	if (resolved.kind === 'asset') {
		const inserted = await tx
			.insert(assets)
			.values({
				assetCode: resolved.assetCode,
				name: resolved.name,
				categoryId: resolved.categoryId,
				locationId: resolved.locationId,
				conditionId: resolved.conditionId,
				brandId: resolved.brandId,
				modelId: resolved.modelId,
				serialNumber: resolved.serialNumber,
				purchaseDate: resolved.purchaseDate,
				warrantyExpiration: resolved.warrantyExpiration,
				acquisitionCost: resolved.acquisitionCost,
				description: resolved.description,
				status: 'available',
				createdBy: actor.id,
				updatedBy: actor.id
			})
			.onConflictDoNothing()
			.returning({ id: assets.id });
		return inserted.length > 0;
	}

	if (resolved.kind === 'inventory-item') {
		const inserted = await tx
			.insert(inventoryItems)
			.values({
				itemCode: resolved.itemCode,
				name: resolved.name,
				categoryId: resolved.categoryId,
				unitId: resolved.unitId,
				brandId: resolved.brandId,
				description: resolved.description,
				isActive: resolved.isActive
			})
			.onConflictDoNothing()
			.returning({ id: inventoryItems.id });
		return inserted.length > 0;
	}

	const balance = await tx
		.insert(stockBalances)
		.values({
			itemId: resolved.itemId,
			locationId: resolved.locationId,
			qty: resolved.qty,
			minStock: resolved.minStock
		})
		.onConflictDoNothing()
		.returning({ itemId: stockBalances.itemId });
	if (balance.length === 0) return false;

	const [document] = await tx
		.insert(stockDocuments)
		.values({
			documentNumber: `TMP-${randomUUID()}`,
			documentType: 'opening_balance',
			destinationLocationId: resolved.locationId,
			reason: 'Import saldo awal',
			performedBy: actor.id,
			submissionId: randomUUID()
		})
		.returning({ id: stockDocuments.id });
	await tx
		.update(stockDocuments)
		.set({
			documentNumber: `OB-${new Date().getFullYear()}-${String(document.id).padStart(4, '0')}`
		})
		.where(eq(stockDocuments.id, document.id));

	await tx.insert(stockTransactions).values({
		documentId: document.id,
		itemId: resolved.itemId,
		locationId: resolved.locationId,
		transactionType: 'opening_balance',
		signedQty: resolved.qty
	});
	return true;
}

export async function confirmImport(
	actor: AuthUser,
	token: string
): Promise<{ batchId: number; alreadyConfirmed: boolean }> {
	assertImportAccess(actor);
	purgePreviews();
	const preview = previews.get(token);
	if (!preview || preview.userId !== actor.id) {
		throw new DomainError(
			'TIDAK_DITEMUKAN',
			'Sesi pratinjau tidak ditemukan atau sudah kedaluwarsa. Silakan unggah ulang file.'
		);
	}
	if (preview.confirmedBatchId !== null) {
		return { batchId: preview.confirmedBatchId, alreadyConfirmed: true };
	}
	if (preview.processing) {
		throw new DomainError('IMPOR_PROSES', 'Impor sedang diproses. Tunggu sebentar.');
	}

	preview.processing = true;
	try {
		const validated = await validateImportRows(preview.type, preview.rows);
		const batchId = await db.transaction(async (tx) => {
			const results: {
				row: ValidatedImportRow;
				status: ImportRowStatus;
				message: string | null;
			}[] = [];

			for (const row of validated) {
				if (row.errors.length > 0 || !row.resolved) {
					results.push({
						row,
						status: 'failed',
						message: row.errors.join('; ')
					});
					continue;
				}
				try {
					const inserted = await insertResolved(tx, actor, row.resolved);
					if (inserted) {
						results.push({ row, status: 'imported', message: null });
					} else {
						results.push({ row, status: 'failed', message: 'Data sudah ada (duplikat).' });
					}
				} catch (error) {
					results.push({ row, status: 'failed', message: rowErrorMessage(error) });
				}
			}

			const successCount = results.filter((entry) => entry.status === 'imported').length;
			const failedCount = results.length - successCount;
			const status: ImportStatus =
				failedCount === 0 ? 'completed' : successCount === 0 ? 'failed' : 'partial';

			const [batch] = await tx
				.insert(importBatches)
				.values({
					batchNumber: `IMP-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
					importType: preview.type,
					status,
					totalRows: results.length,
					successCount,
					failedCount,
					createdBy: actor.id
				})
				.returning({ id: importBatches.id });

			if (results.length > 0) {
				await tx.insert(importBatchRows).values(
					results.map((entry) => ({
						batchId: batch.id,
						rowNumber: entry.row.rowNumber,
						status: entry.status,
						message: entry.message,
						data: entry.row.values
					}))
				);
			}

			await writeAudit(tx, actor, {
				module: 'import',
				action: 'import_completed',
				recordId: String(batch.id),
				newValue: {
					type: preview.type,
					totalRows: results.length,
					successCount,
					failedCount,
					status
				}
			});

			return batch.id;
		});

		preview.confirmedBatchId = batchId;
		return { batchId, alreadyConfirmed: false };
	} finally {
		preview.processing = false;
	}
}

export type ImportBatchListItem = {
	id: number;
	batchNumber: string;
	typeLabel: string;
	status: ImportStatus;
	statusLabel: string;
	statusTone: 'success' | 'warning' | 'danger';
	totalRows: number;
	successCount: number;
	failedCount: number;
	createdAtLabel: string;
	createdByName: string;
};

export type ImportBatchListResult = {
	items: ImportBatchListItem[];
	page: number;
	pageSize: number;
	total: number;
};

function mapBatchRow(row: {
	id: number;
	batchNumber: string;
	importType: string;
	status: string;
	totalRows: number;
	successCount: number;
	failedCount: number;
	createdAt: Date;
	userName: string;
}): ImportBatchListItem {
	const status = (row.status as ImportStatus) ?? 'failed';
	return {
		id: row.id,
		batchNumber: row.batchNumber,
		typeLabel: importTypeLabel(row.importType),
		status,
		statusLabel: IMPORT_STATUS_LABEL[status] ?? row.status,
		statusTone: IMPORT_STATUS_TONE[status] ?? 'danger',
		totalRows: row.totalRows,
		successCount: row.successCount,
		failedCount: row.failedCount,
		createdAtLabel: formatDateTime(row.createdAt),
		createdByName: row.userName
	};
}

export async function listImportBatches(
	actor: AuthUser,
	page = 1,
	pageSize = 20
): Promise<ImportBatchListResult> {
	assertImportAccess(actor);
	const safePageSize = Math.min(50, Math.max(5, pageSize));
	const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(importBatches);
	const totalPages = Math.max(1, Math.ceil(total / safePageSize));
	const safePage = Math.min(Math.max(page, 1), totalPages);
	const offset = (safePage - 1) * safePageSize;

	const rows = await db
		.select({
			id: importBatches.id,
			batchNumber: importBatches.batchNumber,
			importType: importBatches.importType,
			status: importBatches.status,
			totalRows: importBatches.totalRows,
			successCount: importBatches.successCount,
			failedCount: importBatches.failedCount,
			createdAt: importBatches.createdAt,
			userName: users.fullName
		})
		.from(importBatches)
		.innerJoin(users, eq(importBatches.createdBy, users.id))
		.orderBy(desc(importBatches.createdAt), desc(importBatches.id))
		.limit(safePageSize)
		.offset(offset);

	return {
		items: rows.map(mapBatchRow),
		page: safePage,
		pageSize: safePageSize,
		total
	};
}

export type ImportBatchRowView = {
	rowNumber: number;
	status: ImportRowStatus;
	statusLabel: string;
	message: string | null;
	values: Record<string, string>;
};

export type ImportBatchDetail = {
	batch: ImportBatchListItem;
	rows: ImportBatchRowView[];
	columns: ImportColumn[];
	type: ImportTypeDefinition;
};

export async function getImportBatch(actor: AuthUser, id: number): Promise<ImportBatchDetail> {
	assertImportAccess(actor);
	const [batch] = await db
		.select({
			id: importBatches.id,
			batchNumber: importBatches.batchNumber,
			importType: importBatches.importType,
			status: importBatches.status,
			totalRows: importBatches.totalRows,
			successCount: importBatches.successCount,
			failedCount: importBatches.failedCount,
			createdAt: importBatches.createdAt,
			userName: users.fullName
		})
		.from(importBatches)
		.innerJoin(users, eq(importBatches.createdBy, users.id))
		.where(eq(importBatches.id, id))
		.limit(1);

	if (!batch) throw new DomainError('TIDAK_DITEMUKAN', 'Batch impor tidak ditemukan.');

	const type = requireImportType(batch.importType);
	const rows = await db
		.select({
			rowNumber: importBatchRows.rowNumber,
			status: importBatchRows.status,
			message: importBatchRows.message,
			data: importBatchRows.data
		})
		.from(importBatchRows)
		.where(eq(importBatchRows.batchId, id))
		.orderBy(asc(importBatchRows.rowNumber));

	return {
		batch: mapBatchRow(batch),
		columns: type.columns,
		type,
		rows: rows.map((row) => {
			const status = row.status === 'imported' ? 'imported' : 'failed';
			return {
				rowNumber: row.rowNumber,
				status,
				statusLabel: status === 'imported' ? 'Berhasil' : 'Gagal',
				message: row.message,
				values: (row.data as Record<string, string> | null) ?? {}
			};
		})
	};
}
