import { db } from '#lib/server/db/index.js';
import {
	assetCategories,
	assetConditions,
	employees,
	inventoryCategories,
	inventoryItems,
	locations,
	outlets,
	units,
	users
} from '#lib/server/db/schema/index.js';

export const TEST_PASSWORD = 'TestPass123!';

export type TestFixtures = {
	hoOutletId: number;
	outletId: number;
	hoLocationId: number;
	outletLocationId: number;
	assetCategoryId: number;
	conditionId: number;
	inventoryCategoryId: number;
	unitId: number;
	itemId: number;
	employeeId: number;
	adminId: number;
	outletUserId: number;
	adminUsername: string;
	outletUsername: string;
	password: string;
};

export async function seedBaseFixtures(): Promise<TestFixtures> {
	const passwordHash = await Bun.password.hash(TEST_PASSWORD, { algorithm: 'argon2id' });

	const [ho] = await db
		.insert(outlets)
		.values({ code: 'HO', name: 'Head Office', isHeadOffice: true, isActive: true })
		.returning({ id: outlets.id });
	const [outlet] = await db
		.insert(outlets)
		.values({ code: 'OUT-A', name: 'Outlet A', isHeadOffice: false, isActive: true })
		.returning({ id: outlets.id });

	const [hoLocation] = await db
		.insert(locations)
		.values({ outletId: ho.id, code: 'HO-IT', name: 'IT Room', isActive: true })
		.returning({ id: locations.id });
	const [outletLocation] = await db
		.insert(locations)
		.values({ outletId: outlet.id, code: 'OUT-A-OFF', name: 'Outlet Office', isActive: true })
		.returning({ id: locations.id });

	const [assetCategory] = await db
		.insert(assetCategories)
		.values({ name: 'Laptop' })
		.returning({ id: assetCategories.id });
	const [condition] = await db
		.insert(assetConditions)
		.values({ name: 'Baik' })
		.returning({ id: assetConditions.id });
	const [inventoryCategory] = await db
		.insert(inventoryCategories)
		.values({ name: 'Consumables' })
		.returning({ id: inventoryCategories.id });
	const [unit] = await db
		.insert(units)
		.values({ name: 'Piece', abbreviation: 'pcs' })
		.returning({ id: units.id });

	const [employee] = await db
		.insert(employees)
		.values({
			employeeCode: 'QA-EMP-1',
			fullName: 'QA Employee',
			outletId: ho.id,
			isActive: true
		})
		.returning({ id: employees.id });

	const [item] = await db
		.insert(inventoryItems)
		.values({
			itemCode: 'QA-ITEM-1',
			name: 'QA Item',
			categoryId: inventoryCategory.id,
			unitId: unit.id,
			isActive: true
		})
		.returning({ id: inventoryItems.id });

	const [admin] = await db
		.insert(users)
		.values({
			username: 'qa-admin',
			email: 'qa-admin@example.local',
			passwordHash,
			fullName: 'QA Admin',
			role: 'admin',
			isActive: true,
			mustChangePassword: false
		})
		.returning({ id: users.id });

	const [outletUser] = await db
		.insert(users)
		.values({
			username: 'qa-outlet',
			email: 'qa-outlet@example.local',
			passwordHash,
			fullName: 'QA Outlet',
			role: 'outlet',
			outletId: outlet.id,
			isActive: true,
			mustChangePassword: false
		})
		.returning({ id: users.id });

	return {
		hoOutletId: ho.id,
		outletId: outlet.id,
		hoLocationId: hoLocation.id,
		outletLocationId: outletLocation.id,
		assetCategoryId: assetCategory.id,
		conditionId: condition.id,
		inventoryCategoryId: inventoryCategory.id,
		unitId: unit.id,
		itemId: item.id,
		employeeId: employee.id,
		adminId: admin.id,
		outletUserId: outletUser.id,
		adminUsername: 'qa-admin',
		outletUsername: 'qa-outlet',
		password: TEST_PASSWORD
	};
}
