import type Database from 'better-sqlite3';
import type {
  GoodsReceiptDto,
  InventoryAccountingEventDto,
  InventoryCostLayerSummaryDto,
  InventoryCountDto,
  InventoryDashboardDto,
  InventoryListQuery,
  InventoryMovementDto,
  InventoryPartDto,
  InventorySerializedPartDto,
  InventoryStockDto,
  InventoryWarehouseDto,
  MaintenancePartIssueDto,
  PurchaseOrderDto,
  PurchaseRequestDto
} from '../../../shared/features/inventory';

type SqlRow = Record<string, unknown>;

const bool = (value: unknown) => Boolean(Number(value));
const num = (value: unknown) => Number(value ?? 0);
const str = (value: unknown) => (value === null || value === undefined ? null : String(value));

function searchCondition(query: InventoryListQuery, columns: string[]) {
  if (!query.search) return { sql: '', params: [] as unknown[] };
  return {
    sql: ` AND (${columns.map((column) => `${column} LIKE ?`).join(' OR ')})`,
    params: columns.map(() => `%${query.search}%`)
  };
}

function stationScopeCondition(scope: readonly string[], stationAlias = 's') {
  if (scope.includes('ALL')) return { sql: '', params: [] as unknown[] };
  return {
    sql: ` AND ${stationAlias}.station_code IN (${scope.map(() => '?').join(', ')})`,
    params: [...scope]
  };
}

export class InventoryRepository {
  constructor(readonly sqlite: Database.Database) {}

  listParts(query: InventoryListQuery): InventoryPartDto[] {
    const search = searchCondition(query, ['p.part_number', 'p.part_name', 'p.manufacturer']);
    const rows = this.sqlite
      .prepare(
        `SELECT p.* FROM inventory_parts p WHERE 1 = 1 ${search.sql}
         ORDER BY p.part_number LIMIT ? OFFSET ?`
      )
      .all(...search.params, query.limit, query.offset) as SqlRow[];
    const applications = this.sqlite.prepare(
      `SELECT aircraft_type, model, note FROM inventory_part_applicabilities WHERE part_id = ? ORDER BY aircraft_type, model`
    );
    return rows.map((row) => ({
      id: String(row.id),
      partNumber: String(row.part_number),
      partName: String(row.part_name),
      description: str(row.description),
      manufacturer: String(row.manufacturer),
      manufacturerPartNumber: str(row.manufacturer_part_number),
      unitOfMeasure: String(row.unit_of_measure) as InventoryPartDto['unitOfMeasure'],
      lifecycleType: String(row.lifecycle_type) as InventoryPartDto['lifecycleType'],
      trackingType: String(row.tracking_type) as InventoryPartDto['trackingType'],
      criticality: String(row.criticality) as InventoryPartDto['criticality'],
      certificateRequired: bool(row.certificate_required),
      shelfLifeDays: row.shelf_life_days === null ? null : num(row.shelf_life_days),
      aircraftApplicability: (applications.all(row.id) as SqlRow[]).map((item) => ({
        aircraftType: String(item.aircraft_type),
        model: str(item.model),
        note: str(item.note)
      })),
      isActive: bool(row.is_active),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }));
  }

  getPart(id: string) {
    return this.sqlite.prepare('SELECT * FROM inventory_parts WHERE id = ?').get(id) as
      SqlRow | undefined;
  }

  listWarehouses(query: InventoryListQuery, scope: readonly string[]): InventoryWarehouseDto[] {
    const search = searchCondition(query, [
      'w.warehouse_code',
      'w.warehouse_name',
      's.station_code'
    ]);
    const stationScope = stationScopeCondition(scope);
    const params: unknown[] = [];
    let filters = '';
    if (query.stationId) {
      filters += ' AND w.station_id = ?';
      params.push(query.stationId);
    }
    const rows = this.sqlite
      .prepare(
        `SELECT w.*, s.station_code FROM inventory_warehouses w
         JOIN stations s ON s.id = w.station_id WHERE 1 = 1
         ${filters}${stationScope.sql}${search.sql}
         ORDER BY s.station_code, w.warehouse_code LIMIT ? OFFSET ?`
      )
      .all(
        ...params,
        ...stationScope.params,
        ...search.params,
        query.limit,
        query.offset
      ) as SqlRow[];
    const bins = this.sqlite.prepare(
      `SELECT * FROM inventory_bins WHERE warehouse_id = ? ORDER BY bin_type, bin_code`
    );
    return rows.map((row) => ({
      id: String(row.id),
      stationId: String(row.station_id),
      stationCode: String(row.station_code),
      warehouseCode: String(row.warehouse_code),
      warehouseName: String(row.warehouse_name),
      isActive: bool(row.is_active),
      bins: (bins.all(row.id) as SqlRow[]).map((bin) => ({
        id: String(bin.id),
        binCode: String(bin.bin_code),
        binName: String(bin.bin_name),
        binType: String(bin.bin_type) as InventoryWarehouseDto['bins'][number]['binType'],
        isActive: bool(bin.is_active)
      }))
    }));
  }

