import { boolean, index, integer, pgTable, serial, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { timestamps } from './columns';

export const assetCategories = pgTable(
	'asset_categories',
	{
		id: serial('id').primaryKey(),
		name: text('name').notNull(),
		isActive: boolean('is_active').notNull().default(true),
		...timestamps()
	},
	(t) => [
		uniqueIndex('asset_categories_name_unique').on(t.name),
		index('asset_categories_active_idx').on(t.isActive)
	]
);

export const inventoryCategories = pgTable(
	'inventory_categories',
	{
		id: serial('id').primaryKey(),
		name: text('name').notNull(),
		isActive: boolean('is_active').notNull().default(true),
		...timestamps()
	},
	(t) => [
		uniqueIndex('inventory_categories_name_unique').on(t.name),
		index('inventory_categories_active_idx').on(t.isActive)
	]
);

export const brands = pgTable(
	'brands',
	{
		id: serial('id').primaryKey(),
		name: text('name').notNull(),
		isActive: boolean('is_active').notNull().default(true),
		...timestamps()
	},
	(t) => [uniqueIndex('brands_name_unique').on(t.name), index('brands_active_idx').on(t.isActive)]
);

export const assetModels = pgTable(
	'asset_models',
	{
		id: serial('id').primaryKey(),
		categoryId: integer('category_id')
			.notNull()
			.references(() => assetCategories.id),
		brandId: integer('brand_id')
			.notNull()
			.references(() => brands.id),
		name: text('name').notNull(),
		isActive: boolean('is_active').notNull().default(true),
		...timestamps()
	},
	(t) => [
		uniqueIndex('asset_models_brand_name_unique').on(t.brandId, t.name),
		index('asset_models_category_idx').on(t.categoryId),
		index('asset_models_brand_idx').on(t.brandId),
		index('asset_models_active_idx').on(t.isActive)
	]
);

export const units = pgTable(
	'units',
	{
		id: serial('id').primaryKey(),
		name: text('name').notNull(),
		abbreviation: text('abbreviation').notNull(),
		isActive: boolean('is_active').notNull().default(true),
		...timestamps()
	},
	(t) => [
		uniqueIndex('units_abbreviation_unique').on(t.abbreviation),
		index('units_active_idx').on(t.isActive)
	]
);

export const suppliers = pgTable(
	'suppliers',
	{
		id: serial('id').primaryKey(),
		name: text('name').notNull(),
		contactName: text('contact_name'),
		phone: text('phone'),
		email: text('email'),
		address: text('address'),
		isActive: boolean('is_active').notNull().default(true),
		...timestamps()
	},
	(t) => [
		uniqueIndex('suppliers_name_unique').on(t.name),
		index('suppliers_active_idx').on(t.isActive)
	]
);

export const assetConditions = pgTable(
	'asset_conditions',
	{
		id: serial('id').primaryKey(),
		name: text('name').notNull(),
		isActive: boolean('is_active').notNull().default(true),
		...timestamps()
	},
	(t) => [
		uniqueIndex('asset_conditions_name_unique').on(t.name),
		index('asset_conditions_active_idx').on(t.isActive)
	]
);
