import QRCode from 'qrcode';
import { requireUser } from '#lib/server/auth/guards.js';
import { getAssetsForLabels } from '#lib/server/services/qr.js';
import type { PageServerLoad } from './$types';

function parseIds(value: string | null): number[] {
	if (!value) return [];
	return value
		.split(',')
		.map((entry) => Number(entry.trim()))
		.filter((entry) => Number.isInteger(entry) && entry > 0);
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const actor = requireUser(locals, url);
	const ids = parseIds(url.searchParams.get('ids'));
	const selected = await getAssetsForLabels(actor, ids);

	const assets = await Promise.all(
		selected.map(async (asset) => ({
			...asset,
			qrDataUrl: await QRCode.toDataURL(asset.assetCode, {
				errorCorrectionLevel: 'M',
				margin: 0,
				width: 256,
				color: { dark: '#000000', light: '#FFFFFF' }
			})
		}))
	);

	return { assets, requested: ids.length };
};