  listStock(query: InventoryListQuery, scope: readonly string[]): InventoryStockDto[] {
    const search = searchCondition(query, ['p.part_number', 'p.part_name', 'w.warehouse_code']);
    const stationScope = stationScopeCondition(scope);
    const params: unknown[] = [];
    let filters = '';
    if (query.stationId) {
      filters += ' AND w.station_id = ?';
      params.push(query.stationId);
    }
    if (query.warehouseId) {
      filters += ' AND w.id = ?';
      params.push(query.warehouseId);
    }
    const rows = this.sqlite
      .prepare(
        `SELECT b.id, b.part_id, b.bin_id, b.lot_id, b.condition, b.on_hand_quantity,
                p.part_number, p.part_name, p.tracking_type, p.lifecycle_type, p.unit_of_measure,
                p.certificate_required, bin.bin_code, bin.bin_type, w.id warehouse_id,
                w.warehouse_code, w.station_id, s.station_code,
                lot.lot_number, lot.expires_at, lot.certificate_reference, lot.certificate_verified,
                rule.reorder_point,
                ROUND(COALESCE((SELECT SUM(layer.remaining_quantity * layer.base_unit_cost_idr)
                  FROM inventory_cost_layers layer
                  WHERE layer.part_id = b.part_id AND layer.warehouse_id = w.id
                    AND layer.lot_id IS b.lot_id), 0) *
                  CASE WHEN COALESCE((SELECT SUM(bucket.on_hand_quantity)
                    FROM inventory_stock_balances bucket
                    JOIN inventory_bins bucket_bin ON bucket_bin.id = bucket.bin_id
                    WHERE bucket.part_id = b.part_id AND bucket_bin.warehouse_id = w.id
                      AND bucket.lot_id IS b.lot_id), 0) > 0
                  THEN b.on_hand_quantity / (SELECT SUM(bucket.on_hand_quantity)
                    FROM inventory_stock_balances bucket
                    JOIN inventory_bins bucket_bin ON bucket_bin.id = bucket.bin_id
                    WHERE bucket.part_id = b.part_id AND bucket_bin.warehouse_id = w.id
                      AND bucket.lot_id IS b.lot_id)
                  ELSE 0 END) fifo_value_idr,
                CASE WHEN p.tracking_type = 'SERIAL' THEN
                  (SELECT COUNT(*) FROM inventory_serialized_parts serial
                   JOIN inventory_bins serial_bin ON serial_bin.id = serial.bin_id
                   LEFT JOIN inventory_lots serial_lot ON serial_lot.id = serial.lot_id
                   WHERE serial.part_id = b.part_id AND serial_bin.warehouse_id = w.id
                     AND serial.condition = 'SERVICEABLE' AND serial_bin.bin_type = 'USABLE'
                     AND (serial_lot.expires_at IS NULL OR DATE(serial_lot.expires_at) >= DATE('now'))
                     AND (p.certificate_required = 0 OR
                       (serial.certificate_verified = 1 AND serial.certificate_reference IS NOT NULL)))
                ELSE COALESCE((SELECT SUM(sb.on_hand_quantity) FROM inventory_stock_balances sb
                   JOIN inventory_bins sb_bin ON sb_bin.id = sb.bin_id
                   LEFT JOIN inventory_lots sb_lot ON sb_lot.id = sb.lot_id
                   WHERE sb.part_id = b.part_id AND sb_bin.warehouse_id = w.id
                     AND sb.condition = 'SERVICEABLE' AND sb_bin.bin_type = 'USABLE'
                     AND (sb_lot.expires_at IS NULL OR DATE(sb_lot.expires_at) >= DATE('now'))
                     AND (p.certificate_required = 0 OR
                       (sb_lot.certificate_verified = 1 AND sb_lot.certificate_reference IS NOT NULL))), 0)
                END warehouse_available,
                CASE WHEN p.tracking_type = 'SERIAL' THEN
                  (SELECT COUNT(*) FROM inventory_serialized_parts serial
                   LEFT JOIN inventory_lots serial_lot ON serial_lot.id = serial.lot_id
                   WHERE serial.part_id = b.part_id AND serial.bin_id = b.bin_id
                     AND serial.lot_id IS b.lot_id AND serial.condition = 'SERVICEABLE'
                     AND (serial_lot.expires_at IS NULL OR DATE(serial_lot.expires_at) >= DATE('now'))
                     AND (p.certificate_required = 0 OR
                       (serial.certificate_verified = 1 AND serial.certificate_reference IS NOT NULL)))
                ELSE NULL END eligible_serial_quantity
         FROM inventory_stock_balances b
         JOIN inventory_parts p ON p.id = b.part_id
         JOIN inventory_bins bin ON bin.id = b.bin_id
         JOIN inventory_warehouses w ON w.id = bin.warehouse_id
         JOIN stations s ON s.id = w.station_id
         LEFT JOIN inventory_lots lot ON lot.id = b.lot_id
         LEFT JOIN inventory_reorder_rules rule ON rule.part_id = b.part_id AND rule.warehouse_id = w.id
         WHERE 1 = 1 ${filters}${stationScope.sql}${search.sql}
         ORDER BY p.part_number, s.station_code, w.warehouse_code, bin.bin_code`
      )
      .all(...params, ...stationScope.params, ...search.params) as SqlRow[];
    const ruleParams: unknown[] = [];
    let ruleFilters = '';
    if (query.stationId) {
      ruleFilters += ' AND w.station_id = ?';
      ruleParams.push(query.stationId);
    }
    if (query.warehouseId) {
      ruleFilters += ' AND w.id = ?';
      ruleParams.push(query.warehouseId);
    }
    const missingRuleRows = this.sqlite
      .prepare(
        `SELECT rule.id, rule.part_id, rule.reorder_point, p.part_number, p.part_name,
                p.tracking_type, p.lifecycle_type, p.unit_of_measure, p.certificate_required,
                w.id warehouse_id, w.warehouse_code, w.station_id, s.station_code,
                bin.id bin_id, bin.bin_code, bin.bin_type
         FROM inventory_reorder_rules rule
         JOIN inventory_parts p ON p.id = rule.part_id
         JOIN inventory_warehouses w ON w.id = rule.warehouse_id
         JOIN stations s ON s.id = w.station_id
         LEFT JOIN inventory_bins bin ON bin.id = (
           SELECT candidate.id FROM inventory_bins candidate
           WHERE candidate.warehouse_id = w.id AND candidate.bin_type = 'USABLE' AND candidate.is_active = 1
           ORDER BY candidate.bin_code LIMIT 1
         )
         WHERE NOT EXISTS (
           SELECT 1 FROM inventory_stock_balances balance
           JOIN inventory_bins balance_bin ON balance_bin.id = balance.bin_id
           WHERE balance.part_id = rule.part_id AND balance_bin.warehouse_id = rule.warehouse_id
         ) ${ruleFilters}${stationScope.sql}${search.sql}`
      )
      .all(...ruleParams, ...stationScope.params, ...search.params) as SqlRow[];
    const today = new Date().toISOString().slice(0, 10);
    const stockRows: InventoryStockDto[] = rows.map((row) => {
      const certEligible =
        !bool(row.certificate_required) ||
        (bool(row.certificate_verified) && Boolean(row.certificate_reference));
      const eligible =
        row.condition === 'SERVICEABLE' &&
        row.bin_type === 'USABLE' &&
        (row.tracking_type === 'SERIAL' || certEligible) &&
        (!row.expires_at ||
          (!Number.isNaN(Date.parse(`${String(row.expires_at)}T00:00:00.000Z`)) &&
            String(row.expires_at) >= today));
      const reorderPoint = row.reorder_point === null ? null : num(row.reorder_point);
      return {
        id: String(row.id),
        partId: String(row.part_id),
        partNumber: String(row.part_number),
        partName: String(row.part_name),
        trackingType: String(row.tracking_type) as InventoryStockDto['trackingType'],
        lifecycleType: String(row.lifecycle_type) as InventoryStockDto['lifecycleType'],
        unitOfMeasure: String(row.unit_of_measure),
        stationId: String(row.station_id),
        stationCode: String(row.station_code),
        warehouseId: String(row.warehouse_id),
        warehouseCode: String(row.warehouse_code),
        binId: String(row.bin_id),
        binCode: String(row.bin_code),
        binType: String(row.bin_type) as InventoryStockDto['binType'],
        lotId: str(row.lot_id),
        lotNumber: str(row.lot_number),
        expiresAt: str(row.expires_at),
        certificateReference: str(row.certificate_reference),
        certificateVerified: bool(row.certificate_verified),
        condition: String(row.condition) as InventoryStockDto['condition'],
        onHandQuantity: num(row.on_hand_quantity),
        availableQuantity: eligible
          ? row.tracking_type === 'SERIAL'
            ? num(row.eligible_serial_quantity)
            : num(row.on_hand_quantity)
          : 0,
        fifoValueIdr: num(row.fifo_value_idr),
        reorderPoint,
        lowStock: reorderPoint !== null && num(row.warehouse_available) <= reorderPoint
      };
    });
    stockRows.push(
      ...missingRuleRows.map((row) => ({
        id: `reorder:${String(row.id)}`,
        partId: String(row.part_id),
        partNumber: String(row.part_number),
        partName: String(row.part_name),
        trackingType: String(row.tracking_type) as InventoryStockDto['trackingType'],
        lifecycleType: String(row.lifecycle_type) as InventoryStockDto['lifecycleType'],
        unitOfMeasure: String(row.unit_of_measure),
        stationId: String(row.station_id),
        stationCode: String(row.station_code),
        warehouseId: String(row.warehouse_id),
        warehouseCode: String(row.warehouse_code),
        binId: str(row.bin_id) ?? '',
        binCode: str(row.bin_code) ?? 'No usable bin',
        binType: (str(row.bin_type) ?? 'USABLE') as InventoryStockDto['binType'],
        lotId: null,
        lotNumber: null,
        expiresAt: null,
        certificateReference: null,
        certificateVerified: !bool(row.certificate_required),
        condition: 'SERVICEABLE' as const,
        onHandQuantity: 0,
        availableQuantity: 0,
        fifoValueIdr: 0,
        reorderPoint: num(row.reorder_point),
        lowStock: true
      }))
    );
    return stockRows
      .filter((row) => !query.lowStock || row.lowStock)
      .slice(query.offset, query.offset + query.limit);
  }

