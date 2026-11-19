import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DomainError } from './errors.js';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_SPREADSHEET_BYTES = 10 * 1024 * 1024;

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const SPREADSHEET_EXTENSIONS = new Set(['xlsx', 'xls', 'csv']);

function extensionOf(file: File): string {
	return file.name.split('.').pop()?.toLowerCase() ?? '';
}

function extensionOfPath(filePath: string): string {
	return filePath.split('.').pop()?.toLowerCase() ?? '';
}

function formatMb(bytes: number): string {
	return `${Math.round(bytes / (1024 * 1024))} MB`;
}

export function assertValidImageFile(file: File, maxBytes = MAX_IMAGE_BYTES): void {
	if (!file || file.size === 0) {
		throw new DomainError('FILE_KOSONG', 'File gambar kosong.');
	}

	if (!IMAGE_TYPES.has(file.type) && !IMAGE_EXTENSIONS.has(extensionOf(file))) {
		throw new DomainError('FILE_TIPE', 'Format file harus JPG, PNG, atau WebP.');
	}

	if (file.size > maxBytes) {
		throw new DomainError('FILE_UKURAN', `Ukuran gambar maksimal ${formatMb(maxBytes)}.`);
	}
}

export function assertValidSpreadsheetFile(file: File, maxBytes = MAX_SPREADSHEET_BYTES): void {
	if (!file || file.size === 0) {
		throw new DomainError('FILE_KOSONG', 'File data kosong.');
	}

	if (!SPREADSHEET_EXTENSIONS.has(extensionOf(file))) {
		throw new DomainError('FILE_TIPE', 'Format file harus .xlsx, .xls, atau .csv.');
	}

	if (file.size > maxBytes) {
		throw new DomainError('FILE_UKURAN', `Ukuran file maksimal ${formatMb(maxBytes)}.`);
	}
}

async function storeFile(
	file: File,
	extension: string,
	kind: 'images' | 'imports'
): Promise<string> {
	const now = new Date();
	const year = String(now.getFullYear());
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const relativeDirectory = `${kind}/${year}/${month}`;
	const uploadRoot = process.env.UPLOAD_DIR ?? './data/uploads';
	const absoluteDirectory = path.join(uploadRoot, kind, year, month);
	await mkdir(absoluteDirectory, { recursive: true });

	const filename = `${randomUUID()}.${extension}`;
	const absolutePath = path.join(absoluteDirectory, filename);
	const bytes = Buffer.from(await file.arrayBuffer());
	await writeFile(absolutePath, bytes);

	return `${relativeDirectory}/${filename}`;
}

export async function saveImageUpload(file: File): Promise<string> {
	assertValidImageFile(file);
	const extension = IMAGE_EXTENSIONS.has(extensionOf(file)) ? extensionOf(file) : 'webp';
	return storeFile(file, extension, 'images');
}

export async function saveSpreadsheetUpload(file: File): Promise<string> {
	assertValidSpreadsheetFile(file);
	const extension = extensionOf(file);
	return storeFile(file, extension, 'imports');
}

const IMAGE_CONTENT_TYPES: Record<string, string> = {
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp'
};

function uploadRoot(): string {
	return path.resolve(process.env.UPLOAD_DIR ?? './data/uploads');
}

function resolveInsideRoot(relativePath: string): string | null {
	const root = uploadRoot();
	const absolute = path.resolve(root, relativePath);
	if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) return null;
	return absolute;
}

/** Baca file gambar unggahan untuk disajikan lewat route terautentikasi. */
export async function readStoredImage(
	relativePath: string
): Promise<{ bytes: Buffer; contentType: string } | null> {
	const extension = extensionOfPath(relativePath);
	const contentType = IMAGE_CONTENT_TYPES[extension];
	if (!contentType) return null;

	const absolute = resolveInsideRoot(relativePath);
	if (!absolute) return null;

	try {
		return { bytes: await readFile(absolute), contentType };
	} catch {
		return null;
	}
}

/** Hapus file unggahan lama; abaikan jika path tidak valid atau file sudah tidak ada. */
export async function deleteStoredUpload(relativePath: string | null | undefined): Promise<void> {
	if (!relativePath) return;
	const absolute = resolveInsideRoot(relativePath);
	if (!absolute) return;

	try {
		await unlink(absolute);
	} catch {
		// File sudah tidak ada atau tidak dapat dihapus — tidak menghalangi transaksi.
	}
}
