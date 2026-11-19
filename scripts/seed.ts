import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/bun-sql';
import * as schema from '../src/lib/server/db/schema/index';
import {
	appMeta,
	assetCategories,
	assetConditions,
	assetModels,
	brands,
	departments,
	inventoryCategories,
	locations,
	outlets,
	units,
	users
} from '../src/lib/server/db/schema/index';

const databaseUrl = process.env.DATABASE_URL_MIGRATE;

if (!databaseUrl) {
	throw new Error('DATABASE_URL_MIGRATE belum diatur.');
}

const adminUsername = process.env.SEED_ADMIN_USERNAME ?? 'admin';
const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.local';
const adminName = process.env.SEED_ADMIN_NAME ?? 'IT Administrator';
const adminPassword = process.env.SEED_ADMIN_PASSWORD;
const sampleData = process.env.SEED_SAMPLE_DATA === 'true';
const outletUsername = process.env.SEED_OUTLET_USERNAME ?? 'outlet';
const outletEmail = process.env.SEED_OUTLET_EMAIL ?? 'outlet@example.local';
const outletName = process.env.SEED_OUTLET_NAME ?? 'Outlet Management Demo';
const outletPassword = process.env.SEED_OUTLET_PASSWORD;

if (!adminPassword || adminPassword.length < 8) {
	throw new Error('SEED_ADMIN_PASSWORD wajib diisi, minimal 8 karakter.');
}

if (sampleData && (!outletPassword || outletPassword.length < 8)) {
	throw new Error('SEED_OUTLET_PASSWORD wajib diisi saat SEED_SAMPLE_DATA=true.');
}

const db = drizzle(databaseUrl, { schema });
const now = new Date();

const assetCategoryNames = [
	'Laptop',
	'Desktop',
	'POS Terminal',
	'Monitor',
	'Printer',
	'Server',
	'Network Equipment',
	'UPS',
	'CCTV',
	'Accessories'
];

const inventoryCategoryNames = [
	'Network Equipment',
	'Computer Components',
	'Peripheral',
	'Consumables'
];

const brandNames = ['HP', 'Lenovo', 'Dell', 'Epson', 'TP-Link', 'APC'];
const unitRows = [
	{ name: 'Piece', abbreviation: 'pcs' },
	{ name: 'Unit', abbreviation: 'unit' },
	{ name: 'Roll', abbreviation: 'roll' },
	{ name: 'Meter', abbreviation: 'm' },
	{ name: 'Box', abbreviation: 'box' },
	{ name: 'Set', abbreviation: 'set' }
];
const conditionNames = ['Baik', 'Cukup', 'Rusak'];

let adminCreated = false;
let outletCreated = false;