  listMovements(query: InventoryListQuery, scope: readonly string[]): InventoryMovementDto[] {
    const search = searchCondition(query, ['m.movement_number', 'm.source_type', 'm.reason']);
    const stationScope = scope.includes('ALL')
      ? { sql: '', params: [] as string[] }
      : {
          sql: ` AND (s.station_code IN (${scope.map(() => '?').join(', ')})
                    OR destination.station_code IN (${scope.map(() => '?').join(', ')}))`,
          params: [...scope, ...scope]
        };
    const params: unknown[] = [];
    let filters = '';
    if (query.stationId) {
      filters += ' AND (m.station_id = ? OR m.destination_station_id = ?)';
      params.push(query.stationId, query.stationId);
    }
    if (query.status) {
      filters +=
        query.status === 'REVERSED'
          ? ` AND EXISTS (
                SELECT 1 FROM inventory_movements status_reversal
                WHERE status_reversal.reversal_of_movement_id = m.id
                  AND status_reversal.is_finalized = 1
              )`
          : ` AND NOT EXISTS (
                SELECT 1 FROM inventory_movements status_reversal
                WHERE status_reversal.reversal_of_movement_id = m.id
                  AND status_reversal.is_finalized = 1
              )`;
    }
    const rows = this.sqlite
      .prepare(
        `SELECT m.*,
                CASE WHEN EXISTS (
                  SELECT 1 FROM inventory_movements reversal
                  WHERE reversal.reversal_of_movement_id = m.id AND reversal.is_finalized = 1
                ) THEN 'REVERSED' ELSE m.status END effective_status
         FROM inventory_movements m
         LEFT JOIN stations s ON s.id = m.station_id
         LEFT JOIN stations destination ON destination.id = m.destination_station_id
         WHERE m.is_finalized = 1 ${filters}${stationScope.sql}${search.sql}
         ORDER BY m.created_at DESC, m.movement_number DESC LIMIT ? OFFSET ?`
      )
      .all(
        ...params,
        ...stationScope.params,
        ...search.params,
        query.limit,
        query.offset
      ) as SqlRow[];
    return rows.map((row) => ({
      id: String(row.id),
      movementNumber: String(row.movement_number),
      movementType: String(row.movement_type) as InventoryMovementDto['movementType'],
      sourceType: String(row.source_type),
      sourceId: str(row.source_id),
      stationId: str(row.station_id),
      destinationStationId: str(row.destination_station_id),
      aircraftId: str(row.aircraft_id),
      flightId: str(row.flight_id),
      reason: String(row.reason),
      status: String(row.effective_status) as InventoryMovementDto['status'],
      totalBaseValueIdr: num(row.total_base_value_idr),
      createdByUserId: String(row.created_by_user_id),
      createdAt: String(row.created_at)
    }));
  }

