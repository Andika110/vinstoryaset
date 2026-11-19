import {
	boolean,
	index,
	integer,
	pgTable,
	serial,
	text,
	uniqueIndex,
	type AnyPgColumn
} from 'drizzle-orm/pg-core';
import { timestamps } from './columns';

export const outlets = pgTable(
	'outlets',
	{
		id: serial('id').primaryKey(),
		code: text('code').notNull(),
		name: text('name').notNull(),
		isHeadOffice: boolean('is_head_office').notNull().default(false),
		isActive: boolean('is_active').notNull().default(true),
		address: text('address'),
		phone: text('phone'),
		...timestamps()
	},
	(t) => [uniqueIndex('outlets_code_unique').on(t.code), index('outlets_active_idx').on(t.isActive)]
);

export const locations = pgTable(
	'locations',
	{
		id: serial('id').primaryKey(),
		outletId: integer('outlet_id')
			.notNull()
			.references(() => outlets.id),
		parentId: integer('parent_id').references((): AnyPgColumn => locations.id),
		code: text('code').notNull(),
		name: text('name').notNull(),
		isActive: boolean('is_active').notNull().default(true),
		...timestamps()
	},
	(t) => [
		uniqueIndex('locations_outlet_code_unique').on(t.outletId, t.code),
		index('locations_outlet_idx').on(t.outletId),
		index('locations_parent_idx').on(t.parentId),
		index('locations_active_idx').on(t.isActive)
	]
);

export const departments = pgTable(
	'departments',
	{
		id: serial('id').primaryKey(),
		outletId: integer('outlet_id')
			.notNull()
			.references(() => outlets.id),
		name: text('name').notNull(),
		isActive: boolean('is_active').notNull().default(true),
		...timestamps()
	},
	(t) => [
		uniqueIndex('departments_outlet_name_unique').on(t.outletId, t.name),
		index('departments_outlet_idx').on(t.outletId),
		index('departments_active_idx').on(t.isActive)
	]
);

export const employees = pgTable(
	'employees',
	{
		id: serial('id').primaryKey(),
		employeeCode: text('employee_code').notNull(),
		fullName: text('full_name').notNull(),
		email: text('email'),
		phone: text('phone'),
		outletId: integer('outlet_id')
			.notNull()
			.references(() => outlets.id),
		departmentId: integer('department_id').references(() => departments.id),
		isActive: boolean('is_active').notNull().default(true),
		...timestamps()
	},
	(t) => [
		uniqueIndex('employees_code_unique').on(t.employeeCode),
		index('employees_outlet_idx').on(t.outletId),
		index('employees_department_idx').on(t.departmentId),
		index('employees_name_idx').on(t.fullName),
		index('employees_active_idx').on(t.isActive)
	]
);