await db.transaction(async (tx) => {
	const [headOffice] = await tx
		.insert(outlets)
		.values({
			code: 'HO',
			name: 'Head Office',
			isHeadOffice: true,
			isActive: true
		})
		.onConflictDoUpdate({
			target: outlets.code,
			set: {
				name: 'Head Office',
				isHeadOffice: true,
				isActive: true,
				updatedAt: now
			}
		})
		.returning();

	for (const location of [
		{ code: 'HO-IT', name: 'IT Room' },
		{ code: 'HO-WH', name: 'Warehouse' },
		{ code: 'HO-FIN', name: 'Finance Department' }
	]) {
		await tx
			.insert(locations)
			.values({
				outletId: headOffice.id,
				code: location.code,
				name: location.name,
				isActive: true
			})
			.onConflictDoUpdate({
				target: [locations.outletId, locations.code],
				set: {
					name: location.name,
					isActive: true,
					updatedAt: now
				}
			});
	}

	for (const departmentName of ['IT', 'Finance', 'Operations']) {
		await tx
			.insert(departments)
			.values({
				outletId: headOffice.id,
				name: departmentName,
				isActive: true
			})
			.onConflictDoUpdate({
				target: [departments.outletId, departments.name],
				set: {
					isActive: true,
					updatedAt: now
				}
			});
	}

	await tx
		.insert(assetCategories)
		.values(assetCategoryNames.map((name) => ({ name })))
		.onConflictDoNothing({ target: assetCategories.name });

	await tx
		.insert(inventoryCategories)
		.values(inventoryCategoryNames.map((name) => ({ name })))
		.onConflictDoNothing({ target: inventoryCategories.name });

	await tx
		.insert(brands)
		.values(brandNames.map((name) => ({ name })))
		.onConflictDoNothing({ target: brands.name });

	await tx.insert(units).values(unitRows).onConflictDoNothing({ target: units.abbreviation });

	await tx
		.insert(assetConditions)
		.values(conditionNames.map((name) => ({ name })))
		.onConflictDoNothing({ target: assetConditions.name });

	const categoryRows = await tx.select().from(assetCategories);
	const brandRows = await tx.select().from(brands);
	const categoryByName = new Map(categoryRows.map((row) => [row.name, row.id]));
	const brandByName = new Map(brandRows.map((row) => [row.name, row.id]));

	const sampleModels = [
		{ category: 'Laptop', brand: 'HP', name: 'HP ProBook 450' },
		{ category: 'Desktop', brand: 'Lenovo', name: 'Lenovo ThinkCentre' },
		{ category: 'Printer', brand: 'Epson', name: 'Epson TM-T82' },
		{ category: 'Network Equipment', brand: 'TP-Link', name: 'TP-Link Archer C6' }
	];

	for (const model of sampleModels) {
		const categoryId = categoryByName.get(model.category);
		const brandId = brandByName.get(model.brand);
		if (!categoryId || !brandId) continue;

		await tx
			.insert(assetModels)
			.values({
				categoryId,
				brandId,
				name: model.name,
				isActive: true
			})
			.onConflictDoUpdate({
				target: [assetModels.brandId, assetModels.name],
				set: {
					categoryId,
					isActive: true,
					updatedAt: now
				}
			});
	}

	const [existingAdmin] = await tx
		.select({ id: users.id })
		.from(users)
		.where(eq(users.username, adminUsername))
		.limit(1);

	if (!existingAdmin) {
		const passwordHash = await Bun.password.hash(adminPassword, { algorithm: 'argon2id' });
		await tx.insert(users).values({
			username: adminUsername,
			email: adminEmail,
			passwordHash,
			fullName: adminName,
			role: 'admin',
			isActive: true,
			mustChangePassword: true
		});
		adminCreated = true;
	}

	if (sampleData) {
		const [sampleOutlet] = await tx
			.insert(outlets)
			.values({
				code: 'OUT-A',
				name: 'Union Outlet A',
				isHeadOffice: false,
				isActive: true
			})
			.onConflictDoUpdate({
				target: outlets.code,
				set: {
					name: 'Union Outlet A',
					isHeadOffice: false,
					isActive: true,
					updatedAt: now
				}
			})
			.returning();

		for (const location of [
			{ code: 'OUT-A-OFF', name: 'Office' },
			{ code: 'OUT-A-CASH', name: 'Cashier Area' },
			{ code: 'OUT-A-STORE', name: 'Storage' }
		]) {
			await tx
				.insert(locations)
				.values({
					outletId: sampleOutlet.id,
					code: location.code,
					name: location.name,
					isActive: true
				})
				.onConflictDoUpdate({
					target: [locations.outletId, locations.code],
					set: {
						name: location.name,
						isActive: true,
						updatedAt: now
					}
				});
		}

		const [existingOutletUser] = await tx
			.select({ id: users.id })
			.from(users)
			.where(eq(users.username, outletUsername))
			.limit(1);

		if (!existingOutletUser && outletPassword) {
			const passwordHash = await Bun.password.hash(outletPassword, { algorithm: 'argon2id' });
			await tx.insert(users).values({
				username: outletUsername,
				email: outletEmail,
				passwordHash,
				fullName: outletName,
				role: 'outlet',
				outletId: sampleOutlet.id,
				isActive: true,
				mustChangePassword: true
			});
			outletCreated = true;
		}
	}

	for (const meta of [
		{ key: 'schema_version', value: 'fnd-08' },
		{ key: 'seeded_at', value: now.toISOString() }
	]) {
		await tx
			.insert(appMeta)
			.values(meta)
			.onConflictDoUpdate({
				target: appMeta.key,
				set: {
					value: sql`excluded.value`,
					updatedAt: now
				}
			});
	}
});

console.log(`Seed selesai. Admin ${adminUsername}: ${adminCreated ? 'dibuat' : 'sudah ada'}.`);
if (sampleData) {
	console.log(`Outlet demo ${outletUsername}: ${outletCreated ? 'dibuat' : 'sudah ada'}.`);
}
console.log('Head Office dan master data minimum siap.');