  listPurchaseRequests(query: InventoryListQuery, scope: readonly string[]): PurchaseRequestDto[] {
    const search = searchCondition(query, ['pr.request_number', 'pr.request_reason']);
    const stationScope = stationScopeCondition(scope);
    const params: unknown[] = [];
    let filters = '';
    if (query.stationId) {
      filters += ' AND pr.station_id = ?';
      params.push(query.stationId);
    }
    if (query.status) {
      filters += ' AND pr.status = ?';
      params.push(query.status);
    }
    const rows = this.sqlite
      .prepare(
        `SELECT pr.*, s.station_code FROM inventory_purchase_requests pr
         JOIN stations s ON s.id = pr.station_id WHERE 1 = 1
         ${filters}${stationScope.sql}${search.sql}
         ORDER BY pr.created_at DESC LIMIT ? OFFSET ?`
      )
      .all(
        ...params,
        ...stationScope.params,
        ...search.params,
        query.limit,
        query.offset
      ) as SqlRow[];
    const lines = this.sqlite.prepare(
      `SELECT line.*, p.part_number, p.part_name FROM inventory_purchase_request_lines line
       JOIN inventory_parts p ON p.id = line.part_id WHERE line.purchase_request_id = ? ORDER BY p.part_number`
    );
    return rows.map((row) => ({
      id: String(row.id),
      requestNumber: String(row.request_number),
      stationId: String(row.station_id),
      stationCode: String(row.station_code),
      requestReason: String(row.request_reason),
      status: String(row.status) as PurchaseRequestDto['status'],
      requestedByUserId: String(row.requested_by_user_id),
      createdAt: String(row.created_at),
      lines: (lines.all(row.id) as SqlRow[]).map((line) => ({
        id: String(line.id),
        partId: String(line.part_id),
        partNumber: String(line.part_number),
        partName: String(line.part_name),
        quantity: num(line.quantity),
        orderedQuantity: num(line.ordered_quantity),
        requiredAt: String(line.required_at),
        note: str(line.note)
      }))
    }));
  }

