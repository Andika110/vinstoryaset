import { and, asc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { assertCan, scopeToUser, type Scope } from '#lib/server/auth/permissions.js';
import type { AuthUser } from '#lib/server/auth/session.js';
import { db } from '#lib/server/db/index.js';
import {
	assetCategories,
	assetConditions,
	assets,
	locations,
	outlets
} from '#lib/server/db/schema/index.js';
import {
	ASSET_STATUS_LABEL,
	ASSET_STATUS_TONE,
	type AssetStatus
} from '#lib/server/domain/transitions.js';

export type AssetQrSummary = {
	id: number;
	assetCode: string;
	name: string;
	serialNumber: string | null;
	categoryName: string;
	locationName: string;
	outletName: string;
	conditionName: string;
	status: AssetStatus;
	statusLabel: string;
	statusTone: 'success' | 'info' | 'warning' | 'danger' | 'neutral';
};

function assertAssetRead(actor: AuthUser): void {
	if (actor.role === 'outlet') {
		assertCan(actor, 'asset:read', { outletId: actor.outletId });
		return;
	}
	assertCan(actor, 'asset:read');
}

function scopeCondition(scope: Scope): SQL | undefined {
	return scope.allOutlets ? undefined : eq(locations.outletId, scope.outletId!);
}

const summaryColumns = {
	id: assets.id,
	assetCode: assets.assetCode,
	name: assets.name,
	serialNumber: assets.serialNumber,
	categoryName: assetCategories.name,
	locationName: locations.name,
	outletName: outlets.name,
	conditionName: assetConditions.name,
	status: assets.status
};

function toSummary(row: {
	id: number;
	assetCode: string;
	name: string;
	serialNumber: string | null;
	categoryName: string;
	locationName: string;
	outletName: string;
	conditionName: string;
	status: AssetStatus;
}): AssetQrSummary {
	return {
		...row,
		statusLabel: ASSET_STATUS_LABEL[row.status],
		statusTone: ASSET_STATUS_TONE[row.status]
	};
}

/** Ringkasan aset untuk hasil scan, selalu dibatasi cakupan outlet pengguna. */
export async function findAssetByCode(
	actor: AuthUser,
	code: string
): Promise<AssetQrSummary | null> {
	assertAssetRead(actor);
	const normalized = code.trim();
	if (!normalized || normalized.length > 100) return null;
	const scope = scopeToUser(actor);

	const [row] = await db
		.select(summaryColumns)
		.from(assets)
		.innerJoin(assetCategories, eq(assets.categoryId, assetCategories.id))
		.innerJoin(locations, eq(assets.locationId, locations.id))
		.innerJoin(outlets, eq(locations.outletId, outlets.id))
		.innerJoin(assetConditions, eq(assets.conditionId, assetConditions.id))
		.where(and(scopeCondition(scope), sql`lower(${assets.assetCode}) = lower(${normalized})`))
		.limit(1);

	return row ? toSummary(row) : null;
}

/** Aset terpilih untuk cetak label. Maksimal 100 aset per lembar/permintaan. */
export async function getAssetsForLabels(
	actor: AuthUser,
	ids: number[]
): Promise<AssetQrSummary[]> {
	assertAssetRead(actor);
	if (ids.length === 0) return [];
	const scope = scopeToUser(actor);
	const uniqueIds = [...new Set(ids)].filter((id) => Number.isInteger(id) && id > 0).slice(0, 100);

	const rows = await db
		.select(summaryColumns)
		.from(assets)
		.innerJoin(assetCategories, eq(assets.categoryId, assetCategories.id))
		.innerJoin(locations, eq(assets.locationId, locations.id))
		.innerJoin(outlets, eq(locations.outletId, outlets.id))
		.innerJoin(assetConditions, eq(assets.conditionId, assetConditions.id))
		.where(and(inArray(assets.id, uniqueIds), scopeCondition(scope)))
		.orderBy(asc(assets.assetCode));

	return rows.map(toSummary);
}
