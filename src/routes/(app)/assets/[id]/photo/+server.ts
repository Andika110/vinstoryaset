import { error } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { DomainError } from '#lib/server/errors.js';
import { getAssetPhotoPath } from '#lib/server/services/assets.js';
import { readStoredImage } from '#lib/server/files.js';
import type { RequestHandler } from './$types';

function parseId(value: string): number | null {
	const id = Number(value);
	return Number.isInteger(id) && id > 0 ? id : null;
}

export const GET: RequestHandler = async ({ locals, params, url }) => {
	const actor = requireUser(locals, url);
	const id = parseId(params.id);
	if (id === null) throw error(404, 'Foto aset tidak ditemukan.');

	try {
		const photoPath = await getAssetPhotoPath(actor, id);
		const image = await readStoredImage(photoPath);
		if (!image) throw error(404, 'Foto aset tidak ditemukan.');

		return new Response(new Uint8Array(image.bytes), {
			headers: {
				'Content-Type': image.contentType,
				'Content-Length': String(image.bytes.length),
				'Cache-Control': 'private, max-age=300',
				'X-Content-Type-Options': 'nosniff'
			}
		});
	} catch (err) {
		if (err instanceof DomainError) {
			throw error(404, 'Foto aset tidak ditemukan.');
		}
		throw err;
	}
};