  listPurchaseOrders(query: InventoryListQuery, scope: readonly string[]): PurchaseOrderDto[] {
    const search = searchCondition(query, ['po.order_number', 'v.vendor_name']);
    const stationScope = stationScopeCondition(scope);
    const params: unknown[] = [];
    let filters = '';
    if (query.stationId) {
      filters += ' AND pr.station_id = ?';
      params.push(query.stationId);
    }
    if (query.status) {
      filters += ' AND po.status = ?';
      params.push(query.status);
    }
    const rows = this.sqlite
      .prepare(
        `SELECT po.*, v.vendor_name, c.currency_code FROM inventory_purchase_orders po
         JOIN inventory_purchase_requests pr ON pr.id = po.purchase_request_id
         JOIN stations s ON s.id = pr.station_id
         JOIN vendors v ON v.id = po.vendor_id
         JOIN currencies c ON c.id = po.currency_id
         WHERE 1 = 1 ${filters}${stationScope.sql}${search.sql}
         ORDER BY po.created_at DESC LIMIT ? OFFSET ?`
      )
      .all(
        ...params,
        ...stationScope.params,
        ...search.params,
        query.limit,
        query.offset
      ) as SqlRow[];
    const lines = this.sqlite.prepare(
      `SELECT line.*, p.part_number, p.part_name FROM inventory_purchase_order_lines line
       JOIN inventory_parts p ON p.id = line.part_id WHERE line.purchase_order_id = ? ORDER BY p.part_number`
    );
    return rows.map((row) => ({
      id: String(row.id),
      orderNumber: String(row.order_number),
      purchaseRequestId: String(row.purchase_request_id),
      vendorId: String(row.vendor_id),
      vendorName: String(row.vendor_name),
      currencyId: String(row.currency_id),
      currencyCode: String(row.currency_code),
      exchangeRateToIdrMicros: num(row.exchange_rate_to_idr_micros),
      expectedAt: String(row.expected_at),
      status: String(row.status) as PurchaseOrderDto['status'],
      rejectionReason: str(row.rejection_reason),
      createdByUserId: String(row.created_by_user_id),
      approvedByUserId: str(row.approved_by_user_id),
      createdAt: String(row.created_at),
      lines: (lines.all(row.id) as SqlRow[]).map((line) => ({
        id: String(line.id),
        purchaseRequestLineId: String(line.purchase_request_line_id),
        partId: String(line.part_id),
        partNumber: String(line.part_number),
        partName: String(line.part_name),
        quantity: num(line.quantity),
        receivedQuantity: num(line.received_quantity),
        sourceUnitCostMinor: num(line.source_unit_cost_minor),
        baseUnitCostIdr: num(line.base_unit_cost_idr)
      }))
    }));
  }

  listReceipts(query: InventoryListQuery, scope: readonly string[]): GoodsReceiptDto[] {
    const search = searchCondition(query, [
      'gr.receipt_number',
      'po.order_number',
      'gr.document_reference'
    ]);
    const stationScope = stationScopeCondition(scope);
    const rows = this.sqlite
      .prepare(
        `SELECT gr.*, po.order_number FROM inventory_goods_receipts gr
         JOIN inventory_purchase_orders po ON po.id = gr.purchase_order_id
         JOIN inventory_warehouses w ON w.id = gr.warehouse_id
         JOIN stations s ON s.id = w.station_id
         WHERE 1 = 1 ${stationScope.sql}${search.sql}
         ORDER BY gr.received_at DESC LIMIT ? OFFSET ?`
      )
      .all(...stationScope.params, ...search.params, query.limit, query.offset) as SqlRow[];
    return rows.map((row) => ({
      id: String(row.id),
      receiptNumber: String(row.receipt_number),
      purchaseOrderId: String(row.purchase_order_id),
      orderNumber: String(row.order_number),
      warehouseId: String(row.warehouse_id),
      documentReference: String(row.document_reference),
      receivedAt: String(row.received_at),
      status: String(row.status) as GoodsReceiptDto['status'],
      movementId: String(row.movement_id),
      totalBaseValueIdr: num(row.total_base_value_idr)
    }));
  }

