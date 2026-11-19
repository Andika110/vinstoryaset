import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['admin', 'support', 'outlet']);

export const assetStatusEnum = pgEnum('asset_status', [
	'available',
	'in_use',
	'on_loan',
	'under_maintenance',
	'damaged',
	'disposed'
]);

export const assetMovementTypeEnum = pgEnum('asset_movement_type', ['assignment', 'mutation']);

export const loanStatusEnum = pgEnum('loan_status', ['borrowed', 'returned', 'cancelled']);

export const maintenanceTypeEnum = pgEnum('maintenance_type', [
	'corrective',
	'preventive',
	'other'
]);

export const maintenanceStatusEnum = pgEnum('maintenance_status', [
	'reported',
	'in_progress',
	'waiting_parts',
	'completed',
	'cancelled'
]);

export const requestStatusEnum = pgEnum('request_status', [
	'submitted',
	'processing',
	'partially_fulfilled',
	'fulfilled',
	'rejected',
	'cancelled'
]);

export const opnameStatusEnum = pgEnum('opname_status', [
	'draft',
	'in_progress',
	'completed',
	'cancelled'
]);

export const opnameItemTypeEnum = pgEnum('opname_item_type', ['asset', 'inventory']);

export const opnameResultEnum = pgEnum('opname_result', [
	'matched',
	'other_location',
	'condition_changed',
	'not_found'
]);

export const stockTransactionTypeEnum = pgEnum('stock_transaction_type', [
	'opening_balance',
	'stock_in',
	'stock_out',
	'transfer_out',
	'transfer_in',
	'adjustment'
]);

export const stockDocumentTypeEnum = pgEnum('stock_document_type', [
	'stock_in',
	'stock_out',
	'transfer',
	'adjustment',
	'opening_balance'
]);

export const receivingTypeEnum = pgEnum('receiving_type', [
	'purchase',
	'opening_balance',
	'transfer_in',
	'other'
]);

export const receivingLineTypeEnum = pgEnum('receiving_line_type', ['asset', 'inventory']);

export const disposalReasonEnum = pgEnum('disposal_reason', [
	'heavy_damage',
	'not_economical',
	'lost',
	'not_needed',
	'other'
]);

export const disposalStatusEnum = pgEnum('disposal_status', ['completed', 'cancelled']);
