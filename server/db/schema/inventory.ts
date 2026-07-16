import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { aircraft, stations } from './operations';
import { currencies, vendors } from './finance';

export const inventoryParts = sqliteTable('inventory_parts', {
  id: text('id').primaryKey(),
  partNumber: text('part_number').notNull().unique(),
  partName: text('part_name').notNull(),
  description: text('description'),
  manufacturer: text('manufacturer').notNull(),
  manufacturerPartNumber: text('manufacturer_part_number'),
  unitOfMeasure: text('unit_of_measure').notNull(),
  lifecycleType: text('lifecycle_type').notNull(),
  trackingType: text('tracking_type').notNull(),
  criticality: text('criticality').notNull(),
  certificateRequired: integer('certificate_required', { mode: 'boolean' })
    .notNull()
    .default(false),
  shelfLifeDays: integer('shelf_life_days'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const inventoryPartApplicabilities = sqliteTable('inventory_part_applicabilities', {
  id: text('id').primaryKey(),
  partId: text('part_id')
    .notNull()
    .references(() => inventoryParts.id, { onDelete: 'cascade' }),
  aircraftType: text('aircraft_type').notNull(),
  model: text('model'),
  note: text('note')
});

export const inventoryWarehouses = sqliteTable('inventory_warehouses', {
  id: text('id').primaryKey(),
  stationId: text('station_id')
    .notNull()
    .references(() => stations.id),
  warehouseCode: text('warehouse_code').notNull().unique(),
  warehouseName: text('warehouse_name').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const inventoryBins = sqliteTable(
  'inventory_bins',
  {
    id: text('id').primaryKey(),
    warehouseId: text('warehouse_id')
      .notNull()
      .references(() => inventoryWarehouses.id, { onDelete: 'cascade' }),
    binCode: text('bin_code').notNull(),
    binName: text('bin_name').notNull(),
    binType: text('bin_type').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    uniqueIndex('inventory_bins_warehouse_code_unique').on(table.warehouseId, table.binCode)
  ]
);

export const inventoryReorderRules = sqliteTable(
  'inventory_reorder_rules',
  {
    id: text('id').primaryKey(),
    partId: text('part_id')
      .notNull()
      .references(() => inventoryParts.id, { onDelete: 'cascade' }),
    warehouseId: text('warehouse_id')
      .notNull()
      .references(() => inventoryWarehouses.id, { onDelete: 'cascade' }),
    minimumQuantity: real('minimum_quantity').notNull(),
    reorderPoint: real('reorder_point').notNull(),
    maximumQuantity: real('maximum_quantity').notNull(),
    leadTimeDays: integer('lead_time_days').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    uniqueIndex('inventory_reorder_part_warehouse_unique').on(table.partId, table.warehouseId)
  ]
);

export const inventoryLots = sqliteTable('inventory_lots', {
  id: text('id').primaryKey(),
  partId: text('part_id')
    .notNull()
    .references(() => inventoryParts.id),
  lotNumber: text('lot_number').notNull(),
  manufacturedAt: text('manufactured_at'),
  expiresAt: text('expires_at'),
  certificateReference: text('certificate_reference'),
  certificateVerified: integer('certificate_verified', { mode: 'boolean' })
    .notNull()
    .default(false),
  receiptLineId: text('receipt_line_id'),
  createdAt: text('created_at').notNull()
});

export const inventorySerializedParts = sqliteTable('inventory_serialized_parts', {
  id: text('id').primaryKey(),
  partId: text('part_id')
    .notNull()
    .references(() => inventoryParts.id),
  serialNumber: text('serial_number').notNull().unique(),
  lotId: text('lot_id').references(() => inventoryLots.id),
  binId: text('bin_id').references(() => inventoryBins.id),
  condition: text('condition').notNull(),
  aircraftId: text('aircraft_id').references(() => aircraft.id),
  position: text('position'),
  hoursSinceNew: real('hours_since_new').notNull().default(0),
  cyclesSinceNew: integer('cycles_since_new').notNull().default(0),
  certificateReference: text('certificate_reference'),
  certificateVerified: integer('certificate_verified', { mode: 'boolean' })
    .notNull()
    .default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const inventoryStockBalances = sqliteTable(
  'inventory_stock_balances',
  {
    id: text('id').primaryKey(),
    partId: text('part_id')
      .notNull()
      .references(() => inventoryParts.id),
    binId: text('bin_id')
      .notNull()
      .references(() => inventoryBins.id),
    lotKey: text('lot_key').notNull().default(''),
    lotId: text('lot_id').references(() => inventoryLots.id),
    condition: text('condition').notNull(),
    onHandQuantity: real('on_hand_quantity').notNull().default(0),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    uniqueIndex('inventory_balance_bucket_unique').on(
      table.partId,
      table.binId,
      table.lotKey,
      table.condition
    )
  ]
);

export const inventoryMovements = sqliteTable('inventory_movements', {
  id: text('id').primaryKey(),
  movementNumber: text('movement_number').notNull().unique(),
  movementType: text('movement_type').notNull(),
  sourceType: text('source_type').notNull(),
  sourceId: text('source_id'),
  stationId: text('station_id').references(() => stations.id),
  destinationStationId: text('destination_station_id').references(() => stations.id),
  aircraftId: text('aircraft_id').references(() => aircraft.id),
  flightId: text('flight_id'),
  reason: text('reason').notNull(),
  status: text('status').notNull().default('POSTED'),
  reversalOfMovementId: text('reversal_of_movement_id'),
  totalBaseValueIdr: integer('total_base_value_idr').notNull().default(0),
  isFinalized: integer('is_finalized', { mode: 'boolean' }).notNull().default(false),
  createdByUserId: text('created_by_user_id').notNull(),
  createdAt: text('created_at').notNull()
});

export const inventoryMovementLines = sqliteTable('inventory_movement_lines', {
  id: text('id').primaryKey(),
  movementId: text('movement_id')
    .notNull()
    .references(() => inventoryMovements.id, { onDelete: 'cascade' }),
  partId: text('part_id')
    .notNull()
    .references(() => inventoryParts.id),
  fromBinId: text('from_bin_id').references(() => inventoryBins.id),
  toBinId: text('to_bin_id').references(() => inventoryBins.id),
  lotId: text('lot_id').references(() => inventoryLots.id),
  serialId: text('serial_id').references(() => inventorySerializedParts.id),
  conditionFrom: text('condition_from'),
  conditionTo: text('condition_to'),
  quantity: real('quantity').notNull(),
  sourceUnitCostMinor: integer('source_unit_cost_minor').notNull().default(0),
  currencyId: text('currency_id').references(() => currencies.id),
  exchangeRateToIdrMicros: integer('exchange_rate_to_idr_micros').notNull().default(1000000),
  baseUnitCostIdr: integer('base_unit_cost_idr').notNull().default(0),
  baseValueIdr: integer('base_value_idr').notNull().default(0)
});

export const inventoryCostLayers = sqliteTable('inventory_cost_layers', {
  id: text('id').primaryKey(),
  partId: text('part_id')
    .notNull()
    .references(() => inventoryParts.id),
  warehouseId: text('warehouse_id')
    .notNull()
    .references(() => inventoryWarehouses.id),
  lotId: text('lot_id').references(() => inventoryLots.id),
  serialId: text('serial_id').references(() => inventorySerializedParts.id),
  sourceMovementLineId: text('source_movement_line_id')
    .notNull()
    .references(() => inventoryMovementLines.id),
  originalQuantity: real('original_quantity').notNull(),
  remainingQuantity: real('remaining_quantity').notNull(),
  sourceUnitCostMinor: integer('source_unit_cost_minor').notNull(),
  currencyId: text('currency_id')
    .notNull()
    .references(() => currencies.id),
  exchangeRateToIdrMicros: integer('exchange_rate_to_idr_micros').notNull(),
  baseUnitCostIdr: integer('base_unit_cost_idr').notNull(),
  receivedAt: text('received_at').notNull()
});

export const inventoryAccountingEvents = sqliteTable('inventory_accounting_events', {
  id: text('id').primaryKey(),
  eventType: text('event_type').notNull(),
  sourceType: text('source_type').notNull(),
  sourceId: text('source_id').notNull(),
  movementId: text('movement_id')
    .notNull()
    .unique()
    .references(() => inventoryMovements.id),
  stationId: text('station_id').references(() => stations.id),
  aircraftId: text('aircraft_id').references(() => aircraft.id),
  flightId: text('flight_id'),
  currencyId: text('currency_id').references(() => currencies.id),
  sourceAmountMinor: integer('source_amount_minor').notNull().default(0),
  exchangeRateToIdrMicros: integer('exchange_rate_to_idr_micros').notNull().default(1000000),
  baseAmountIdr: integer('base_amount_idr').notNull(),
  integrationStatus: text('integration_status').notNull().default('PENDING_INTEGRATION'),
  payloadJson: text('payload_json').notNull(),
  createdAt: text('created_at').notNull()
});

export const inventoryPurchaseRequests = sqliteTable('inventory_purchase_requests', {
  id: text('id').primaryKey(),
  requestNumber: text('request_number').notNull().unique(),
  stationId: text('station_id')
    .notNull()
    .references(() => stations.id),
  requestReason: text('request_reason').notNull(),
  status: text('status').notNull(),
  requestedByUserId: text('requested_by_user_id').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const inventoryPurchaseRequestLines = sqliteTable('inventory_purchase_request_lines', {
  id: text('id').primaryKey(),
  purchaseRequestId: text('purchase_request_id')
    .notNull()
    .references(() => inventoryPurchaseRequests.id, { onDelete: 'cascade' }),
  partId: text('part_id')
    .notNull()
    .references(() => inventoryParts.id),
  quantity: real('quantity').notNull(),
  orderedQuantity: real('ordered_quantity').notNull().default(0),
  requiredAt: text('required_at').notNull(),
  note: text('note')
});

export const inventoryPurchaseOrders = sqliteTable('inventory_purchase_orders', {
  id: text('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  purchaseRequestId: text('purchase_request_id')
    .notNull()
    .references(() => inventoryPurchaseRequests.id),
  vendorId: text('vendor_id')
    .notNull()
    .references(() => vendors.id),
  currencyId: text('currency_id')
    .notNull()
    .references(() => currencies.id),
  exchangeRateToIdrMicros: integer('exchange_rate_to_idr_micros').notNull(),
  expectedAt: text('expected_at').notNull(),
  status: text('status').notNull(),
  rejectionReason: text('rejection_reason'),
  createdByUserId: text('created_by_user_id').notNull(),
  approvedByUserId: text('approved_by_user_id'),
  approvedAt: text('approved_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const inventoryPurchaseOrderLines = sqliteTable('inventory_purchase_order_lines', {
  id: text('id').primaryKey(),
  purchaseOrderId: text('purchase_order_id')
    .notNull()
    .references(() => inventoryPurchaseOrders.id, { onDelete: 'cascade' }),
  purchaseRequestLineId: text('purchase_request_line_id')
    .notNull()
    .references(() => inventoryPurchaseRequestLines.id),
  partId: text('part_id')
    .notNull()
    .references(() => inventoryParts.id),
  quantity: real('quantity').notNull(),
  receivedQuantity: real('received_quantity').notNull().default(0),
  sourceUnitCostMinor: integer('source_unit_cost_minor').notNull(),
  baseUnitCostIdr: integer('base_unit_cost_idr').notNull()
});

export const inventoryGoodsReceipts = sqliteTable('inventory_goods_receipts', {
  id: text('id').primaryKey(),
  receiptNumber: text('receipt_number').notNull().unique(),
  purchaseOrderId: text('purchase_order_id')
    .notNull()
    .references(() => inventoryPurchaseOrders.id),
  warehouseId: text('warehouse_id')
    .notNull()
    .references(() => inventoryWarehouses.id),
  documentReference: text('document_reference').notNull(),
  receivedAt: text('received_at').notNull(),
  status: text('status').notNull(),
  movementId: text('movement_id')
    .notNull()
    .unique()
    .references(() => inventoryMovements.id),
  totalBaseValueIdr: integer('total_base_value_idr').notNull(),
  receivedByUserId: text('received_by_user_id').notNull(),
  createdAt: text('created_at').notNull()
});

export const inventoryGoodsReceiptLines = sqliteTable('inventory_goods_receipt_lines', {
  id: text('id').primaryKey(),
  goodsReceiptId: text('goods_receipt_id')
    .notNull()
    .references(() => inventoryGoodsReceipts.id, { onDelete: 'cascade' }),
  purchaseOrderLineId: text('purchase_order_line_id')
    .notNull()
    .references(() => inventoryPurchaseOrderLines.id),
  binId: text('bin_id')
    .notNull()
    .references(() => inventoryBins.id),
  lotId: text('lot_id').references(() => inventoryLots.id),
  quantity: real('quantity').notNull(),
  movementLineId: text('movement_line_id')
    .notNull()
    .references(() => inventoryMovementLines.id)
});

export const maintenancePartIssues = sqliteTable('maintenance_part_issues', {
  id: text('id').primaryKey(),
  issueNumber: text('issue_number').notNull().unique(),
  maintenanceHandoffId: text('maintenance_handoff_id'),
  aircraftId: text('aircraft_id')
    .notNull()
    .references(() => aircraft.id),
  flightId: text('flight_id'),
  warehouseId: text('warehouse_id')
    .notNull()
    .references(() => inventoryWarehouses.id),
  reason: text('reason').notNull(),
  movementId: text('movement_id')
    .notNull()
    .unique()
    .references(() => inventoryMovements.id),
  status: text('status').notNull(),
  totalPartsValueIdr: integer('total_parts_value_idr').notNull(),
  issuedByUserId: text('issued_by_user_id').notNull(),
  issuedAt: text('issued_at').notNull()
});

export const maintenancePartIssueLines = sqliteTable('maintenance_part_issue_lines', {
  id: text('id').primaryKey(),
  issueId: text('issue_id')
    .notNull()
    .references(() => maintenancePartIssues.id, { onDelete: 'cascade' }),
  partId: text('part_id')
    .notNull()
    .references(() => inventoryParts.id),
  quantity: real('quantity').notNull(),
  baseValueIdr: integer('base_value_idr').notNull(),
  note: text('note')
});

export const inventoryCounts = sqliteTable('inventory_counts', {
  id: text('id').primaryKey(),
  countNumber: text('count_number').notNull().unique(),
  warehouseId: text('warehouse_id')
    .notNull()
    .references(() => inventoryWarehouses.id),
  binId: text('bin_id').references(() => inventoryBins.id),
  reason: text('reason').notNull(),
  status: text('status').notNull(),
  createdByUserId: text('created_by_user_id').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const inventoryCountLines = sqliteTable('inventory_count_lines', {
  id: text('id').primaryKey(),
  countId: text('count_id')
    .notNull()
    .references(() => inventoryCounts.id, { onDelete: 'cascade' }),
  stockBalanceId: text('stock_balance_id')
    .notNull()
    .references(() => inventoryStockBalances.id),
  expectedQuantity: real('expected_quantity').notNull(),
  countedQuantity: real('counted_quantity'),
  varianceQuantity: real('variance_quantity')
});

export const inventoryComponentInstallations = sqliteTable('inventory_component_installations', {
  id: text('id').primaryKey(),
  serialId: text('serial_id')
    .notNull()
    .references(() => inventorySerializedParts.id),
  aircraftId: text('aircraft_id')
    .notNull()
    .references(() => aircraft.id),
  position: text('position').notNull(),
  installedAt: text('installed_at').notNull(),
  removedAt: text('removed_at'),
  hoursAtInstall: real('hours_at_install').notNull(),
  cyclesAtInstall: integer('cycles_at_install').notNull(),
  hoursAtRemove: real('hours_at_remove'),
  cyclesAtRemove: integer('cycles_at_remove'),
  removalReason: text('removal_reason'),
  installedByUserId: text('installed_by_user_id').notNull(),
  removedByUserId: text('removed_by_user_id')
});

export const inventoryRepairOrders = sqliteTable('inventory_repair_orders', {
  id: text('id').primaryKey(),
  repairNumber: text('repair_number').notNull().unique(),
  serialId: text('serial_id')
    .notNull()
    .references(() => inventorySerializedParts.id),
  stationId: text('station_id')
    .notNull()
    .references(() => stations.id),
  vendorId: text('vendor_id')
    .notNull()
    .references(() => vendors.id),
  reason: text('reason').notNull(),
  expectedReturnAt: text('expected_return_at'),
  status: text('status').notNull(),
  sourceRepairCostMinor: integer('source_repair_cost_minor').notNull().default(0),
  currencyId: text('currency_id').references(() => currencies.id),
  exchangeRateToIdrMicros: integer('exchange_rate_to_idr_micros').notNull().default(1000000),
  baseRepairCostIdr: integer('base_repair_cost_idr').notNull().default(0),
  createdByUserId: text('created_by_user_id').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});