  listIssues(query: InventoryListQuery, scope: readonly string[]): MaintenancePartIssueDto[] {
    const search = searchCondition(query, ['issue.issue_number', 'a.registration_number']);
    const stationScope = stationScopeCondition(scope);
    const rows = this.sqlite
      .prepare(
        `SELECT issue.*, a.registration_number FROM maintenance_part_issues issue
         JOIN aircraft a ON a.id = issue.aircraft_id
         JOIN inventory_warehouses w ON w.id = issue.warehouse_id
         JOIN stations s ON s.id = w.station_id
         WHERE 1 = 1 ${stationScope.sql}${search.sql}
         ORDER BY issue.issued_at DESC LIMIT ? OFFSET ?`
      )
      .all(...stationScope.params, ...search.params, query.limit, query.offset) as SqlRow[];
    const lines = this.sqlite.prepare(
      `SELECT line.*, p.part_number, p.part_name FROM maintenance_part_issue_lines line
       JOIN inventory_parts p ON p.id = line.part_id WHERE line.issue_id = ? ORDER BY p.part_number`
    );
    const serials = this.sqlite.prepare(
      `SELECT serial.serial_number FROM inventory_movement_lines ml
       JOIN inventory_serialized_parts serial ON serial.id = ml.serial_id
       WHERE ml.movement_id = ? AND ml.part_id = ? ORDER BY serial.serial_number`
    );
    return rows.map((row) => ({
      id: String(row.id),
      issueNumber: String(row.issue_number),
      maintenanceHandoffId: str(row.maintenance_handoff_id),
      aircraftId: String(row.aircraft_id),
      aircraftRegistration: String(row.registration_number),
      flightId: str(row.flight_id),
      warehouseId: String(row.warehouse_id),
      movementId: String(row.movement_id),
      status: String(row.status) as MaintenancePartIssueDto['status'],
      totalPartsValueIdr: num(row.total_parts_value_idr),
      issuedAt: String(row.issued_at),
      lines: (lines.all(row.id) as SqlRow[]).map((line) => ({
        id: String(line.id),
        partId: String(line.part_id),
        partNumber: String(line.part_number),
        partName: String(line.part_name),
        quantity: num(line.quantity),
        baseValueIdr: num(line.base_value_idr),
        serialNumbers: (serials.all(row.movement_id, line.part_id) as SqlRow[]).map((serial) =>
          String(serial.serial_number)
        )
      }))
    }));
  }

  listSerialized(
    query: InventoryListQuery,
    scope: readonly string[]
  ): InventorySerializedPartDto[] {
    const search = searchCondition(query, ['serial.serial_number', 'p.part_number', 'p.part_name']);
    const scoped = !scope.includes('ALL');
    const stationFilter = scoped
      ? ` AND (s.station_code IN (${scope.map(() => '?').join(', ')})
          OR aircraft_station.station_code IN (${scope.map(() => '?').join(', ')})
          OR repair_station.station_code IN (${scope.map(() => '?').join(', ')}))`
      : '';
    const stationParams = scoped ? [...scope, ...scope, ...scope] : [];
    const params: unknown[] = [];
    let filters = '';
    if (query.status) {
      filters += ' AND serial.condition = ?';
      params.push(query.status);
    }
    const rows = this.sqlite
      .prepare(
        `SELECT serial.*, p.part_number, p.part_name, bin.bin_code, a.registration_number,
                repair.status repair_order_status
         FROM inventory_serialized_parts serial
         JOIN inventory_parts p ON p.id = serial.part_id
         LEFT JOIN inventory_bins bin ON bin.id = serial.bin_id
         LEFT JOIN inventory_warehouses w ON w.id = bin.warehouse_id
         LEFT JOIN stations s ON s.id = w.station_id
         LEFT JOIN aircraft a ON a.id = serial.aircraft_id
         LEFT JOIN stations aircraft_station ON aircraft_station.id = a.current_station_id
         LEFT JOIN inventory_repair_orders repair ON repair.serial_id = serial.id
           AND repair.status NOT IN ('CLOSED', 'CANCELLED')
         LEFT JOIN stations repair_station ON repair_station.id = repair.station_id
         WHERE 1 = 1 ${filters}${stationFilter}${search.sql}
         ORDER BY p.part_number, serial.serial_number LIMIT ? OFFSET ?`
      )
      .all(...params, ...stationParams, ...search.params, query.limit, query.offset) as SqlRow[];
    return rows.map((row) => ({
      id: String(row.id),
      partId: String(row.part_id),
      partNumber: String(row.part_number),
      partName: String(row.part_name),
      serialNumber: String(row.serial_number),
      condition: String(row.condition) as InventorySerializedPartDto['condition'],
      binId: str(row.bin_id),
      binCode: str(row.bin_code),
      aircraftId: str(row.aircraft_id),
      aircraftRegistration: str(row.registration_number),
      position: str(row.position),
      hoursSinceNew: num(row.hours_since_new),
      cyclesSinceNew: num(row.cycles_since_new),
      certificateReference: str(row.certificate_reference),
      certificateVerified: bool(row.certificate_verified),
      repairOrderStatus: str(row.repair_order_status)
    }));
  }

  listCounts(query: InventoryListQuery, scope: readonly string[]): InventoryCountDto[] {
    const stationScope = stationScopeCondition(scope);
    const rows = this.sqlite
      .prepare(
        `SELECT count.*, w.warehouse_code FROM inventory_counts count
         JOIN inventory_warehouses w ON w.id = count.warehouse_id
         JOIN stations s ON s.id = w.station_id
         WHERE 1 = 1 ${stationScope.sql} ORDER BY count.created_at DESC LIMIT ? OFFSET ?`
      )
      .all(...stationScope.params, query.limit, query.offset) as SqlRow[];
    const lines = this.sqlite.prepare(
      `SELECT line.*, balance.part_id, balance.bin_id, balance.lot_id, balance.condition,
              p.part_number, bin.bin_code, lot.lot_number
       FROM inventory_count_lines line
       JOIN inventory_stock_balances balance ON balance.id = line.stock_balance_id
       JOIN inventory_parts p ON p.id = balance.part_id
       JOIN inventory_bins bin ON bin.id = balance.bin_id
       LEFT JOIN inventory_lots lot ON lot.id = balance.lot_id
       WHERE line.count_id = ? ORDER BY p.part_number, bin.bin_code, lot.lot_number`
    );
    return rows.map((row) => ({
      id: String(row.id),
      countNumber: String(row.count_number),
      warehouseId: String(row.warehouse_id),
      warehouseCode: String(row.warehouse_code),
      binId: str(row.bin_id),
      reason: String(row.reason),
      status: String(row.status) as InventoryCountDto['status'],
      createdAt: String(row.created_at),
      lines: (lines.all(row.id) as SqlRow[]).map((line) => ({
        id: String(line.id),
        stockBalanceId: String(line.stock_balance_id),
        partId: String(line.part_id),
        partNumber: String(line.part_number),
        binId: String(line.bin_id),
        binCode: String(line.bin_code),
        lotId: str(line.lot_id),
        lotNumber: str(line.lot_number),
        condition: String(line.condition) as InventoryCountDto['lines'][number]['condition'],
        expectedQuantity: num(line.expected_quantity),
        countedQuantity: line.counted_quantity === null ? null : num(line.counted_quantity),
        varianceQuantity: line.variance_quantity === null ? null : num(line.variance_quantity)
      }))
    }));
  }

  listAccountingEvents(
    query: InventoryListQuery,
    scope: readonly string[]
  ): InventoryAccountingEventDto[] {
    const stationScope = stationScopeCondition(scope);
    const search = searchCondition(query, [
      'event.event_type',
      'event.source_type',
      'event.source_id'
    ]);
    const rows = this.sqlite
      .prepare(
        `SELECT event.* FROM inventory_accounting_events event
         LEFT JOIN stations s ON s.id = event.station_id
         WHERE 1 = 1 ${stationScope.sql}${search.sql}
         ORDER BY event.created_at DESC LIMIT ? OFFSET ?`
      )
      .all(...stationScope.params, ...search.params, query.limit, query.offset) as SqlRow[];
    return rows.map((row) => ({
      id: String(row.id),
      eventType: String(row.event_type),
      sourceType: String(row.source_type),
      sourceId: String(row.source_id),
      movementId: String(row.movement_id),
      stationId: str(row.station_id),
      aircraftId: str(row.aircraft_id),
      flightId: str(row.flight_id),
      currencyId: str(row.currency_id),
      sourceAmountMinor: num(row.source_amount_minor),
      exchangeRateToIdrMicros: num(row.exchange_rate_to_idr_micros),
      baseAmountIdr: num(row.base_amount_idr),
      integrationStatus: 'PENDING_INTEGRATION',
      payload: JSON.parse(String(row.payload_json)) as Record<string, unknown>,
      createdAt: String(row.created_at)
    }));
  }

  valuationSummary(scope: readonly string[]): InventoryCostLayerSummaryDto[] {
    const stationScope = stationScopeCondition(scope);
    const rows = this.sqlite
      .prepare(
        `SELECT layer.part_id, p.part_number, p.part_name, layer.warehouse_id,
                w.warehouse_code, w.station_id, s.station_code,
                SUM(layer.remaining_quantity) remaining_quantity,
                SUM(layer.remaining_quantity * layer.base_unit_cost_idr) base_value_idr
         FROM inventory_cost_layers layer
         JOIN inventory_parts p ON p.id = layer.part_id
         JOIN inventory_warehouses w ON w.id = layer.warehouse_id
         JOIN stations s ON s.id = w.station_id
         WHERE layer.remaining_quantity > 0 ${stationScope.sql}
         GROUP BY layer.part_id, p.part_number, p.part_name, layer.warehouse_id,
                  w.warehouse_code, w.station_id, s.station_code
         ORDER BY s.station_code, w.warehouse_code, p.part_number`
      )
      .all(...stationScope.params) as SqlRow[];
    return rows.map((row) => ({
      partId: String(row.part_id),
      partNumber: String(row.part_number),
      partName: String(row.part_name),
      warehouseId: String(row.warehouse_id),
      warehouseCode: String(row.warehouse_code),
      stationId: String(row.station_id),
      stationCode: String(row.station_code),
      remainingQuantity: num(row.remaining_quantity),
      baseValueIdr: num(row.base_value_idr)
    }));
  }

  dashboard(scope: readonly string[], canReadValuation: boolean): InventoryDashboardDto {
    const query = { limit: 250, offset: 0 } as InventoryListQuery;
    const stock = this.listStock(query, scope);
    const today = new Date();
    const expiryBoundary = new Date(today.getTime() + 30 * 86_400_000).toISOString().slice(0, 10);
    const stationScope = stationScopeCondition(scope);
    const scalar = (sql: string) =>
      num((this.sqlite.prepare(sql).get(...stationScope.params) as SqlRow | undefined)?.count);
    const valuation = canReadValuation
      ? num(
          (
            this.sqlite
              .prepare(
                `SELECT SUM(layer.remaining_quantity * layer.base_unit_cost_idr) value
                 FROM inventory_cost_layers layer
                 JOIN inventory_warehouses w ON w.id = layer.warehouse_id
                 JOIN stations s ON s.id = w.station_id
                 WHERE layer.remaining_quantity > 0 ${stationScope.sql}`
              )
              .get(...stationScope.params) as SqlRow | undefined
          )?.value
        )
      : null;
    const certificateAlertCount = scalar(
      `SELECT COUNT(DISTINCT balance.id) count
       FROM inventory_stock_balances balance
       JOIN inventory_parts p ON p.id = balance.part_id
       JOIN inventory_bins bin ON bin.id = balance.bin_id
       JOIN inventory_warehouses w ON w.id = bin.warehouse_id
       JOIN stations s ON s.id = w.station_id
       LEFT JOIN inventory_lots lot ON lot.id = balance.lot_id
       WHERE p.certificate_required = 1 AND balance.on_hand_quantity > 0
         AND (lot.id IS NULL OR lot.certificate_reference IS NULL OR lot.certificate_verified = 0)
         ${stationScope.sql}`
    );
    return {
      availablePartCount: new Set(
        stock.filter((row) => row.availableQuantity > 0).map((row) => row.partId)
      ).size,
      lowStockCount: new Set(
        stock.filter((row) => row.lowStock).map((row) => `${row.partId}:${row.warehouseId}`)
      ).size,
      expiringLotCount: stock.filter(
        (row) =>
          row.expiresAt &&
          row.expiresAt >= today.toISOString().slice(0, 10) &&
          row.expiresAt <= expiryBoundary
      ).length,
      certificateAlertCount,
      quarantineItemCount: stock
        .filter((row) => row.condition === 'QUARANTINE')
        .reduce((total, row) => total + row.onHandQuantity, 0),
      openPurchaseRequestCount: scalar(
        `SELECT COUNT(*) count FROM inventory_purchase_requests pr JOIN stations s ON s.id = pr.station_id
         WHERE pr.status IN ('DRAFT', 'SUBMITTED', 'PARTIALLY_ORDERED') ${stationScope.sql}`
      ),
      openPurchaseOrderCount: scalar(
        `SELECT COUNT(*) count FROM inventory_purchase_orders po
         JOIN inventory_purchase_requests pr ON pr.id = po.purchase_request_id
         JOIN stations s ON s.id = pr.station_id
         WHERE po.status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_RECEIVED') ${stationScope.sql}`
      ),
      fifoValuationIdr: valuation,
      recentMovements: this.listMovements({ ...query, limit: 8 }, scope)
    };
  }
}
