import { nanoid } from 'nanoid';
import type { DocumentOwnerType } from '../../../shared/contracts/documents';
import { maintenancePartIssueInputSchema } from '../../../shared/features/inventory';
import type {
  GoodsReceiptInput,
  InstallSerializedPartInput,
  InventoryAdjustmentInput,
  InventoryCountInput,
  InventoryCountLineInput,
  InventoryListQuery,
  InventoryPartInput,
  InventoryReorderRuleInput,
  InventoryTransferInput,
  InventoryWarehouseInput,
  MaintenancePartIssueInput,
  PurchaseOrderInput,
  PurchaseRequestInput,
  RemoveSerializedPartInput,
  RepairOrderInput,
  ReturnServiceableInput
} from '../../../shared/features/inventory';
import { DomainError, notFound } from '../../utils/errors';
import { getApplicationNow } from '../../utils/time';
import { listDocuments } from '../../utils/local-document-storage';
import { InventoryRepository } from './repository';

type SqlRow = Record<string, unknown>;
type PhysicalAllocation = {
  binId: string;
  lotId: string | null;
  serialId: string | null;
  quantity: number;
  condition?: string;
};
type CostAllocation = {
  layerId: string;
  lotId: string | null;
  serialId: string | null;
  receivedAt: string;
  quantity: number;
  sourceUnitCostMinor: number;
  currencyId: string;
  exchangeRateToIdrMicros: number;
  baseUnitCostIdr: number;
};

const now = getApplicationNow;
const num = (value: unknown) => Number(value ?? 0);
const nullable = (value: unknown) => (value === null || value === undefined ? null : String(value));

export class InventoryService {
  constructor(private readonly repository: InventoryRepository) {}

  listParts(query: InventoryListQuery) {
    return this.repository.listParts(query);
  }

  listWarehouses(query: InventoryListQuery, scope: readonly string[]) {
    return this.repository.listWarehouses(query, scope);
  }

  listStock(query: InventoryListQuery, scope: readonly string[]) {
    return this.repository.listStock(query, scope);
  }

  listMovements(query: InventoryListQuery, scope: readonly string[]) {
    return this.repository.listMovements(query, scope);
  }

  listPurchaseRequests(query: InventoryListQuery, scope: readonly string[]) {
    return this.repository.listPurchaseRequests(query, scope);
  }

  listPurchaseOrders(query: InventoryListQuery, scope: readonly string[]) {
    return this.repository.listPurchaseOrders(query, scope);
  }

  listReceipts(query: InventoryListQuery, scope: readonly string[]) {
    return this.repository.listReceipts(query, scope);
  }

  listIssues(query: InventoryListQuery, scope: readonly string[]) {
    return this.repository.listIssues(query, scope);
  }

  listSerialized(query: InventoryListQuery, scope: readonly string[]) {
    return this.repository.listSerialized(query, scope);
  }

  listCounts(query: InventoryListQuery, scope: readonly string[]) {
    return this.repository.listCounts(query, scope);
  }

  listAccountingEvents(query: InventoryListQuery, scope: readonly string[]) {
    return this.repository.listAccountingEvents(query, scope);
  }

  valuationSummary(scope: readonly string[]) {
    return this.repository.valuationSummary(scope);
  }

  dashboard(scope: readonly string[], canReadValuation: boolean) {
    return this.repository.dashboard(scope, canReadValuation);
  }

  createPart(input: InventoryPartInput) {
    const sqlite = this.repository.sqlite;
    this.assertPartTrackingControls(input);
    const createdAt = now();
    const transaction = sqlite.transaction(() => {
      const id = `inv-part-${nanoid(10)}`;
      try {
        sqlite
          .prepare(
            `INSERT INTO inventory_parts (
              id, part_number, part_name, description, manufacturer, manufacturer_part_number,
              unit_of_measure, lifecycle_type, tracking_type, criticality, certificate_required,
              shelf_life_days, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
          )
          .run(
            id,
            input.partNumber,
            input.partName,
            input.description,
            input.manufacturer,
            input.manufacturerPartNumber,
            input.unitOfMeasure,
            input.lifecycleType,
            input.trackingType,
            input.criticality,
            input.certificateRequired ? 1 : 0,
            input.shelfLifeDays,
            createdAt,
            createdAt
          );
      } catch (error) {
        if (String(error).includes('UNIQUE')) {
          throw new DomainError('INVENTORY_PART_DUPLICATE', 'Part number already exists.', 409);
        }
        throw error;
      }
      const insertApplication = sqlite.prepare(
        `INSERT INTO inventory_part_applicabilities (id, part_id, aircraft_type, model, note)
         VALUES (?, ?, ?, ?, ?)`
      );
      for (const application of input.aircraftApplicability) {
        insertApplication.run(
          `inv-app-${nanoid(10)}`,
          id,
          application.aircraftType,
          application.model,
          application.note
        );
      }
      return id;
    });
    const id = transaction.immediate();
    return (
      this.repository.listParts({ search: input.partNumber, limit: 1, offset: 0 })[0] ?? {
        id
      }
    );
  }

  updatePart(id: string, input: InventoryPartInput) {
    const sqlite = this.repository.sqlite;
    this.assertPartTrackingControls(input);
    const existing = this.requirePart(id);
    const hasHistory = Boolean(
      sqlite
        .prepare(
          `SELECT 1 FROM inventory_movement_lines WHERE part_id = ?
           UNION ALL SELECT 1 FROM inventory_stock_balances WHERE part_id = ? LIMIT 1`
        )
        .get(id, id)
    );
    if (hasHistory && existing.tracking_type !== input.trackingType) {
      throw new DomainError(
        'INVENTORY_TRACKING_TYPE_LOCKED',
        'Tracking type cannot change after a part has inventory history.',
        409
      );
    }
    const transaction = sqlite.transaction(() => {
      try {
        sqlite
          .prepare(
            `UPDATE inventory_parts SET
              part_number = ?, part_name = ?, description = ?, manufacturer = ?,
              manufacturer_part_number = ?, unit_of_measure = ?, lifecycle_type = ?,
              tracking_type = ?, criticality = ?, certificate_required = ?, shelf_life_days = ?,
              updated_at = ? WHERE id = ?`
          )
          .run(
            input.partNumber,
            input.partName,
            input.description,
            input.manufacturer,
            input.manufacturerPartNumber,
            input.unitOfMeasure,
            input.lifecycleType,
            input.trackingType,
            input.criticality,
            input.certificateRequired ? 1 : 0,
            input.shelfLifeDays,
            now(),
            id
          );
      } catch (error) {
        if (String(error).includes('UNIQUE')) {
          throw new DomainError('INVENTORY_PART_DUPLICATE', 'Part number already exists.', 409);
        }
        throw error;
      }
      sqlite.prepare(`DELETE FROM inventory_part_applicabilities WHERE part_id = ?`).run(id);
      const insertApplication = sqlite.prepare(
        `INSERT INTO inventory_part_applicabilities (id, part_id, aircraft_type, model, note)
         VALUES (?, ?, ?, ?, ?)`
      );
      for (const application of input.aircraftApplicability) {
        insertApplication.run(
          `inv-app-${nanoid(10)}`,
          id,
          application.aircraftType,
          application.model,
          application.note
        );
      }
    });
    transaction.immediate();
    return this.repository
      .listParts({ search: input.partNumber, limit: 250, offset: 0 })
      .find((part) => part.id === id)!;
  }

  createWarehouse(input: InventoryWarehouseInput, scope: readonly string[]) {
    const sqlite = this.repository.sqlite;
    this.requireStationScope(input.stationId, scope);
    const createdAt = now();
    const transaction = sqlite.transaction(() => {
      const id = `inv-wh-${nanoid(10)}`;
      try {
        sqlite
          .prepare(
            `INSERT INTO inventory_warehouses
             (id, station_id, warehouse_code, warehouse_name, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, 1, ?, ?)`
          )
          .run(id, input.stationId, input.warehouseCode, input.warehouseName, createdAt, createdAt);
        const insertBin = sqlite.prepare(
          `INSERT INTO inventory_bins
           (id, warehouse_id, bin_code, bin_name, bin_type, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 1, ?, ?)`
        );
        for (const bin of input.bins) {
          insertBin.run(
            `inv-bin-${nanoid(10)}`,
            id,
            bin.binCode,
            bin.binName,
            bin.binType,
            createdAt,
            createdAt
          );
        }
      } catch (error) {
        if (String(error).includes('UNIQUE')) {
          throw new DomainError(
            'INVENTORY_WAREHOUSE_DUPLICATE',
            'Warehouse or bin code already exists.',
            409
          );
        }
        throw error;
      }
      return id;
    });
    const id = transaction.immediate();
    return this.repository
      .listWarehouses({ search: input.warehouseCode, limit: 1, offset: 0 }, scope)
      .find((warehouse) => warehouse.id === id);
  }

  upsertReorderRule(input: InventoryReorderRuleInput, scope: readonly string[]) {
    const warehouse = this.requireWarehouse(input.warehouseId, scope);
    this.requirePart(input.partId);
    if (input.minimumQuantity > input.reorderPoint || input.reorderPoint > input.maximumQuantity) {
      throw new DomainError(
        'INVENTORY_REORDER_RANGE_INVALID',
        'Minimum quantity must be at or below reorder point and maximum quantity.',
        422
      );
    }
    const timestamp = now();
    this.repository.sqlite
      .prepare(
        `INSERT INTO inventory_reorder_rules
         (id, part_id, warehouse_id, minimum_quantity, reorder_point, maximum_quantity,
          lead_time_days, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(part_id, warehouse_id) DO UPDATE SET
           minimum_quantity = excluded.minimum_quantity,
           reorder_point = excluded.reorder_point,
           maximum_quantity = excluded.maximum_quantity,
           lead_time_days = excluded.lead_time_days,
           updated_at = excluded.updated_at`
      )
      .run(
        `inv-rule-${nanoid(10)}`,
        input.partId,
        warehouse.id,
        input.minimumQuantity,
        input.reorderPoint,
        input.maximumQuantity,
        input.leadTimeDays,
        timestamp,
        timestamp
      );
    return this.repository.listStock(
      { warehouseId: input.warehouseId, limit: 250, offset: 0 },
      scope
    );
  }

  createPurchaseRequest(
    input: PurchaseRequestInput,
    actorUserId: string,
    scope: readonly string[]
  ) {
    const sqlite = this.repository.sqlite;
    this.requireStationScope(input.stationId, scope);
    const timestamp = now();
    const id = `inv-pr-${nanoid(10)}`;
    const transaction = sqlite.transaction(() => {
      for (const line of input.lines) {
        const part = this.requirePart(line.partId);
        this.validateQuantity(part, line.quantity);
      }
      sqlite
        .prepare(
          `INSERT INTO inventory_purchase_requests
           (id, request_number, station_id, request_reason, status, requested_by_user_id,
            created_at, updated_at) VALUES (?, ?, ?, ?, 'DRAFT', ?, ?, ?)`
        )
        .run(
          id,
          this.nextNumber('PR', 'inventory_purchase_requests'),
          input.stationId,
          input.requestReason,
          actorUserId,
          timestamp,
          timestamp
        );
      const insertLine = sqlite.prepare(
        `INSERT INTO inventory_purchase_request_lines
         (id, purchase_request_id, part_id, quantity, ordered_quantity, required_at, note)
         VALUES (?, ?, ?, ?, 0, ?, ?)`
      );
      for (const line of input.lines) {
        insertLine.run(
          `inv-prl-${nanoid(10)}`,
          id,
          line.partId,
          line.quantity,
          line.requiredAt,
          line.note
        );
      }
    });
    transaction.immediate();
    return this.requirePurchaseRequest(id, scope);
  }

  submitPurchaseRequest(id: string, scope: readonly string[]) {
    const request = this.requirePurchaseRequestRow(id, scope);
    if (request.status === 'SUBMITTED') return this.requirePurchaseRequest(id, scope);
    if (request.status !== 'DRAFT') {
      throw new DomainError(
        'INVENTORY_PR_TRANSITION_INVALID',
        'Only a draft purchase request can be submitted.',
        409
      );
    }
    this.repository.sqlite
      .prepare(
        `UPDATE inventory_purchase_requests SET status = 'SUBMITTED', updated_at = ? WHERE id = ?`
      )
      .run(now(), id);
    return this.requirePurchaseRequest(id, scope);
  }

  createPurchaseOrder(input: PurchaseOrderInput, actorUserId: string, scope: readonly string[]) {
    const sqlite = this.repository.sqlite;
    const request = this.requirePurchaseRequestRow(input.purchaseRequestId, scope);
    if (!['SUBMITTED', 'PARTIALLY_ORDERED'].includes(String(request.status))) {
      throw new DomainError(
        'INVENTORY_PR_NOT_ORDERABLE',
        'Purchase request must be submitted before creating an order.',
        409
      );
    }
    this.requireActiveReference('vendors', input.vendorId, 'Vendor');
    this.requireActiveReference('currencies', input.currencyId, 'Currency');
    const id = `inv-po-${nanoid(10)}`;
    const timestamp = now();
    const transaction = sqlite.transaction(() => {
      sqlite
        .prepare(
          `INSERT INTO inventory_purchase_orders
           (id, order_number, purchase_request_id, vendor_id, currency_id,
            exchange_rate_to_idr_micros, expected_at, status, rejection_reason,
            created_by_user_id, approved_by_user_id, approved_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'DRAFT', NULL, ?, NULL, NULL, ?, ?)`
        )
        .run(
          id,
          this.nextNumber('PO', 'inventory_purchase_orders'),
          input.purchaseRequestId,
          input.vendorId,
          input.currencyId,
          input.exchangeRateToIdrMicros,
          input.expectedAt,
          actorUserId,
          timestamp,
          timestamp
        );
      const getRequestLine = sqlite.prepare(
        `SELECT * FROM inventory_purchase_request_lines WHERE id = ? AND purchase_request_id = ?`
      );
      const insertLine = sqlite.prepare(
        `INSERT INTO inventory_purchase_order_lines
         (id, purchase_order_id, purchase_request_line_id, part_id, quantity,
          received_quantity, source_unit_cost_minor, base_unit_cost_idr)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)`
      );
      const updateRequested = sqlite.prepare(
        `UPDATE inventory_purchase_request_lines SET ordered_quantity = ordered_quantity + ? WHERE id = ?`
      );
      for (const line of input.lines) {
        const requestLine = getRequestLine.get(
          line.purchaseRequestLineId,
          input.purchaseRequestId
        ) as SqlRow | undefined;
        if (!requestLine) throw notFound('Purchase request line', line.purchaseRequestLineId);
        const remaining = num(requestLine.quantity) - num(requestLine.ordered_quantity);
        if (line.quantity > remaining + 1e-9) {
          throw new DomainError(
            'INVENTORY_PO_OVER_ORDER',
            'Purchase order quantity exceeds the unallocated request quantity.',
            422
          );
        }
        const part = this.requirePart(String(requestLine.part_id));
        this.validateQuantity(part, line.quantity);
        insertLine.run(
          `inv-pol-${nanoid(10)}`,
          id,
          line.purchaseRequestLineId,
          requestLine.part_id,
          line.quantity,
          line.sourceUnitCostMinor,
          this.convertToIdr(
            line.sourceUnitCostMinor,
            input.currencyId,
            input.exchangeRateToIdrMicros
          )
        );
        updateRequested.run(line.quantity, line.purchaseRequestLineId);
      }
      const remaining = num(
        (
          sqlite
            .prepare(
              `SELECT SUM(quantity - ordered_quantity) remaining
               FROM inventory_purchase_request_lines WHERE purchase_request_id = ?`
            )
            .get(input.purchaseRequestId) as SqlRow
        ).remaining
      );
      sqlite
        .prepare(`UPDATE inventory_purchase_requests SET status = ?, updated_at = ? WHERE id = ?`)
        .run(
          remaining <= 1e-9 ? 'ORDERED' : 'PARTIALLY_ORDERED',
          timestamp,
          input.purchaseRequestId
        );
    });
    transaction.immediate();
    return this.requirePurchaseOrder(id, scope);
  }

  submitPurchaseOrder(id: string, scope: readonly string[]) {
    const order = this.requirePurchaseOrderRow(id, scope);
    if (order.status === 'PENDING_APPROVAL') return this.requirePurchaseOrder(id, scope);
    if (order.status !== 'DRAFT') {
      throw new DomainError(
        'INVENTORY_PO_TRANSITION_INVALID',
        'Only a draft purchase order can be submitted.',
        409
      );
    }
    this.repository.sqlite
      .prepare(
        `UPDATE inventory_purchase_orders SET status = 'PENDING_APPROVAL', updated_at = ? WHERE id = ?`
      )
      .run(now(), id);
    return this.requirePurchaseOrder(id, scope);
  }

  approvePurchaseOrder(id: string, actorUserId: string, scope: readonly string[]) {
    const order = this.requirePurchaseOrderRow(id, scope);
    if (order.status === 'APPROVED') return this.requirePurchaseOrder(id, scope);
    if (order.status !== 'PENDING_APPROVAL') {
      throw new DomainError(
        'INVENTORY_PO_APPROVAL_INVALID',
        'Only an order pending approval can be approved.',
        409
      );
    }
    const timestamp = now();
    this.repository.sqlite
      .prepare(
        `UPDATE inventory_purchase_orders SET status = 'APPROVED', approved_by_user_id = ?,
         approved_at = ?, rejection_reason = NULL, updated_at = ? WHERE id = ?`
      )
      .run(actorUserId, timestamp, timestamp, id);
    return this.requirePurchaseOrder(id, scope);
  }

  rejectPurchaseOrder(id: string, reason: string, actorUserId: string, scope: readonly string[]) {
    const order = this.requirePurchaseOrderRow(id, scope);
    if (order.status !== 'PENDING_APPROVAL') {
      throw new DomainError(
        'INVENTORY_PO_REJECTION_INVALID',
        'Only an order pending approval can be rejected.',
        409
      );
    }
    const sqlite = this.repository.sqlite;
    const timestamp = now();
    const transaction = sqlite.transaction(() => {
      const allocations = sqlite
        .prepare(
          `SELECT purchase_request_line_id, SUM(quantity) quantity
           FROM inventory_purchase_order_lines WHERE purchase_order_id = ?
           GROUP BY purchase_request_line_id`
        )
        .all(id) as SqlRow[];
      for (const allocation of allocations) {
        sqlite
          .prepare(
            `UPDATE inventory_purchase_request_lines
             SET ordered_quantity = MAX(0, ordered_quantity - ?) WHERE id = ?`
          )
          .run(allocation.quantity, allocation.purchase_request_line_id);
      }
      const progress = sqlite
        .prepare(
          `SELECT SUM(ordered_quantity) ordered, SUM(quantity - ordered_quantity) remaining
           FROM inventory_purchase_request_lines WHERE purchase_request_id = ?`
        )
        .get(order.purchase_request_id) as SqlRow;
      const requestStatus =
        num(progress.ordered) <= 1e-9
          ? 'SUBMITTED'
          : num(progress.remaining) <= 1e-9
            ? 'ORDERED'
            : 'PARTIALLY_ORDERED';
      sqlite
        .prepare(`UPDATE inventory_purchase_requests SET status = ?, updated_at = ? WHERE id = ?`)
        .run(requestStatus, timestamp, order.purchase_request_id);
      sqlite
        .prepare(
          `UPDATE inventory_purchase_orders SET status = 'REJECTED', approved_by_user_id = ?,
           approved_at = ?, rejection_reason = ?, updated_at = ? WHERE id = ?`
        )
        .run(actorUserId, timestamp, reason, timestamp, id);
    });
    transaction.immediate();
    return this.requirePurchaseOrder(id, scope);
  }

  async postGoodsReceipt(input: GoodsReceiptInput, actorUserId: string, scope: readonly string[]) {
    const sqlite = this.repository.sqlite;
    const order = this.requirePurchaseOrderRow(input.purchaseOrderId, scope);
    if (!['APPROVED', 'PARTIALLY_RECEIVED'].includes(String(order.status))) {
      throw new DomainError(
        'INVENTORY_PO_NOT_RECEIVABLE',
        'Goods can only be received against an approved purchase order.',
        409
      );
    }
    const warehouse = this.requireWarehouse(input.warehouseId, scope);
    if (String(order.station_id) !== String(warehouse.station_id)) {
      throw new DomainError(
        'INVENTORY_RECEIPT_STATION_MISMATCH',
        'Goods must be received at the purchase-request station.',
        422
      );
    }
    const receiptId = `inv-gr-${nanoid(10)}`;
    const movementId = `inv-move-${nanoid(10)}`;
    const timestamp = now();
    const verifiedCertificateLines = new Set<number>();
    const receiptQuantityByOrderLine = new Map<string, number>();
    for (const [lineIndex, line] of input.lines.entries()) {
      receiptQuantityByOrderLine.set(
        line.purchaseOrderLineId,
        (receiptQuantityByOrderLine.get(line.purchaseOrderLineId) ?? 0) + line.quantity
      );
      if (line.manufacturedAt) this.assertDateOnly(line.manufacturedAt, 'Manufactured date');
      if (line.expiresAt) this.assertDateOnly(line.expiresAt, 'Expiry date');
      const orderLine = sqlite
        .prepare(
          `SELECT line.part_id, p.certificate_required
           FROM inventory_purchase_order_lines line
           JOIN inventory_parts p ON p.id = line.part_id
           WHERE line.id = ? AND line.purchase_order_id = ?`
        )
        .get(line.purchaseOrderLineId, input.purchaseOrderId) as SqlRow | undefined;
      if (!orderLine) throw notFound('Purchase order line', line.purchaseOrderLineId);
      const bin = this.requireBin(line.binId, input.warehouseId);
      if (Boolean(orderLine.certificate_required) && bin.bin_type === 'USABLE') {
        if (!line.certificateReference) {
          throw new DomainError(
            'INVENTORY_CERTIFICATE_REFERENCE_REQUIRED',
            'Certificate-controlled stock requires an explicit certificate reference.',
            422
          );
        }
        await this.requireVerifiedCertificateDocument(
          String(orderLine.part_id),
          line.certificateReference,
          [{ ownerType: 'inventory_part', ownerId: String(orderLine.part_id) }]
        );
        verifiedCertificateLines.add(lineIndex);
      }
    }
    const transaction = sqlite.transaction(() => {
      const getOrderLine = sqlite.prepare(
        `SELECT line.*, p.tracking_type, p.unit_of_measure, p.certificate_required,
                p.shelf_life_days,
                p.part_number, p.part_name
         FROM inventory_purchase_order_lines line
         JOIN inventory_parts p ON p.id = line.part_id
         WHERE line.id = ? AND line.purchase_order_id = ?`
      );
      const prepared = input.lines.map((line, lineIndex) => {
        const orderLine = getOrderLine.get(line.purchaseOrderLineId, input.purchaseOrderId) as
          SqlRow | undefined;
        if (!orderLine) throw notFound('Purchase order line', line.purchaseOrderLineId);
        const remaining = num(orderLine.quantity) - num(orderLine.received_quantity);
        if (
          (receiptQuantityByOrderLine.get(line.purchaseOrderLineId) ?? line.quantity) >
          remaining + 1e-9
        ) {
          throw new DomainError(
            'INVENTORY_RECEIPT_OVER_PO',
            `Receipt for ${String(orderLine.part_number)} exceeds the outstanding PO quantity.`,
            422
          );
        }
        this.validateQuantity(orderLine, line.quantity);
        const bin = this.requireBin(line.binId, input.warehouseId);
        const tracking = String(orderLine.tracking_type);
        this.assertStoredPartTrackingControls(orderLine);
        if (
          (tracking === 'LOT' || (tracking === 'SERIAL' && orderLine.shelf_life_days)) &&
          !line.lotNumber
        ) {
          throw new DomainError(
            'INVENTORY_LOT_REQUIRED',
            `Lot number is required for ${String(orderLine.part_number)}.`,
            422
          );
        }
        if (orderLine.shelf_life_days && tracking !== 'QUANTITY' && !line.expiresAt) {
          throw new DomainError(
            'INVENTORY_EXPIRY_REQUIRED',
            `Expiry date is required for shelf-life part ${String(orderLine.part_number)}.`,
            422
          );
        }
        if (tracking === 'SERIAL') {
          if (!Number.isInteger(line.quantity) || line.serialNumbers.length !== line.quantity) {
            throw new DomainError(
              'INVENTORY_SERIAL_QUANTITY_MISMATCH',
              'Serialized receipt quantity must match the number of serial numbers.',
              422
            );
          }
          if (new Set(line.serialNumbers).size !== line.serialNumbers.length) {
            throw new DomainError(
              'INVENTORY_SERIAL_DUPLICATE',
              'Serial numbers in a receipt must be unique.',
              409
            );
          }
        } else if (line.serialNumbers.length) {
          throw new DomainError(
            'INVENTORY_SERIAL_NOT_ALLOWED',
            'Serial numbers are only valid for serial-controlled parts.',
            422
          );
        }
        if (
          Boolean(orderLine.certificate_required) &&
          bin.bin_type === 'USABLE' &&
          !verifiedCertificateLines.has(lineIndex)
        ) {
          throw new DomainError(
            'INVENTORY_CERTIFICATE_REQUIRED',
            'Certificate-controlled parts must be received into quarantine until verified.',
            422
          );
        }
        if (line.expiresAt && line.expiresAt < input.receivedAt.slice(0, 10)) {
          throw new DomainError(
            'INVENTORY_RECEIPT_EXPIRED',
            'Expired stock cannot be received as available inventory.',
            422
          );
        }
        const baseUnitCostIdr = num(orderLine.base_unit_cost_idr);
        const certificateVerified = verifiedCertificateLines.has(lineIndex);
        return { line, orderLine, bin, tracking, baseUnitCostIdr, certificateVerified };
      });
      const totalBaseValueIdr = prepared.reduce(
        (total, item) => total + Math.round(item.line.quantity * item.baseUnitCostIdr),
        0
      );
      const movementNumber = this.nextNumber('MOV', 'inventory_movements');
      sqlite
        .prepare(
          `INSERT INTO inventory_movements
           (id, movement_number, movement_type, source_type, source_id, station_id, aircraft_id,
            flight_id, reason, status, reversal_of_movement_id, total_base_value_idr,
            is_finalized, created_by_user_id, created_at)
           VALUES (?, ?, 'RECEIPT', 'GOODS_RECEIPT', ?, ?, NULL, NULL, ?, 'POSTED', NULL, ?, 0, ?, ?)`
        )
        .run(
          movementId,
          movementNumber,
          receiptId,
          warehouse.station_id,
          `Posted receipt for ${String(order.order_number)}.`,
          totalBaseValueIdr,
          actorUserId,
          timestamp
        );
      sqlite
        .prepare(
          `INSERT INTO inventory_goods_receipts
           (id, receipt_number, purchase_order_id, warehouse_id, document_reference, received_at,
            status, movement_id, total_base_value_idr, received_by_user_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'POSTED', ?, ?, ?, ?)`
        )
        .run(
          receiptId,
          this.nextNumber('GR', 'inventory_goods_receipts'),
          input.purchaseOrderId,
          input.warehouseId,
          input.documentReference,
          input.receivedAt,
          movementId,
          totalBaseValueIdr,
          actorUserId,
          timestamp
        );

      for (const item of prepared) {
        const { line, orderLine, bin, tracking, baseUnitCostIdr, certificateVerified } = item;
        let lotId: string | null = null;
        if (line.lotNumber) {
          const existingLot = sqlite
            .prepare(`SELECT * FROM inventory_lots WHERE part_id = ? AND lot_number = ?`)
            .get(orderLine.part_id, line.lotNumber) as SqlRow | undefined;
          if (
            existingLot &&
            ((line.expiresAt && nullable(existingLot.expires_at) !== line.expiresAt) ||
              (line.manufacturedAt &&
                nullable(existingLot.manufactured_at) !== line.manufacturedAt) ||
              (line.certificateReference &&
                existingLot.certificate_reference &&
                nullable(existingLot.certificate_reference) !== line.certificateReference))
          ) {
            throw new DomainError(
              'INVENTORY_LOT_METADATA_MISMATCH',
              `Lot ${line.lotNumber} already exists with different traceability data.`,
              409
            );
          }
          lotId = existingLot ? String(existingLot.id) : `inv-lot-${nanoid(10)}`;
          if (!existingLot) {
            sqlite
              .prepare(
                `INSERT INTO inventory_lots
                 (id, part_id, lot_number, manufactured_at, expires_at, certificate_reference,
                  certificate_verified, receipt_line_id, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)`
              )
              .run(
                lotId,
                orderLine.part_id,
                line.lotNumber,
                line.manufacturedAt,
                line.expiresAt,
                line.certificateReference,
                certificateVerified ? 1 : 0,
                timestamp
              );
          } else if (certificateVerified) {
            sqlite
              .prepare(
                `UPDATE inventory_lots SET certificate_reference = ?, certificate_verified = 1
                 WHERE id = ?`
              )
              .run(line.certificateReference, lotId);
          }
        }
        const serialEntries = tracking === 'SERIAL' ? line.serialNumbers : [null];
        const entryQuantity = tracking === 'SERIAL' ? 1 : line.quantity;
        for (const serialNumber of serialEntries) {
          const serialId = serialNumber ? `inv-serial-${nanoid(10)}` : null;
          if (serialId) {
            try {
              sqlite
                .prepare(
                  `INSERT INTO inventory_serialized_parts
                   (id, part_id, serial_number, lot_id, bin_id, condition, aircraft_id, position,
                    hours_since_new, cycles_since_new, certificate_reference, certificate_verified,
                    created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, 0, 0, ?, ?, ?, ?)`
                )
                .run(
                  serialId,
                  orderLine.part_id,
                  serialNumber,
                  lotId,
                  line.binId,
                  bin.bin_type === 'USABLE' ? 'SERVICEABLE' : 'QUARANTINE',
                  line.certificateReference,
                  certificateVerified ? 1 : 0,
                  timestamp,
                  timestamp
                );
            } catch (error) {
              if (String(error).includes('UNIQUE')) {
                throw new DomainError(
                  'INVENTORY_SERIAL_DUPLICATE',
                  `Serial number ${serialNumber} already exists.`,
                  409
                );
              }
              throw error;
            }
          }
          const movementLineId = `inv-ml-${nanoid(10)}`;
          const condition = bin.bin_type === 'USABLE' ? 'SERVICEABLE' : 'QUARANTINE';
          sqlite
            .prepare(
              `INSERT INTO inventory_movement_lines
               (id, movement_id, part_id, from_bin_id, to_bin_id, lot_id, serial_id,
                condition_from, condition_to, quantity, source_unit_cost_minor, currency_id,
                exchange_rate_to_idr_micros, base_unit_cost_idr, base_value_idr)
               VALUES (?, ?, ?, NULL, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              movementLineId,
              movementId,
              orderLine.part_id,
              line.binId,
              lotId,
              serialId,
              condition,
              entryQuantity,
              orderLine.source_unit_cost_minor,
              order.currency_id,
              order.exchange_rate_to_idr_micros,
              baseUnitCostIdr,
              Math.round(entryQuantity * baseUnitCostIdr)
            );
          this.changeBalance(
            String(orderLine.part_id),
            line.binId,
            lotId,
            condition,
            entryQuantity
          );
          sqlite
            .prepare(
              `INSERT INTO inventory_cost_layers
               (id, part_id, warehouse_id, lot_id, serial_id, source_movement_line_id,
                original_quantity, remaining_quantity, source_unit_cost_minor, currency_id,
                exchange_rate_to_idr_micros, base_unit_cost_idr, received_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              `inv-layer-${nanoid(10)}`,
              orderLine.part_id,
              input.warehouseId,
              lotId,
              serialId,
              movementLineId,
              entryQuantity,
              entryQuantity,
              orderLine.source_unit_cost_minor,
              order.currency_id,
              order.exchange_rate_to_idr_micros,
              baseUnitCostIdr,
              input.receivedAt
            );
          sqlite
            .prepare(
              `INSERT INTO inventory_goods_receipt_lines
               (id, goods_receipt_id, purchase_order_line_id, bin_id, lot_id, quantity,
                movement_line_id) VALUES (?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              `inv-grl-${nanoid(10)}`,
              receiptId,
              line.purchaseOrderLineId,
              line.binId,
              lotId,
              entryQuantity,
              movementLineId
            );
        }
        sqlite
          .prepare(
            `UPDATE inventory_purchase_order_lines
             SET received_quantity = received_quantity + ? WHERE id = ?`
          )
          .run(line.quantity, line.purchaseOrderLineId);
      }
      this.finalizeMovement(movementId, totalBaseValueIdr);
      const outstanding = num(
        (
          sqlite
            .prepare(
              `SELECT SUM(quantity - received_quantity) outstanding
               FROM inventory_purchase_order_lines WHERE purchase_order_id = ?`
            )
            .get(input.purchaseOrderId) as SqlRow
        ).outstanding
      );
      sqlite
        .prepare(`UPDATE inventory_purchase_orders SET status = ?, updated_at = ? WHERE id = ?`)
        .run(
          outstanding <= 1e-9 ? 'RECEIVED' : 'PARTIALLY_RECEIVED',
          timestamp,
          input.purchaseOrderId
        );
      this.createAccountingEvent({
        eventType: 'INVENTORY_RECEIPT',
        sourceType: 'GOODS_RECEIPT',
        sourceId: receiptId,
        movementId,
        stationId: String(warehouse.station_id),
        currencyId: String(order.currency_id),
        sourceAmountMinor: prepared.reduce(
          (total, item) =>
            total + Math.round(item.line.quantity * num(item.orderLine.source_unit_cost_minor)),
          0
        ),
        exchangeRateToIdrMicros: num(order.exchange_rate_to_idr_micros),
        baseAmountIdr: totalBaseValueIdr,
        payload: {
          purchaseOrderId: input.purchaseOrderId,
          documentReference: input.documentReference
        }
      });
    });
    transaction.immediate();
    return (
      this.repository
        .listReceipts({ search: receiptId, limit: 250, offset: 0 }, scope)
        .find((receipt) => receipt.id === receiptId) ?? this.requireReceipt(receiptId, scope)
    );
  }

  async transfer(input: InventoryTransferInput, actorUserId: string, scope: readonly string[]) {
    const sqlite = this.repository.sqlite;
    const fromBin = this.requireBin(input.fromBinId);
    const toBin = this.requireBin(input.toBinId);
    const fromWarehouse = this.requireWarehouse(String(fromBin.warehouse_id), scope);
    const toWarehouse = this.requireWarehouse(String(toBin.warehouse_id), scope);
    const part = this.requirePart(input.partId);
    this.validateQuantity(part, input.quantity);
    if (input.fromBinId === input.toBinId) {
      throw new DomainError(
        'INVENTORY_TRANSFER_SAME_BIN',
        'Source and destination bins must be different.',
        422
      );
    }
    const physical = this.pickTransferStock(
      input.partId,
      input.fromBinId,
      input.quantity,
      input.serialIds,
      input.lotId
    );
    if (toBin.bin_type === 'USABLE') {
      this.assertUsableTransferLifecycle(physical);
      await this.assertTransferEligible(part, physical);
    }
    const transaction = sqlite.transaction(() => {
      const sameWarehouse = String(fromWarehouse.id) === String(toWarehouse.id);
      const costs = this.consumeFifo(
        input.partId,
        String(fromWarehouse.id),
        input.quantity,
        input.serialIds,
        !sameWarehouse
      );
      const movementId = this.insertMovement({
        movementType: 'TRANSFER',
        sourceType: 'INVENTORY_TRANSFER',
        sourceId: `transfer-${nanoid(10)}`,
        stationId: String(fromWarehouse.station_id),
        destinationStationId: String(toWarehouse.station_id),
        reason: input.reason,
        actorUserId
      });
      const chunks = this.combineAllocations(physical, costs);
      let total = 0;
      for (const chunk of chunks) {
        const fromCondition =
          chunk.physical.condition ??
          String(
            (
              sqlite
                .prepare(
                  `SELECT condition FROM inventory_stock_balances
                   WHERE part_id = ? AND bin_id = ? AND lot_key = ? LIMIT 1`
                )
                .get(input.partId, chunk.physical.binId, chunk.physical.lotId ?? '') as SqlRow
            ).condition
          );
        const toCondition =
          toBin.bin_type === 'USABLE'
            ? 'SERVICEABLE'
            : fromCondition === 'UNSERVICEABLE'
              ? 'UNSERVICEABLE'
              : 'QUARANTINE';
        this.changeBalance(
          input.partId,
          chunk.physical.binId,
          chunk.physical.lotId,
          fromCondition,
          -chunk.quantity
        );
        this.changeBalance(
          input.partId,
          input.toBinId,
          chunk.physical.lotId,
          toCondition,
          chunk.quantity
        );
        const value = Math.round(chunk.quantity * chunk.cost.baseUnitCostIdr);
        total += value;
        const movementLineId = this.insertMovementLine({
          movementId,
          partId: input.partId,
          fromBinId: chunk.physical.binId,
          toBinId: input.toBinId,
          lotId: chunk.physical.lotId,
          serialId: chunk.physical.serialId,
          conditionFrom: fromCondition,
          conditionTo: toCondition,
          quantity: chunk.quantity,
          cost: chunk.cost
        });
        if (!sameWarehouse) {
          sqlite
            .prepare(
              `INSERT INTO inventory_cost_layers
               (id, part_id, warehouse_id, lot_id, serial_id, source_movement_line_id,
                original_quantity, remaining_quantity, source_unit_cost_minor, currency_id,
                exchange_rate_to_idr_micros, base_unit_cost_idr, received_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              `inv-layer-${nanoid(10)}`,
              input.partId,
              toWarehouse.id,
              chunk.physical.lotId,
              chunk.physical.serialId,
              movementLineId,
              chunk.quantity,
              chunk.quantity,
              chunk.cost.sourceUnitCostMinor,
              chunk.cost.currencyId,
              chunk.cost.exchangeRateToIdrMicros,
              chunk.cost.baseUnitCostIdr,
              chunk.cost.receivedAt
            );
        }
        if (chunk.physical.serialId) {
          sqlite
            .prepare(
              `UPDATE inventory_serialized_parts
               SET bin_id = ?, condition = ?,
                   certificate_verified = CASE WHEN ? = 'SERVICEABLE' THEN 1 ELSE certificate_verified END,
                   updated_at = ? WHERE id = ?`
            )
            .run(input.toBinId, toCondition, toCondition, now(), chunk.physical.serialId);
        } else if (chunk.physical.lotId && toCondition === 'SERVICEABLE') {
          sqlite
            .prepare(`UPDATE inventory_lots SET certificate_verified = 1 WHERE id = ?`)
            .run(chunk.physical.lotId);
        }
      }
      this.finalizeMovement(movementId, total);
      return movementId;
    });
    const movementId = transaction.immediate();
    return this.repository
      .listMovements({ limit: 250, offset: 0 }, scope)
      .find((movement) => movement.id === movementId);
  }

  adjust(input: InventoryAdjustmentInput, actorUserId: string, scope: readonly string[]) {
    const bin = this.requireBin(input.binId);
    const warehouse = this.requireWarehouse(String(bin.warehouse_id), scope);
    const part = this.requirePart(input.partId);
    this.validateQuantity(part, Math.abs(input.quantityDelta));
    if (String(part.tracking_type) !== 'QUANTITY') {
      throw new DomainError(
        'INVENTORY_TRACKED_ADJUSTMENT_UNSUPPORTED',
        'Lot and serial-controlled stock must be corrected through a cycle count or reversal.',
        422
      );
    }
    const sqlite = this.repository.sqlite;
    const transaction = sqlite.transaction(() => {
      const gain = input.quantityDelta > 0;
      const movementId = this.insertMovement({
        movementType: gain ? 'ADJUSTMENT_GAIN' : 'ADJUSTMENT_LOSS',
        sourceType: 'INVENTORY_ADJUSTMENT',
        sourceId: `adjustment-${nanoid(10)}`,
        stationId: String(warehouse.station_id),
        reason: input.reason,
        actorUserId
      });
      let baseValue = 0;
      if (gain) {
        const baseUnitCostIdr = this.convertToIdr(
          input.sourceUnitCostMinor,
          input.currencyId,
          input.exchangeRateToIdrMicros
        );
        const cost: CostAllocation = {
          layerId: '',
          lotId: null,
          serialId: null,
          receivedAt: now(),
          quantity: input.quantityDelta,
          sourceUnitCostMinor: input.sourceUnitCostMinor,
          currencyId: input.currencyId,
          exchangeRateToIdrMicros: input.exchangeRateToIdrMicros,
          baseUnitCostIdr
        };
        this.changeBalance(
          input.partId,
          input.binId,
          null,
          bin.bin_type === 'USABLE' ? 'SERVICEABLE' : 'QUARANTINE',
          input.quantityDelta
        );
        const movementLineId = this.insertMovementLine({
          movementId,
          partId: input.partId,
          fromBinId: null,
          toBinId: input.binId,
          lotId: null,
          serialId: null,
          conditionFrom: null,
          conditionTo: bin.bin_type === 'USABLE' ? 'SERVICEABLE' : 'QUARANTINE',
          quantity: input.quantityDelta,
          cost
        });
        sqlite
          .prepare(
            `INSERT INTO inventory_cost_layers
             (id, part_id, warehouse_id, lot_id, serial_id, source_movement_line_id,
              original_quantity, remaining_quantity, source_unit_cost_minor, currency_id,
              exchange_rate_to_idr_micros, base_unit_cost_idr, received_at)
             VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            `inv-layer-${nanoid(10)}`,
            input.partId,
            warehouse.id,
            movementLineId,
            input.quantityDelta,
            input.quantityDelta,
            input.sourceUnitCostMinor,
            input.currencyId,
            input.exchangeRateToIdrMicros,
            baseUnitCostIdr,
            now()
          );
        baseValue = Math.round(input.quantityDelta * baseUnitCostIdr);
      } else {
        const quantity = Math.abs(input.quantityDelta);
        const physical = this.pickPhysicalStock(
          input.partId,
          String(warehouse.id),
          quantity,
          [],
          null,
          input.binId
        );
        const costs = this.consumeFifo(input.partId, String(warehouse.id), quantity, [], true);
        for (const chunk of this.combineAllocations(physical, costs)) {
          this.changeBalance(
            input.partId,
            chunk.physical.binId,
            chunk.physical.lotId,
            'SERVICEABLE',
            -chunk.quantity
          );
          this.insertMovementLine({
            movementId,
            partId: input.partId,
            fromBinId: chunk.physical.binId,
            toBinId: null,
            lotId: chunk.physical.lotId,
            serialId: null,
            conditionFrom: 'SERVICEABLE',
            conditionTo: null,
            quantity: chunk.quantity,
            cost: chunk.cost
          });
          baseValue += Math.round(chunk.quantity * chunk.cost.baseUnitCostIdr);
        }
      }
      this.finalizeMovement(movementId, baseValue);
      this.createAccountingEvent({
        eventType:
          input.quantityDelta > 0 ? 'INVENTORY_ADJUSTMENT_GAIN' : 'INVENTORY_ADJUSTMENT_LOSS',
        sourceType: 'INVENTORY_ADJUSTMENT',
        sourceId: movementId,
        movementId,
        stationId: String(warehouse.station_id),
        currencyId: input.currencyId,
        sourceAmountMinor: Math.round(Math.abs(input.quantityDelta) * input.sourceUnitCostMinor),
        exchangeRateToIdrMicros: input.exchangeRateToIdrMicros,
        baseAmountIdr: baseValue,
        payload: { partId: input.partId, quantityDelta: input.quantityDelta, reason: input.reason }
      });
      return movementId;
    });
    const movementId = transaction.immediate();
    return this.repository
      .listMovements({ limit: 250, offset: 0 }, scope)
      .find((movement) => movement.id === movementId);
  }

  async issueMaintenanceParts(
    rawInput: MaintenancePartIssueInput,
    actorUserId: string,
    scope: readonly string[]
  ) {
    const input = maintenancePartIssueInputSchema.parse(rawInput);
    const sqlite = this.repository.sqlite;
    const warehouse = this.requireWarehouse(input.warehouseId, scope);
    const aircraft =
      input.targetType === 'AIRCRAFT'
        ? (sqlite.prepare('SELECT * FROM aircraft WHERE id = ?').get(input.aircraftId) as
            SqlRow | undefined)
        : undefined;
    const corporateAsset =
      input.targetType === 'CORPORATE_ASSET'
        ? (sqlite.prepare('SELECT * FROM managed_assets WHERE id = ?').get(input.targetId) as
            SqlRow | undefined)
        : undefined;
    if (input.targetType === 'AIRCRAFT' && !aircraft)
      throw notFound('Aircraft', String(input.aircraftId));
    if (input.targetType === 'CORPORATE_ASSET' && !corporateAsset)
      throw notFound('Corporate asset', String(input.targetId));
    if (corporateAsset && Number(corporateAsset.version) !== input.expectedAssetVersion) {
      throw new DomainError(
        'ASSET_VERSION_CONFLICT',
        'Corporate asset changed on the server. Refresh before requesting parts.',
        409,
        {
          currentVersion: Number(corporateAsset.version),
          currentUpdatedAt: String(corporateAsset.updated_at)
        }
      );
    }
    const targetStationId = aircraft?.current_station_id ?? corporateAsset?.station_id;
    if (String(warehouse.station_id) !== String(targetStationId)) {
      throw new DomainError(
        'INVENTORY_ISSUE_STATION_MISMATCH',
        'Parts must be issued from the maintenance target current station.',
        422
      );
    }
    if (input.targetType === 'CORPORATE_ASSET') {
      const workOrder = sqlite
        .prepare(`SELECT asset_id, status FROM asset_maintenance_work_orders WHERE id = ?`)
        .get(input.assetMaintenanceWorkOrderId) as SqlRow | undefined;
      if (!workOrder)
        throw notFound('Corporate asset work order', String(input.assetMaintenanceWorkOrderId));
      if (String(workOrder.asset_id) !== input.targetId) {
        throw new DomainError(
          'ASSET_MAINTENANCE_TARGET_MISMATCH',
          'Work order and corporate asset must match.',
          422
        );
      }
      if (['COMPLETED', 'CANCELLED'].includes(String(workOrder.status))) {
        throw new DomainError(
          'ASSET_MAINTENANCE_TERMINAL',
          'Parts cannot be issued to a terminal work order.',
          422
        );
      }
    }
    if (input.flightId) {
      const flight = sqlite
        .prepare(`SELECT aircraft_id FROM flight_operations WHERE id = ?`)
        .get(input.flightId) as SqlRow | undefined;
      if (!flight) throw notFound('Flight operation', input.flightId);
      if (nullable(flight.aircraft_id) !== input.aircraftId) {
        throw new DomainError(
          'INVENTORY_ISSUE_FLIGHT_AIRCRAFT_MISMATCH',
          'Flight assignment and inventory issue must reference the same aircraft.',
          422
        );
      }
    }
    if (input.maintenanceHandoffId) {
      const handoff = sqlite
        .prepare(`SELECT aircraft_id, flight_id FROM flight_maintenance_handoffs WHERE id = ?`)
        .get(input.maintenanceHandoffId) as SqlRow | undefined;
      if (!handoff) throw notFound('Maintenance handoff', input.maintenanceHandoffId);
      if (String(handoff.aircraft_id) !== input.aircraftId) {
        throw new DomainError(
          'INVENTORY_ISSUE_AIRCRAFT_MISMATCH',
          'Maintenance handoff and inventory issue must reference the same aircraft.',
          422
        );
      }
      if (nullable(handoff.flight_id) !== input.flightId) {
        throw new DomainError(
          'INVENTORY_ISSUE_FLIGHT_MISMATCH',
          'Maintenance handoff and inventory issue must reference the same flight.',
          422
        );
      }
    }
    for (const requested of input.lines) {
      const part = this.requirePart(requested.partId);
      const physical = this.pickPhysicalStock(
        requested.partId,
        input.warehouseId,
        requested.quantity,
        requested.serialIds
      );
      await this.assertTransferEligible(part, physical);
    }
    const issueId = `inv-issue-${nanoid(10)}`;
    const transaction = sqlite.transaction(() => {
      const movementId = this.insertMovement({
        movementType: 'ISSUE',
        sourceType: 'MAINTENANCE_PART_ISSUE',
        sourceId: issueId,
        stationId: String(warehouse.station_id),
        aircraftId: input.aircraftId,
        flightId: input.flightId,
        reason: input.reason,
        actorUserId
      });
      let totalPartsValueIdr = 0;
      const issueLineValues: Array<{
        partId: string;
        quantity: number;
        value: number;
        note: string | null;
      }> = [];
      for (const requested of input.lines) {
        const part = this.requirePart(requested.partId);
        this.validateQuantity(part, requested.quantity);
        if (aircraft) this.assertAircraftApplicability(part, aircraft);
        const physical = this.pickPhysicalStock(
          requested.partId,
          input.warehouseId,
          requested.quantity,
          requested.serialIds
        );
        const costs = this.consumeFifo(
          requested.partId,
          input.warehouseId,
          requested.quantity,
          requested.serialIds,
          true
        );
        let lineValue = 0;
        for (const chunk of this.combineAllocations(physical, costs)) {
          this.changeBalance(
            requested.partId,
            chunk.physical.binId,
            chunk.physical.lotId,
            'SERVICEABLE',
            -chunk.quantity
          );
          this.insertMovementLine({
            movementId,
            partId: requested.partId,
            fromBinId: chunk.physical.binId,
            toBinId: null,
            lotId: chunk.physical.lotId,
            serialId: chunk.physical.serialId,
            conditionFrom: 'SERVICEABLE',
            conditionTo: null,
            quantity: chunk.quantity,
            cost: chunk.cost
          });
          if (chunk.physical.serialId) {
            sqlite
              .prepare(
                `UPDATE inventory_serialized_parts SET bin_id = NULL, updated_at = ? WHERE id = ?`
              )
              .run(now(), chunk.physical.serialId);
          }
          lineValue += Math.round(chunk.quantity * chunk.cost.baseUnitCostIdr);
        }
        totalPartsValueIdr += lineValue;
        issueLineValues.push({
          partId: requested.partId,
          quantity: requested.quantity,
          value: lineValue,
          note: requested.note
        });
      }
      this.finalizeMovement(movementId, totalPartsValueIdr);
      const issuedAt = now();
      sqlite
        .prepare(
          `INSERT INTO maintenance_part_issues
           (id, issue_number, target_type, target_id, asset_maintenance_work_order_id,
            maintenance_handoff_id, aircraft_id, flight_id, warehouse_id,
            reason, movement_id, status, total_parts_value_idr, issued_by_user_id, issued_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ISSUED', ?, ?, ?)`
        )
        .run(
          issueId,
          this.nextNumber('ISS', 'maintenance_part_issues'),
          input.targetType,
          input.targetId ?? input.aircraftId,
          input.assetMaintenanceWorkOrderId,
          input.maintenanceHandoffId,
          input.aircraftId,
          input.flightId,
          input.warehouseId,
          input.reason,
          movementId,
          totalPartsValueIdr,
          actorUserId,
          issuedAt
        );
      if (input.assetMaintenanceWorkOrderId) {
        sqlite
          .prepare(
            `UPDATE asset_maintenance_work_orders SET status = 'WAITING_PARTS', updated_at = ? WHERE id = ?`
          )
          .run(issuedAt, input.assetMaintenanceWorkOrderId);
        const updated = sqlite
          .prepare(
            `UPDATE managed_assets SET version = version + 1, updated_at = ?
          WHERE id = ? AND version = ?`
          )
          .run(issuedAt, input.targetId, input.expectedAssetVersion);
        if (!updated.changes) {
          throw new DomainError(
            'ASSET_VERSION_CONFLICT',
            'Corporate asset changed while parts were requested.',
            409
          );
        }
        sqlite
          .prepare(
            `INSERT INTO asset_action_history
          (id, asset_id, action_type, actor_user_id, reason, before_json, after_json,
           request_context_json, created_at) VALUES (?, ?, 'ASSET_PARTS_REQUESTED', ?, ?, '{}', ?, '{}', ?)`
          )
          .run(
            `asset-history-${nanoid(10)}`,
            input.targetId,
            actorUserId,
            input.reason,
            JSON.stringify({ workOrderId: input.assetMaintenanceWorkOrderId, issueId }),
            issuedAt
          );
      }
      const insertIssueLine = sqlite.prepare(
        `INSERT INTO maintenance_part_issue_lines
         (id, issue_id, part_id, quantity, base_value_idr, note) VALUES (?, ?, ?, ?, ?, ?)`
      );
      for (const line of issueLineValues) {
        insertIssueLine.run(
          `inv-issue-line-${nanoid(10)}`,
          issueId,
          line.partId,
          line.quantity,
          line.value,
          line.note
        );
      }
      this.createAccountingEvent({
        eventType: 'INVENTORY_MAINTENANCE_ISSUE',
        sourceType: 'MAINTENANCE_PART_ISSUE',
        sourceId: issueId,
        movementId,
        stationId: String(warehouse.station_id),
        aircraftId: input.aircraftId,
        flightId: input.flightId,
        currencyId: 'cur-idr',
        sourceAmountMinor: totalPartsValueIdr,
        exchangeRateToIdrMicros: 1_000_000,
        baseAmountIdr: totalPartsValueIdr,
        payload: {
          maintenanceHandoffId: input.maintenanceHandoffId,
          assetMaintenanceWorkOrderId: input.assetMaintenanceWorkOrderId,
          targetType: input.targetType,
          targetId: input.targetId ?? input.aircraftId,
          maintenanceCategory: input.maintenanceCategory ?? 'ROUTINE',
          lineCount: input.lines.length
        }
      });
    });
    transaction.immediate();
    return (
      this.repository
        .listIssues({ search: issueId, limit: 250, offset: 0 }, scope)
        .find((issue) => issue.id === issueId) ?? this.requireIssue(issueId, scope)
    );
  }

  createCount(input: InventoryCountInput, actorUserId: string, scope: readonly string[]) {
    const sqlite = this.repository.sqlite;
    const warehouse = this.requireWarehouse(input.warehouseId, scope);
    if (input.binId) this.requireBin(input.binId, input.warehouseId);
    const id = `inv-count-${nanoid(10)}`;
    const timestamp = now();
    const transaction = sqlite.transaction(() => {
      sqlite
        .prepare(
          `INSERT INTO inventory_counts
           (id, count_number, warehouse_id, bin_id, reason, status, created_by_user_id,
            created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?)`
        )
        .run(
          id,
          this.nextNumber('CNT', 'inventory_counts'),
          warehouse.id,
          input.binId,
          input.reason,
          actorUserId,
          timestamp,
          timestamp
        );
      const balances = sqlite
        .prepare(
          `SELECT balance.* FROM inventory_stock_balances balance
           JOIN inventory_bins bin ON bin.id = balance.bin_id
           WHERE bin.warehouse_id = ? AND (? IS NULL OR balance.bin_id = ?)`
        )
        .all(input.warehouseId, input.binId, input.binId) as SqlRow[];
      const insert = sqlite.prepare(
        `INSERT INTO inventory_count_lines
         (id, count_id, stock_balance_id, expected_quantity, counted_quantity, variance_quantity)
         VALUES (?, ?, ?, ?, NULL, NULL)`
      );
      for (const balance of balances) {
        insert.run(`inv-count-line-${nanoid(10)}`, id, balance.id, balance.on_hand_quantity);
      }
    });
    transaction.immediate();
    return this.repository
      .listCounts({ limit: 250, offset: 0 }, scope)
      .find((count) => count.id === id);
  }

  recordCount(id: string, input: InventoryCountLineInput, scope: readonly string[]) {
    const count = this.requireCountRow(id, scope);
    if (count.status !== 'DRAFT') {
      throw new DomainError(
        'INVENTORY_COUNT_NOT_DRAFT',
        'Only a draft stock count can be recorded.',
        409
      );
    }
    const sqlite = this.repository.sqlite;
    const transaction = sqlite.transaction(() => {
      const update = sqlite.prepare(
        `UPDATE inventory_count_lines
         SET counted_quantity = ?, variance_quantity = ? - expected_quantity
         WHERE id = ? AND count_id = ?`
      );
      for (const line of input.lines) {
        const countLine = sqlite
          .prepare(
            `SELECT id FROM inventory_count_lines WHERE stock_balance_id = ? AND count_id = ?`
          )
          .get(line.stockBalanceId, id) as SqlRow | undefined;
        if (!countLine) throw notFound('Stock count line', line.stockBalanceId);
        update.run(line.countedQuantity, line.countedQuantity, countLine.id, id);
      }
      const missing = num(
        (
          sqlite
            .prepare(
              `SELECT COUNT(*) count FROM inventory_count_lines
               WHERE count_id = ? AND counted_quantity IS NULL`
            )
            .get(id) as SqlRow
        ).count
      );
      if (missing) {
        throw new DomainError(
          'INVENTORY_COUNT_INCOMPLETE',
          'Every stock balance in the count must have a counted quantity.',
          422,
          { missing }
        );
      }
      sqlite
        .prepare(`UPDATE inventory_counts SET status = 'COUNTED', updated_at = ? WHERE id = ?`)
        .run(now(), id);
    });
    transaction.immediate();
    return this.repository
      .listCounts({ limit: 250, offset: 0 }, scope)
      .find((item) => item.id === id);
  }

  postCount(id: string, actorUserId: string, scope: readonly string[]) {
    const count = this.requireCountRow(id, scope);
    if (count.status === 'POSTED') {
      return this.repository
        .listCounts({ limit: 250, offset: 0 }, scope)
        .find((item) => item.id === id);
    }
    if (count.status !== 'COUNTED') {
      throw new DomainError(
        'INVENTORY_COUNT_NOT_READY',
        'Only a completed stock count can be posted.',
        409
      );
    }
    const sqlite = this.repository.sqlite;
    const transaction = sqlite.transaction(() => {
      const snapshotLines = sqlite
        .prepare(
          `SELECT line.stock_balance_id, line.expected_quantity, balance.on_hand_quantity
           FROM inventory_count_lines line
           JOIN inventory_stock_balances balance ON balance.id = line.stock_balance_id
           WHERE line.count_id = ?`
        )
        .all(id) as SqlRow[];
      const staleLine = snapshotLines.find(
        (line) => Math.abs(num(line.expected_quantity) - num(line.on_hand_quantity)) > 1e-9
      );
      const newBalanceCount = num(
        (
          sqlite
            .prepare(
              `SELECT COUNT(*) count FROM inventory_stock_balances balance
               JOIN inventory_bins bin ON bin.id = balance.bin_id
               WHERE bin.warehouse_id = ? AND (? IS NULL OR balance.bin_id = ?)
                 AND NOT EXISTS (
                   SELECT 1 FROM inventory_count_lines line
                   WHERE line.count_id = ? AND line.stock_balance_id = balance.id
                 )`
            )
            .get(count.warehouse_id, count.bin_id, count.bin_id, id) as SqlRow
        ).count
      );
      if (staleLine || newBalanceCount) {
        throw new DomainError(
          'INVENTORY_COUNT_STALE',
          'Stock changed after the count snapshot. Start a new cycle count.',
          409,
          { stockBalanceId: nullable(staleLine?.stock_balance_id), newBalanceCount }
        );
      }
      const variances = sqlite
        .prepare(
          `SELECT line.*, balance.part_id, balance.bin_id, balance.lot_id, balance.condition,
                  p.tracking_type, bin.warehouse_id, w.station_id
           FROM inventory_count_lines line
           JOIN inventory_stock_balances balance ON balance.id = line.stock_balance_id
           JOIN inventory_parts p ON p.id = balance.part_id
           JOIN inventory_bins bin ON bin.id = balance.bin_id
           JOIN inventory_warehouses w ON w.id = bin.warehouse_id
           WHERE line.count_id = ? AND ABS(line.variance_quantity) > 0.000001`
        )
        .all(id) as SqlRow[];
      for (const variance of variances) {
        if (String(variance.tracking_type) === 'SERIAL') {
          throw new DomainError(
            'INVENTORY_SERIAL_COUNT_RECONCILIATION_REQUIRED',
            'Serialized count variances must be reconciled by serial number before posting.',
            422
          );
        }
      }
      const movementId = this.insertMovement({
        movementType: 'COUNT_VARIANCE',
        sourceType: 'INVENTORY_COUNT',
        sourceId: id,
        stationId: String(count.station_id),
        reason: String(count.reason),
        actorUserId
      });
      let totalValue = 0;
      for (const variance of variances) {
        const quantity = Math.abs(num(variance.variance_quantity));
        if (num(variance.variance_quantity) > 0) {
          const latestCost = this.latestUnitCost(
            String(variance.part_id),
            String(variance.warehouse_id),
            nullable(variance.lot_id)
          );
          this.changeBalance(
            String(variance.part_id),
            String(variance.bin_id),
            nullable(variance.lot_id),
            String(variance.condition),
            quantity
          );
          const movementLineId = this.insertMovementLine({
            movementId,
            partId: String(variance.part_id),
            fromBinId: null,
            toBinId: String(variance.bin_id),
            lotId: nullable(variance.lot_id),
            serialId: null,
            conditionFrom: null,
            conditionTo: String(variance.condition),
            quantity,
            cost: latestCost
          });
          sqlite
            .prepare(
              `INSERT INTO inventory_cost_layers
               (id, part_id, warehouse_id, lot_id, serial_id, source_movement_line_id,
                original_quantity, remaining_quantity, source_unit_cost_minor, currency_id,
                exchange_rate_to_idr_micros, base_unit_cost_idr, received_at)
               VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              `inv-layer-${nanoid(10)}`,
              variance.part_id,
              variance.warehouse_id,
              variance.lot_id,
              movementLineId,
              quantity,
              quantity,
              latestCost.sourceUnitCostMinor,
              latestCost.currencyId,
              latestCost.exchangeRateToIdrMicros,
              latestCost.baseUnitCostIdr,
              now()
            );
          totalValue += Math.round(quantity * latestCost.baseUnitCostIdr);
        } else {
          const physical: PhysicalAllocation[] = [
            {
              binId: String(variance.bin_id),
              lotId: nullable(variance.lot_id),
              serialId: null,
              quantity
            }
          ];
          const costs = this.consumeFifo(
            String(variance.part_id),
            String(variance.warehouse_id),
            quantity,
            [],
            true
          );
          this.changeBalance(
            String(variance.part_id),
            String(variance.bin_id),
            nullable(variance.lot_id),
            String(variance.condition),
            -quantity
          );
          for (const chunk of this.combineAllocations(physical, costs)) {
            this.insertMovementLine({
              movementId,
              partId: String(variance.part_id),
              fromBinId: String(variance.bin_id),
              toBinId: null,
              lotId: nullable(variance.lot_id),
              serialId: null,
              conditionFrom: String(variance.condition),
              conditionTo: null,
              quantity: chunk.quantity,
              cost: chunk.cost
            });
            totalValue += Math.round(chunk.quantity * chunk.cost.baseUnitCostIdr);
          }
        }
      }
      this.finalizeMovement(movementId, totalValue);
      sqlite
        .prepare(`UPDATE inventory_counts SET status = 'POSTED', updated_at = ? WHERE id = ?`)
        .run(now(), id);
      this.createAccountingEvent({
        eventType: 'INVENTORY_COUNT_VARIANCE',
        sourceType: 'INVENTORY_COUNT',
        sourceId: id,
        movementId,
        stationId: String(count.station_id),
        currencyId: 'cur-idr',
        sourceAmountMinor: totalValue,
        exchangeRateToIdrMicros: 1_000_000,
        baseAmountIdr: totalValue,
        payload: { varianceLineCount: variances.length }
      });
    });
    transaction.immediate();
    return this.repository
      .listCounts({ limit: 250, offset: 0 }, scope)
      .find((item) => item.id === id);
  }

  async installSerializedPart(
    id: string,
    input: InstallSerializedPartInput,
    actorUserId: string,
    scope: readonly string[]
  ) {
    const sqlite = this.repository.sqlite;
    const serial = this.requireSerial(id);
    const part = this.requirePart(String(serial.part_id));
    if (!['REPAIRABLE', 'ROTABLE'].includes(String(part.lifecycle_type))) {
      throw new DomainError(
        'INVENTORY_COMPONENT_NOT_INSTALLABLE',
        'Only repairable or rotable parts can be installed.',
        422
      );
    }
    if (
      serial.condition !== 'SERVICEABLE' ||
      (Boolean(part.certificate_required) && !Boolean(serial.certificate_verified))
    ) {
      throw new DomainError(
        'INVENTORY_COMPONENT_NOT_SERVICEABLE',
        'The serialized component must be serviceable and meet its certificate requirements.',
        422
      );
    }
    this.assertTimestamp(input.installedAt, 'Installation timestamp');
    if (
      input.hoursAtInstall + 1e-9 < num(serial.hours_since_new) ||
      input.cyclesAtInstall < num(serial.cycles_since_new)
    ) {
      throw new DomainError(
        'INVENTORY_COMPONENT_COUNTER_REGRESSION',
        'Installation TSN/CSN cannot be lower than the component current counters.',
        422
      );
    }
    const previousInstallation = sqlite
      .prepare(
        `SELECT removed_at FROM inventory_component_installations
         WHERE serial_id = ? ORDER BY installed_at DESC LIMIT 1`
      )
      .get(id) as SqlRow | undefined;
    if (
      previousInstallation?.removed_at &&
      Date.parse(input.installedAt) < Date.parse(String(previousInstallation.removed_at))
    ) {
      throw new DomainError(
        'INVENTORY_COMPONENT_CHRONOLOGY_INVALID',
        'Installation timestamp cannot precede the previous component removal.',
        422
      );
    }
    await this.assertTransferEligible(part, [
      {
        binId: nullable(serial.bin_id) ?? '',
        lotId: nullable(serial.lot_id),
        serialId: id,
        quantity: 1
      }
    ]);
    const aircraft = sqlite.prepare('SELECT * FROM aircraft WHERE id = ?').get(input.aircraftId) as
      SqlRow | undefined;
    if (!aircraft) throw notFound('Aircraft', input.aircraftId);
    this.assertAircraftApplicability(part, aircraft);
    this.requireStationScope(String(aircraft.current_station_id), scope);
    const sourceWarehouse = serial.bin_id
      ? this.requireWarehouse(String(this.requireBin(String(serial.bin_id)).warehouse_id), scope)
      : null;
    const issuedFrom = !sourceWarehouse
      ? (sqlite
          .prepare(
            `SELECT movement.station_id, line.base_value_idr FROM inventory_movement_lines line
             JOIN inventory_movements movement ON movement.id = line.movement_id
             WHERE line.serial_id = ? AND movement.movement_type = 'ISSUE'
               AND movement.is_finalized = 1
               AND NOT EXISTS (
                 SELECT 1 FROM inventory_movements reversal
                 WHERE reversal.reversal_of_movement_id = movement.id AND reversal.is_finalized = 1
               )
             ORDER BY movement.rowid DESC LIMIT 1`
          )
          .get(id) as SqlRow | undefined)
      : null;
    const componentStationId = sourceWarehouse?.station_id ?? issuedFrom?.station_id;
    if (!componentStationId) {
      throw new DomainError(
        'INVENTORY_COMPONENT_LOCATION_MISSING',
        'The serviceable component has no warehouse or issued-station trace.',
        409
      );
    }
    if (String(componentStationId) !== String(aircraft.current_station_id)) {
      throw new DomainError(
        'INVENTORY_COMPONENT_STATION_MISMATCH',
        'Transfer the component to the aircraft station before installation.',
        422
      );
    }
    const transaction = sqlite.transaction(() => {
      let value = num(issuedFrom?.base_value_idr);
      const movementId = this.insertMovement({
        movementType: 'INSTALL',
        sourceType: 'COMPONENT_INSTALLATION',
        sourceId: `installation-${id}-${input.installedAt}`,
        stationId: String(aircraft.current_station_id),
        aircraftId: input.aircraftId,
        reason: `Install ${String(serial.serial_number)} at ${input.position}.`,
        actorUserId
      });
      if (serial.bin_id) {
        const physical: PhysicalAllocation[] = [
          {
            binId: String(serial.bin_id),
            lotId: nullable(serial.lot_id),
            serialId: id,
            quantity: 1
          }
        ];
        const costs = this.consumeFifo(
          String(serial.part_id),
          String(sourceWarehouse!.id),
          1,
          [id],
          true
        );
        const chunk = this.combineAllocations(physical, costs)[0];
        if (!chunk)
          throw new DomainError('INVENTORY_COST_LAYER_MISSING', 'FIFO cost layer is missing.', 409);
        this.changeBalance(
          String(serial.part_id),
          String(serial.bin_id),
          nullable(serial.lot_id),
          'SERVICEABLE',
          -1
        );
        this.insertMovementLine({
          movementId,
          partId: String(serial.part_id),
          fromBinId: String(serial.bin_id),
          toBinId: null,
          lotId: nullable(serial.lot_id),
          serialId: id,
          conditionFrom: 'SERVICEABLE',
          conditionTo: 'INSTALLED',
          quantity: 1,
          cost: chunk.cost
        });
        value = chunk.cost.baseUnitCostIdr;
      }
      sqlite
        .prepare(
          `UPDATE inventory_serialized_parts
           SET bin_id = NULL, condition = 'INSTALLED', aircraft_id = ?, position = ?,
               hours_since_new = MAX(hours_since_new, ?), cycles_since_new = MAX(cycles_since_new, ?),
               updated_at = ? WHERE id = ?`
        )
        .run(
          input.aircraftId,
          input.position,
          input.hoursAtInstall,
          input.cyclesAtInstall,
          now(),
          id
        );
      sqlite
        .prepare(
          `INSERT INTO inventory_component_installations
           (id, serial_id, aircraft_id, position, installed_at, removed_at, hours_at_install,
            cycles_at_install, hours_at_remove, cycles_at_remove, removal_reason,
            installed_by_user_id, removed_by_user_id)
           VALUES (?, ?, ?, ?, ?, NULL, ?, ?, NULL, NULL, NULL, ?, NULL)`
        )
        .run(
          `inv-install-${nanoid(10)}`,
          id,
          input.aircraftId,
          input.position,
          input.installedAt,
          input.hoursAtInstall,
          input.cyclesAtInstall,
          actorUserId
        );
      this.finalizeMovement(movementId, value);
      this.createAccountingEvent({
        eventType: 'INVENTORY_COMPONENT_INSTALL',
        sourceType: 'COMPONENT_INSTALLATION',
        sourceId: id,
        movementId,
        stationId: String(aircraft.current_station_id),
        aircraftId: input.aircraftId,
        currencyId: 'cur-idr',
        sourceAmountMinor: value,
        exchangeRateToIdrMicros: 1_000_000,
        baseAmountIdr: value,
        payload: {
          serialNumber: serial.serial_number,
          position: input.position,
          ...(input.workOrderId ? { workOrderId: input.workOrderId } : {}),
          ...(input.workOrderCategory ? { workOrderCategory: input.workOrderCategory } : {}),
          ...(input.capitalizationCandidate !== undefined
            ? { capitalizationCandidate: input.capitalizationCandidate }
            : {}),
          ...(input.capitalizationThresholdMinor !== undefined
            ? { capitalizationThresholdMinor: input.capitalizationThresholdMinor }
            : {}),
          ...(input.expectedBenefitMonths !== undefined
            ? { expectedBenefitMonths: input.expectedBenefitMonths }
            : {}),
          ...(input.technicalAcceptanceStatus
            ? { technicalAcceptanceStatus: input.technicalAcceptanceStatus }
            : {}),
          ...(input.readyForUseDate ? { readyForUseDate: input.readyForUseDate } : {})
        }
      });
    });
    transaction.immediate();
    return this.requireSerializedDto(id, scope);
  }

  removeSerializedPart(
    id: string,
    input: RemoveSerializedPartInput,
    actorUserId: string,
    scope: readonly string[]
  ) {
    const sqlite = this.repository.sqlite;
    const serial = this.requireSerial(id);
    if (serial.condition !== 'INSTALLED' || !serial.aircraft_id) {
      throw new DomainError(
        'INVENTORY_COMPONENT_NOT_INSTALLED',
        'Only an installed component can be removed.',
        409
      );
    }
    const bin = this.requireBin(input.quarantineBinId);
    const warehouse = this.requireWarehouse(String(bin.warehouse_id), scope);
    if (bin.bin_type !== 'QUARANTINE') {
      throw new DomainError(
        'INVENTORY_REMOVAL_BIN_INVALID',
        'Removed components must enter a quarantine bin.',
        422
      );
    }
    const installedAircraft = sqlite
      .prepare(`SELECT current_station_id FROM aircraft WHERE id = ?`)
      .get(serial.aircraft_id) as SqlRow | undefined;
    if (
      !installedAircraft ||
      String(installedAircraft.current_station_id) !== String(warehouse.station_id)
    ) {
      throw new DomainError(
        'INVENTORY_COMPONENT_STATION_MISMATCH',
        'Removed components must enter quarantine at the aircraft current station.',
        422
      );
    }
    this.assertTimestamp(input.removedAt, 'Removal timestamp');
    const activeInstallation = sqlite
      .prepare(
        `SELECT installed_at, hours_at_install, cycles_at_install
         FROM inventory_component_installations
         WHERE serial_id = ? AND removed_at IS NULL ORDER BY installed_at DESC LIMIT 1`
      )
      .get(id) as SqlRow | undefined;
    if (!activeInstallation) {
      throw new DomainError(
        'INVENTORY_COMPONENT_INSTALLATION_TRACE_MISSING',
        'The installed component has no active installation trace.',
        409
      );
    }
    if (Date.parse(input.removedAt) < Date.parse(String(activeInstallation.installed_at))) {
      throw new DomainError(
        'INVENTORY_COMPONENT_CHRONOLOGY_INVALID',
        'Removal timestamp cannot precede the installation timestamp.',
        422
      );
    }
    if (
      input.hoursAtRemove + 1e-9 <
        Math.max(num(serial.hours_since_new), num(activeInstallation.hours_at_install)) ||
      input.cyclesAtRemove <
        Math.max(num(serial.cycles_since_new), num(activeInstallation.cycles_at_install))
    ) {
      throw new DomainError(
        'INVENTORY_COMPONENT_COUNTER_REGRESSION',
        'Removal TSN/CSN cannot be lower than the component current counters.',
        422
      );
    }
    const transaction = sqlite.transaction(() => {
      const cost = this.latestSerialCost(id);
      const movementId = this.insertMovement({
        movementType: 'REMOVE',
        sourceType: 'COMPONENT_REMOVAL',
        sourceId: `removal-${id}-${input.removedAt}`,
        stationId: String(warehouse.station_id),
        aircraftId: String(serial.aircraft_id),
        reason: input.removalReason,
        actorUserId
      });
      const movementLineId = this.insertMovementLine({
        movementId,
        partId: String(serial.part_id),
        fromBinId: null,
        toBinId: input.quarantineBinId,
        lotId: nullable(serial.lot_id),
        serialId: id,
        conditionFrom: 'INSTALLED',
        conditionTo: 'QUARANTINE',
        quantity: 1,
        cost
      });
      this.changeBalance(
        String(serial.part_id),
        input.quarantineBinId,
        nullable(serial.lot_id),
        'QUARANTINE',
        1
      );
      sqlite
        .prepare(
          `INSERT INTO inventory_cost_layers
           (id, part_id, warehouse_id, lot_id, serial_id, source_movement_line_id,
            original_quantity, remaining_quantity, source_unit_cost_minor, currency_id,
            exchange_rate_to_idr_micros, base_unit_cost_idr, received_at)
           VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?, ?, ?)`
        )
        .run(
          `inv-layer-${nanoid(10)}`,
          serial.part_id,
          warehouse.id,
          serial.lot_id,
          id,
          movementLineId,
          cost.sourceUnitCostMinor,
          cost.currencyId,
          cost.exchangeRateToIdrMicros,
          cost.baseUnitCostIdr,
          input.removedAt
        );
      sqlite
        .prepare(
          `UPDATE inventory_serialized_parts
           SET bin_id = ?, condition = 'QUARANTINE', aircraft_id = NULL, position = NULL,
               hours_since_new = ?, cycles_since_new = ?, updated_at = ? WHERE id = ?`
        )
        .run(input.quarantineBinId, input.hoursAtRemove, input.cyclesAtRemove, now(), id);
      sqlite
        .prepare(
          `UPDATE inventory_component_installations
           SET removed_at = ?, hours_at_remove = ?, cycles_at_remove = ?, removal_reason = ?,
               removed_by_user_id = ? WHERE serial_id = ? AND removed_at IS NULL`
        )
        .run(
          input.removedAt,
          input.hoursAtRemove,
          input.cyclesAtRemove,
          input.removalReason,
          actorUserId,
          id
        );
      this.finalizeMovement(movementId, cost.baseUnitCostIdr);
    });
    transaction.immediate();
    return this.requireSerializedDto(id, scope);
  }

  createRepairOrder(input: RepairOrderInput, actorUserId: string, scope: readonly string[]) {
    const serial = this.requireSerial(input.serialId);
    if (!['QUARANTINE', 'UNSERVICEABLE'].includes(String(serial.condition)) || !serial.bin_id) {
      throw new DomainError(
        'INVENTORY_REPAIR_SERIAL_INVALID',
        'Only a quarantined or unserviceable serialized component can enter repair.',
        422
      );
    }
    const bin = this.requireBin(String(serial.bin_id));
    if (!['QUARANTINE', 'REPAIR'].includes(String(bin.bin_type))) {
      throw new DomainError(
        'INVENTORY_REPAIR_BIN_INVALID',
        'Repair orders must originate from a quarantine or repair bin.',
        422
      );
    }
    const warehouse = this.requireWarehouse(String(bin.warehouse_id), scope);
    this.requireActiveReference('vendors', input.vendorId, 'Vendor');
    const existing = this.repository.sqlite
      .prepare(
        `SELECT id FROM inventory_repair_orders WHERE serial_id = ? AND status NOT IN ('CLOSED', 'CANCELLED')`
      )
      .get(input.serialId) as SqlRow | undefined;
    if (existing) {
      throw new DomainError(
        'INVENTORY_REPAIR_ALREADY_OPEN',
        'This serialized component already has an open repair order.',
        409
      );
    }
    const id = `inv-repair-${nanoid(10)}`;
    const timestamp = now();
    this.repository.sqlite
      .prepare(
        `INSERT INTO inventory_repair_orders
         (id, repair_number, serial_id, station_id, vendor_id, reason, expected_return_at, status,
          source_repair_cost_minor, currency_id, exchange_rate_to_idr_micros,
          base_repair_cost_idr, created_by_user_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'DRAFT', 0, NULL, 1000000, 0, ?, ?, ?)`
      )
      .run(
        id,
        this.nextNumber('REP', 'inventory_repair_orders'),
        input.serialId,
        warehouse.station_id,
        input.vendorId,
        input.reason,
        input.expectedReturnAt,
        actorUserId,
        timestamp,
        timestamp
      );
    return this.getRepairOrder(id, scope);
  }

  sendRepairOrder(id: string, actorUserId: string, scope: readonly string[]) {
    const sqlite = this.repository.sqlite;
    const repair = this.requireRepairRow(id, scope);
    if (repair.status === 'SENT') return this.getRepairOrder(id, scope);
    if (repair.status !== 'DRAFT') {
      throw new DomainError(
        'INVENTORY_REPAIR_SEND_INVALID',
        'Only a draft repair order can be sent.',
        409
      );
    }
    const serial = this.requireSerial(String(repair.serial_id));
    if (!['QUARANTINE', 'UNSERVICEABLE'].includes(String(serial.condition))) {
      throw new DomainError(
        'INVENTORY_REPAIR_SERIAL_INVALID',
        'Only a quarantined or unserviceable component can be sent for repair.',
        422
      );
    }
    if (!serial.bin_id)
      throw new DomainError('INVENTORY_REPAIR_BIN_MISSING', 'Repair stock bin is missing.', 409);
    const bin = this.requireBin(String(serial.bin_id));
    if (!['QUARANTINE', 'REPAIR'].includes(String(bin.bin_type))) {
      throw new DomainError(
        'INVENTORY_REPAIR_BIN_INVALID',
        'Components sent for repair must be held in a quarantine or repair bin.',
        422
      );
    }
    const warehouse = this.requireWarehouse(String(bin.warehouse_id), scope);
    if (String(warehouse.station_id) !== String(repair.station_id)) {
      throw new DomainError(
        'INVENTORY_REPAIR_STATION_MISMATCH',
        'The repair component location no longer matches the repair-order station.',
        422
      );
    }
    const transaction = sqlite.transaction(() => {
      const [cost] = this.consumeFifo(
        String(serial.part_id),
        String(warehouse.id),
        1,
        [String(serial.id)],
        true
      );
      if (!cost) {
        throw new DomainError(
          'INVENTORY_REPAIR_COST_MISSING',
          'Serialized component is missing its valuation layer.',
          409
        );
      }
      const movementId = this.insertMovement({
        movementType: 'REPAIR_SEND',
        sourceType: 'REPAIR_ORDER',
        sourceId: id,
        stationId: String(repair.station_id),
        reason: String(repair.reason),
        actorUserId
      });
      this.changeBalance(
        String(serial.part_id),
        String(serial.bin_id),
        nullable(serial.lot_id),
        String(serial.condition),
        -1
      );
      this.insertMovementLine({
        movementId,
        partId: String(serial.part_id),
        fromBinId: String(serial.bin_id),
        toBinId: null,
        lotId: nullable(serial.lot_id),
        serialId: String(serial.id),
        conditionFrom: String(serial.condition),
        conditionTo: 'IN_REPAIR',
        quantity: 1,
        cost
      });
      sqlite
        .prepare(
          `UPDATE inventory_serialized_parts SET bin_id = NULL, condition = 'IN_REPAIR', updated_at = ? WHERE id = ?`
        )
        .run(now(), serial.id);
      sqlite
        .prepare(`UPDATE inventory_repair_orders SET status = 'SENT', updated_at = ? WHERE id = ?`)
        .run(now(), id);
      this.finalizeMovement(movementId, cost.baseUnitCostIdr);
    });
    transaction.immediate();
    return this.getRepairOrder(id, scope);
  }

  async returnServiceable(
    id: string,
    input: ReturnServiceableInput,
    actorUserId: string,
    scope: readonly string[]
  ) {
    const sqlite = this.repository.sqlite;
    const repair = this.requireRepairRow(id, scope);
    if (repair.status !== 'SENT') {
      throw new DomainError(
        'INVENTORY_REPAIR_RETURN_INVALID',
        'Only a sent repair order can be returned.',
        409
      );
    }
    const serial = this.requireSerial(String(repair.serial_id));
    const bin = this.requireBin(input.usableBinId);
    const warehouse = this.requireWarehouse(String(bin.warehouse_id), scope);
    if (bin.bin_type !== 'USABLE') {
      throw new DomainError(
        'INVENTORY_REPAIR_RETURN_BIN_INVALID',
        'Serviceable returns require a usable bin.',
        422
      );
    }
    if (String(warehouse.station_id) !== String(repair.station_id)) {
      throw new DomainError(
        'INVENTORY_REPAIR_STATION_MISMATCH',
        'Repair returns must be received at the repair-order station.',
        422
      );
    }
    await this.requireVerifiedCertificateDocument(
      String(serial.part_id),
      input.certificateReference,
      [{ ownerType: 'inventory_serial', ownerId: String(serial.id) }]
    );
    const transaction = sqlite.transaction(() => {
      const previousCost = this.latestSerialCost(String(serial.id));
      const repairCostIdr = this.convertToIdr(
        input.sourceRepairCostMinor,
        input.currencyId,
        input.exchangeRateToIdrMicros
      );
      const totalUnitCost = previousCost.baseUnitCostIdr + repairCostIdr;
      const cost: CostAllocation = {
        ...previousCost,
        quantity: 1,
        sourceUnitCostMinor: totalUnitCost,
        currencyId: 'cur-idr',
        exchangeRateToIdrMicros: 1_000_000,
        baseUnitCostIdr: totalUnitCost
      };
      const movementId = this.insertMovement({
        movementType: 'REPAIR_RETURN',
        sourceType: 'REPAIR_ORDER_RETURN',
        sourceId: id,
        stationId: String(warehouse.station_id),
        reason: `Serviceable return for ${String(serial.serial_number)}.`,
        actorUserId
      });
      const movementLineId = this.insertMovementLine({
        movementId,
        partId: String(serial.part_id),
        fromBinId: null,
        toBinId: input.usableBinId,
        lotId: nullable(serial.lot_id),
        serialId: String(serial.id),
        conditionFrom: 'IN_REPAIR',
        conditionTo: 'SERVICEABLE',
        quantity: 1,
        cost
      });
      this.changeBalance(
        String(serial.part_id),
        input.usableBinId,
        nullable(serial.lot_id),
        'SERVICEABLE',
        1
      );
      sqlite
        .prepare(
          `INSERT INTO inventory_cost_layers
           (id, part_id, warehouse_id, lot_id, serial_id, source_movement_line_id,
            original_quantity, remaining_quantity, source_unit_cost_minor, currency_id,
            exchange_rate_to_idr_micros, base_unit_cost_idr, received_at)
           VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, 'cur-idr', 1000000, ?, ?)`
        )
        .run(
          `inv-layer-${nanoid(10)}`,
          serial.part_id,
          warehouse.id,
          serial.lot_id,
          serial.id,
          movementLineId,
          totalUnitCost,
          totalUnitCost,
          input.returnedAt
        );
      sqlite
        .prepare(
          `UPDATE inventory_serialized_parts
           SET bin_id = ?, condition = 'SERVICEABLE', certificate_reference = ?,
               certificate_verified = 1, updated_at = ? WHERE id = ?`
        )
        .run(input.usableBinId, input.certificateReference, now(), serial.id);
      sqlite
        .prepare(
          `UPDATE inventory_repair_orders
           SET status = 'CLOSED', source_repair_cost_minor = ?, currency_id = ?,
               exchange_rate_to_idr_micros = ?, base_repair_cost_idr = ?, updated_at = ? WHERE id = ?`
        )
        .run(
          input.sourceRepairCostMinor,
          input.currencyId,
          input.exchangeRateToIdrMicros,
          repairCostIdr,
          now(),
          id
        );
      this.finalizeMovement(movementId, totalUnitCost);
      this.createAccountingEvent({
        eventType: 'INVENTORY_REPAIR_RETURN',
        sourceType: 'REPAIR_ORDER',
        sourceId: id,
        movementId,
        stationId: String(warehouse.station_id),
        currencyId: input.currencyId,
        sourceAmountMinor: input.sourceRepairCostMinor,
        exchangeRateToIdrMicros: input.exchangeRateToIdrMicros,
        baseAmountIdr: repairCostIdr,
        payload: { serialId: serial.id, certificateReference: input.certificateReference }
      });
    });
    transaction.immediate();
    return this.getRepairOrder(id, scope);
  }

  scrapSerializedPart(id: string, reason: string, actorUserId: string, scope: readonly string[]) {
    const sqlite = this.repository.sqlite;
    const serial = this.requireSerial(id);
    if (serial.condition === 'INSTALLED' || serial.condition === 'SCRAPPED') {
      throw new DomainError(
        'INVENTORY_SCRAP_INVALID',
        'Installed or already scrapped components cannot be scrapped.',
        409
      );
    }
    const bin = serial.bin_id ? this.requireBin(String(serial.bin_id)) : null;
    const warehouse = bin ? this.requireWarehouse(String(bin.warehouse_id), scope) : null;
    const repair = sqlite
      .prepare(
        `SELECT repair.*, station.station_code
         FROM inventory_repair_orders repair
         JOIN stations station ON station.id = repair.station_id
         WHERE repair.serial_id = ? AND repair.status NOT IN ('CLOSED', 'CANCELLED')
         ORDER BY repair.created_at DESC LIMIT 1`
      )
      .get(id) as SqlRow | undefined;
    if (repair) {
      this.assertStationCode(String(repair.station_code), scope);
      if (warehouse && String(repair.station_id) !== String(warehouse.station_id)) {
        throw new DomainError(
          'INVENTORY_REPAIR_STATION_MISMATCH',
          'The component location no longer matches its active repair-order station.',
          422
        );
      }
    }
    if (!warehouse) {
      if (!repair) {
        throw new DomainError(
          'INVENTORY_SCRAP_STATION_UNKNOWN',
          'The component must be assigned to a warehouse or an active repair order before scrap.',
          409
        );
      }
    }
    const stationId = warehouse ? String(warehouse.station_id) : String(repair!.station_id);
    const transaction = sqlite.transaction(() => {
      const cost = this.latestSerialCost(id);
      const movementId = this.insertMovement({
        movementType: 'SCRAP',
        sourceType: 'SERIALIZED_PART_SCRAP',
        sourceId: id,
        stationId,
        reason,
        actorUserId
      });
      if (serial.bin_id) {
        this.changeBalance(
          String(serial.part_id),
          String(serial.bin_id),
          nullable(serial.lot_id),
          String(serial.condition),
          -1
        );
      }
      if (warehouse) {
        this.consumeFifo(String(serial.part_id), String(warehouse.id), 1, [id], true);
      }
      this.insertMovementLine({
        movementId,
        partId: String(serial.part_id),
        fromBinId: nullable(serial.bin_id),
        toBinId: null,
        lotId: nullable(serial.lot_id),
        serialId: id,
        conditionFrom: String(serial.condition),
        conditionTo: 'SCRAPPED',
        quantity: 1,
        cost
      });
      sqlite
        .prepare(
          `UPDATE inventory_serialized_parts
           SET bin_id = NULL, aircraft_id = NULL, position = NULL, condition = 'SCRAPPED', updated_at = ?
           WHERE id = ?`
        )
        .run(now(), id);
      if (repair) {
        sqlite
          .prepare(
            `UPDATE inventory_repair_orders SET status = 'CANCELLED', updated_at = ? WHERE id = ?`
          )
          .run(now(), repair.id);
      }
      this.finalizeMovement(movementId, cost.baseUnitCostIdr);
      this.createAccountingEvent({
        eventType: 'INVENTORY_SCRAP',
        sourceType: 'SERIALIZED_PART_SCRAP',
        sourceId: id,
        movementId,
        stationId,
        currencyId: 'cur-idr',
        sourceAmountMinor: cost.baseUnitCostIdr,
        exchangeRateToIdrMicros: 1_000_000,
        baseAmountIdr: cost.baseUnitCostIdr,
        payload: { serialNumber: serial.serial_number, reason }
      });
    });
    transaction.immediate();
    return { id, condition: 'SCRAPPED' as const };
  }

  listRepairOrders(query: InventoryListQuery, scope: readonly string[]) {
    const scopeSql = this.scopeSql(scope, 'station');
    const rows = this.repository.sqlite
      .prepare(
        `SELECT repair.*, serial.serial_number, p.part_number, p.part_name, v.vendor_name,
                station.station_code
         FROM inventory_repair_orders repair
         JOIN inventory_serialized_parts serial ON serial.id = repair.serial_id
         JOIN inventory_parts p ON p.id = serial.part_id
         JOIN vendors v ON v.id = repair.vendor_id
         JOIN stations station ON station.id = repair.station_id
         WHERE 1 = 1 ${scopeSql.sql}
         ORDER BY repair.created_at DESC LIMIT ? OFFSET ?`
      )
      .all(...scopeSql.params, query.limit, query.offset) as SqlRow[];
    return rows.map((row) => ({
      id: String(row.id),
      repairNumber: String(row.repair_number),
      serialId: String(row.serial_id),
      serialNumber: String(row.serial_number),
      partNumber: String(row.part_number),
      partName: String(row.part_name),
      vendorId: String(row.vendor_id),
      vendorName: String(row.vendor_name),
      status: String(row.status),
      reason: String(row.reason),
      expectedReturnAt: nullable(row.expected_return_at),
      baseRepairCostIdr: num(row.base_repair_cost_idr),
      createdAt: String(row.created_at)
    }));
  }

  async reverseMovement(id: string, actorUserId: string, scope: readonly string[]) {
    const sqlite = this.repository.sqlite;
    const movement = sqlite
      .prepare(
        `SELECT m.*, m.rowid movement_rowid, s.station_code FROM inventory_movements m
         LEFT JOIN stations s ON s.id = m.station_id WHERE m.id = ?`
      )
      .get(id) as SqlRow | undefined;
    if (!movement) throw notFound('Inventory movement', id);
    this.assertStationCode(nullable(movement.station_code), scope);
    if (movement.status === 'REVERSED') return movement;
    const existingReversal = sqlite
      .prepare(
        `SELECT id FROM inventory_movements
         WHERE reversal_of_movement_id = ? AND is_finalized = 1 LIMIT 1`
      )
      .get(id) as SqlRow | undefined;
    if (existingReversal) {
      return this.repository
        .listMovements({ limit: 250, offset: 0 }, scope)
        .find((item) => item.id === existingReversal.id);
    }
    if (
      !['RECEIPT', 'ISSUE', 'ADJUSTMENT_GAIN', 'ADJUSTMENT_LOSS'].includes(
        String(movement.movement_type)
      )
    ) {
      throw new DomainError(
        'INVENTORY_MOVEMENT_NOT_REVERSIBLE',
        'This movement type requires a domain-specific correction rather than a generic reversal.',
        409
      );
    }
    const lines = sqlite
      .prepare(`SELECT * FROM inventory_movement_lines WHERE movement_id = ? ORDER BY id`)
      .all(id) as SqlRow[];
    if (movement.movement_type === 'ISSUE') {
      for (const line of lines) {
        if (!line.from_bin_id) continue;
        await this.assertTransferEligible(this.requirePart(String(line.part_id)), [
          {
            binId: String(line.from_bin_id),
            lotId: nullable(line.lot_id),
            serialId: nullable(line.serial_id),
            quantity: num(line.quantity)
          }
        ]);
      }
    }
    const transaction = sqlite.transaction(() => {
      if (movement.movement_type === 'ISSUE') {
        for (const line of lines.filter((item) => item.serial_id)) {
          const serial = this.requireSerial(String(line.serial_id));
          const downstream = sqlite
            .prepare(
              `SELECT later.id FROM inventory_movement_lines later_line
               JOIN inventory_movements later ON later.id = later_line.movement_id
               WHERE later_line.serial_id = ? AND later.rowid > ? AND later.is_finalized = 1
                 AND later.movement_type <> 'REVERSAL' LIMIT 1`
            )
            .get(line.serial_id, movement.movement_rowid) as SqlRow | undefined;
          if (
            downstream ||
            serial.bin_id ||
            serial.aircraft_id ||
            serial.position ||
            String(serial.condition) !== String(line.condition_from)
          ) {
            throw new DomainError(
              'INVENTORY_ISSUE_REVERSAL_HAS_DOWNSTREAM_ACTIVITY',
              'Reverse downstream serialized-component activity before reversing this issue.',
              409,
              { serialId: line.serial_id, downstreamMovementId: nullable(downstream?.id) }
            );
          }
        }
      }
      if (movement.movement_type === 'RECEIPT' || movement.movement_type === 'ADJUSTMENT_GAIN') {
        for (const line of lines) {
          const downstream = sqlite
            .prepare(
              `SELECT later.id FROM inventory_movement_lines later_line
               JOIN inventory_movements later ON later.id = later_line.movement_id
               WHERE later.rowid > ? AND later.is_finalized = 1
                 AND later.movement_type <> 'REVERSAL'
                 AND later_line.part_id = ? AND later_line.from_bin_id = ?
                 AND COALESCE(later_line.lot_id, '') = COALESCE(?, '')
                 AND (? IS NULL OR later_line.serial_id = ?)
               LIMIT 1`
            )
            .get(
              movement.movement_rowid,
              line.part_id,
              line.to_bin_id,
              line.lot_id,
              line.serial_id,
              line.serial_id
            ) as SqlRow | undefined;
          if (downstream) {
            throw new DomainError(
              'INVENTORY_REVERSAL_STOCK_MOVED',
              'Receipt cannot be reversed after its physical stock has moved.',
              409,
              { movementId: downstream.id }
            );
          }
          const layer = sqlite
            .prepare(`SELECT * FROM inventory_cost_layers WHERE source_movement_line_id = ?`)
            .get(line.id) as SqlRow | undefined;
          if (!layer || num(layer.remaining_quantity) + 1e-9 < num(layer.original_quantity)) {
            throw new DomainError(
              'INVENTORY_REVERSAL_STOCK_CONSUMED',
              'Receipt cannot be reversed after its stock has been consumed or transferred.',
              409
            );
          }
          this.changeBalance(
            String(line.part_id),
            String(line.to_bin_id),
            nullable(line.lot_id),
            String(line.condition_to),
            -num(line.quantity)
          );
          sqlite
            .prepare(`UPDATE inventory_cost_layers SET remaining_quantity = 0 WHERE id = ?`)
            .run(layer.id);
          if (line.serial_id) {
            sqlite
              .prepare(
                `UPDATE inventory_serialized_parts
                 SET bin_id = NULL, condition = 'UNSERVICEABLE', updated_at = ? WHERE id = ?`
              )
              .run(now(), line.serial_id);
          }
        }
      } else {
        for (const line of lines) {
          if (!line.from_bin_id) continue;
          this.changeBalance(
            String(line.part_id),
            String(line.from_bin_id),
            nullable(line.lot_id),
            String(line.condition_from),
            num(line.quantity)
          );
          if (line.serial_id) {
            sqlite
              .prepare(
                `UPDATE inventory_serialized_parts
                 SET bin_id = ?, condition = ?, aircraft_id = NULL, position = NULL, updated_at = ?
                 WHERE id = ?`
              )
              .run(line.from_bin_id, line.condition_from, now(), line.serial_id);
          }
        }
      }
      const reversalId = this.insertMovement({
        movementType: 'REVERSAL',
        sourceType: 'MOVEMENT_REVERSAL',
        sourceId: id,
        stationId: nullable(movement.station_id),
        aircraftId: nullable(movement.aircraft_id),
        flightId: nullable(movement.flight_id),
        reason: `Reversal of ${String(movement.movement_number)}.`,
        actorUserId,
        reversalOfMovementId: id,
        totalBaseValueIdr: num(movement.total_base_value_idr)
      });
      for (const line of lines) {
        const reversalLineId = this.insertMovementLine({
          movementId: reversalId,
          partId: String(line.part_id),
          fromBinId: nullable(line.to_bin_id),
          toBinId: nullable(line.from_bin_id),
          lotId: nullable(line.lot_id),
          serialId: nullable(line.serial_id),
          conditionFrom: nullable(line.condition_to),
          conditionTo: nullable(line.condition_from),
          quantity: num(line.quantity),
          cost: {
            layerId: '',
            lotId: nullable(line.lot_id),
            serialId: nullable(line.serial_id),
            receivedAt: String(movement.created_at),
            quantity: num(line.quantity),
            sourceUnitCostMinor: num(line.source_unit_cost_minor),
            currencyId: String(line.currency_id ?? 'cur-idr'),
            exchangeRateToIdrMicros: num(line.exchange_rate_to_idr_micros),
            baseUnitCostIdr: num(line.base_unit_cost_idr)
          }
        });
        if (
          ['ISSUE', 'ADJUSTMENT_LOSS'].includes(String(movement.movement_type)) &&
          line.from_bin_id
        ) {
          const restoredBin = this.requireBin(String(line.from_bin_id));
          sqlite
            .prepare(
              `INSERT INTO inventory_cost_layers
               (id, part_id, warehouse_id, lot_id, serial_id, source_movement_line_id,
                original_quantity, remaining_quantity, source_unit_cost_minor, currency_id,
                exchange_rate_to_idr_micros, base_unit_cost_idr, received_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              `inv-layer-${nanoid(10)}`,
              line.part_id,
              restoredBin.warehouse_id,
              line.lot_id,
              line.serial_id,
              reversalLineId,
              line.quantity,
              line.quantity,
              line.source_unit_cost_minor,
              line.currency_id,
              line.exchange_rate_to_idr_micros,
              line.base_unit_cost_idr,
              now()
            );
        }
      }
      this.finalizeMovement(reversalId, num(movement.total_base_value_idr));
      if (movement.source_type === 'GOODS_RECEIPT') {
        const receipt = sqlite
          .prepare(
            `SELECT id, purchase_order_id FROM inventory_goods_receipts WHERE movement_id = ?`
          )
          .get(id) as SqlRow | undefined;
        sqlite
          .prepare(`UPDATE inventory_goods_receipts SET status = 'REVERSED' WHERE movement_id = ?`)
          .run(id);
        if (receipt) {
          const receiptLines = sqlite
            .prepare(
              `SELECT purchase_order_line_id, SUM(quantity) quantity
               FROM inventory_goods_receipt_lines WHERE goods_receipt_id = ?
               GROUP BY purchase_order_line_id`
            )
            .all(receipt.id) as SqlRow[];
          for (const receiptLine of receiptLines) {
            sqlite
              .prepare(
                `UPDATE inventory_purchase_order_lines
                 SET received_quantity = MAX(0, received_quantity - ?) WHERE id = ?`
              )
              .run(receiptLine.quantity, receiptLine.purchase_order_line_id);
          }
          const receiptProgress = sqlite
            .prepare(
              `SELECT SUM(received_quantity) received,
                      SUM(quantity - received_quantity) outstanding
               FROM inventory_purchase_order_lines WHERE purchase_order_id = ?`
            )
            .get(receipt.purchase_order_id) as SqlRow;
          const poStatus =
            num(receiptProgress.received) <= 1e-9
              ? 'APPROVED'
              : num(receiptProgress.outstanding) <= 1e-9
                ? 'RECEIVED'
                : 'PARTIALLY_RECEIVED';
          sqlite
            .prepare(`UPDATE inventory_purchase_orders SET status = ?, updated_at = ? WHERE id = ?`)
            .run(poStatus, now(), receipt.purchase_order_id);
        }
      }
      if (movement.source_type === 'MAINTENANCE_PART_ISSUE') {
        sqlite
          .prepare(`UPDATE maintenance_part_issues SET status = 'REVERSED' WHERE movement_id = ?`)
          .run(id);
      }
      this.createAccountingEvent({
        eventType: 'INVENTORY_REVERSAL',
        sourceType: 'MOVEMENT_REVERSAL',
        sourceId: id,
        movementId: reversalId,
        stationId: nullable(movement.station_id),
        aircraftId: nullable(movement.aircraft_id),
        flightId: nullable(movement.flight_id),
        currencyId: 'cur-idr',
        sourceAmountMinor: num(movement.total_base_value_idr),
        exchangeRateToIdrMicros: 1_000_000,
        baseAmountIdr: num(movement.total_base_value_idr),
        payload: { reversedMovementId: id }
      });
      return reversalId;
    });
    const reversalId = transaction.immediate();
    return this.repository
      .listMovements({ limit: 250, offset: 0 }, scope)
      .find((item) => item.id === reversalId);
  }

  movementCsv(query: InventoryListQuery, scope: readonly string[], canReadValuation: boolean) {
    const rows = this.repository.listMovements({ ...query, limit: 250, offset: 0 }, scope);
    const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const header = [
      'Movement Number',
      'Type',
      'Source',
      'Station',
      'Aircraft',
      'Reason',
      'Status',
      ...(canReadValuation ? ['Base Value IDR'] : []),
      'Created At'
    ];
    return [
      header.map(quote).join(','),
      ...rows.map((row) =>
        [
          row.movementNumber,
          row.movementType,
          row.sourceType,
          row.stationId,
          row.aircraftId,
          row.reason,
          row.status,
          ...(canReadValuation ? [row.totalBaseValueIdr] : []),
          row.createdAt
        ]
          .map(quote)
          .join(',')
      )
    ].join('\n');
  }

  private requirePart(id: string) {
    const part = this.repository.getPart(id);
    if (!part || !Boolean(part.is_active)) throw notFound('Inventory part', id);
    return part;
  }

  private requireWarehouse(id: string, scope?: readonly string[]) {
    const warehouse = this.repository.sqlite
      .prepare(
        `SELECT w.*, s.station_code FROM inventory_warehouses w
         JOIN stations s ON s.id = w.station_id WHERE w.id = ? AND w.is_active = 1`
      )
      .get(id) as SqlRow | undefined;
    if (!warehouse) throw notFound('Inventory warehouse', id);
    if (scope) this.assertStationCode(String(warehouse.station_code), scope);
    return warehouse;
  }

  private requireBin(id: string, warehouseId?: string) {
    const bin = this.repository.sqlite
      .prepare(`SELECT * FROM inventory_bins WHERE id = ? AND is_active = 1`)
      .get(id) as SqlRow | undefined;
    if (!bin || (warehouseId && String(bin.warehouse_id) !== warehouseId)) {
      throw notFound('Inventory bin', id);
    }
    return bin;
  }

  private requireSerial(id: string) {
    const serial = this.repository.sqlite
      .prepare(`SELECT * FROM inventory_serialized_parts WHERE id = ?`)
      .get(id) as SqlRow | undefined;
    if (!serial) throw notFound('Serialized part', id);
    return serial;
  }

  private requireActiveReference(table: 'vendors' | 'currencies', id: string, label: string) {
    const row = this.repository.sqlite
      .prepare(`SELECT id FROM ${table} WHERE id = ? AND is_active = 1`)
      .get(id);
    if (!row) throw notFound(label, id);
  }

  private requireStationScope(stationId: string, scope: readonly string[]) {
    const station = this.repository.sqlite
      .prepare(`SELECT station_code FROM stations WHERE id = ? AND is_active = 1`)
      .get(stationId) as SqlRow | undefined;
    if (!station) throw notFound('Station', stationId);
    this.assertStationCode(String(station.station_code), scope);
    return station;
  }

  private assertStationCode(stationCode: string | null, scope: readonly string[]) {
    if (stationCode && !scope.includes('ALL') && !scope.includes(stationCode)) {
      throw new DomainError(
        'INVENTORY_STATION_FORBIDDEN',
        `Inventory at station ${stationCode} is outside the active role scope.`,
        403,
        { stationCode, scope }
      );
    }
  }

  private scopeSql(scope: readonly string[], alias: string) {
    if (scope.includes('ALL')) return { sql: '', params: [] as string[] };
    return {
      sql: ` AND ${alias}.station_code IN (${scope.map(() => '?').join(', ')})`,
      params: [...scope]
    };
  }

  private validateQuantity(part: SqlRow, quantity: number) {
    if (quantity <= 0) {
      throw new DomainError('INVENTORY_QUANTITY_INVALID', 'Quantity must be positive.', 422);
    }
    if (
      ['EA', 'SET', 'KIT'].includes(String(part.unit_of_measure)) &&
      !Number.isInteger(quantity)
    ) {
      throw new DomainError(
        'INVENTORY_DISCRETE_QUANTITY_INVALID',
        `${String(part.part_number)} requires a whole-number quantity.`,
        422
      );
    }
  }

  private nextNumber(prefix: string, table: string) {
    const count = num(
      (this.repository.sqlite.prepare(`SELECT COUNT(*) count FROM ${table}`).get() as SqlRow).count
    );
    return `${prefix}-${new Date().getUTCFullYear()}-${String(count + 1).padStart(4, '0')}`;
  }

  private convertToIdr(sourceMinor: number, currencyId: string, rateMicros: number) {
    const currency = this.repository.sqlite
      .prepare(`SELECT decimal_places FROM currencies WHERE id = ? AND is_active = 1`)
      .get(currencyId) as SqlRow | undefined;
    if (!currency) throw notFound('Currency', currencyId);
    return Math.round((sourceMinor * rateMicros) / 10 ** num(currency.decimal_places) / 1_000_000);
  }

  private changeBalance(
    partId: string,
    binId: string,
    lotId: string | null,
    condition: string,
    quantityDelta: number
  ) {
    const sqlite = this.repository.sqlite;
    const lotKey = lotId ?? '';
    const existing = sqlite
      .prepare(
        `SELECT * FROM inventory_stock_balances
         WHERE part_id = ? AND bin_id = ? AND lot_key = ? AND condition = ?`
      )
      .get(partId, binId, lotKey, condition) as SqlRow | undefined;
    const next = num(existing?.on_hand_quantity) + quantityDelta;
    if (next < -1e-9) {
      throw new DomainError(
        'INVENTORY_NEGATIVE_STOCK',
        'Inventory operation would create negative stock.',
        409,
        { partId, binId, lotId, condition, available: num(existing?.on_hand_quantity) }
      );
    }
    if (existing) {
      sqlite
        .prepare(
          `UPDATE inventory_stock_balances SET on_hand_quantity = ?, updated_at = ? WHERE id = ?`
        )
        .run(Math.max(0, next), now(), existing.id);
    } else {
      if (quantityDelta < 0) {
        throw new DomainError(
          'INVENTORY_NEGATIVE_STOCK',
          'Inventory stock bucket does not exist.',
          409
        );
      }
      sqlite
        .prepare(
          `INSERT INTO inventory_stock_balances
           (id, part_id, bin_id, lot_key, lot_id, condition, on_hand_quantity, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          `inv-bal-${nanoid(10)}`,
          partId,
          binId,
          lotKey,
          lotId,
          condition,
          quantityDelta,
          now()
        );
    }
  }

  private pickTransferStock(
    partId: string,
    binId: string,
    quantity: number,
    serialIds: string[],
    lotId: string | null
  ): PhysicalAllocation[] {
    const sqlite = this.repository.sqlite;
    const part = this.requirePart(partId);
    this.assertStoredPartTrackingControls(part);
    if (String(part.tracking_type) === 'SERIAL') {
      if (!Number.isInteger(quantity) || serialIds.length !== quantity) {
        throw new DomainError(
          'INVENTORY_SERIAL_SELECTION_REQUIRED',
          'Select one source serial number for each transferred unit.',
          422
        );
      }
      return serialIds.map((serialId) => {
        const serial = sqlite
          .prepare(
            `SELECT * FROM inventory_serialized_parts
             WHERE id = ? AND part_id = ? AND bin_id = ?
               AND condition NOT IN ('INSTALLED', 'IN_REPAIR', 'SCRAPPED')`
          )
          .get(serialId, partId, binId) as SqlRow | undefined;
        if (!serial || (lotId && String(serial.lot_id) !== lotId)) {
          throw new DomainError(
            'INVENTORY_SERIAL_NOT_AVAILABLE',
            `Serialized part ${serialId} is not available in the source bin.`,
            409
          );
        }
        return {
          binId,
          lotId: nullable(serial.lot_id),
          serialId,
          quantity: 1,
          condition: String(serial.condition)
        };
      });
    }
    const rows = sqlite
      .prepare(
        `SELECT * FROM inventory_stock_balances
         WHERE part_id = ? AND bin_id = ? AND on_hand_quantity > 0
           AND (? IS NULL OR lot_id = ?)
         ORDER BY updated_at, id`
      )
      .all(partId, binId, lotId, lotId) as SqlRow[];
    const allocations: PhysicalAllocation[] = [];
    let remaining = quantity;
    for (const row of rows) {
      const picked = Math.min(remaining, num(row.on_hand_quantity));
      if (picked > 0) {
        allocations.push({
          binId,
          lotId: nullable(row.lot_id),
          serialId: null,
          quantity: picked,
          condition: String(row.condition)
        });
        remaining -= picked;
      }
      if (remaining <= 1e-9) break;
    }
    if (remaining > 1e-9) {
      throw new DomainError(
        'INVENTORY_INSUFFICIENT_STOCK',
        `Insufficient source stock for ${String(part.part_number)}.`,
        409
      );
    }
    return allocations;
  }

  private pickPhysicalStock(
    partId: string,
    warehouseId: string,
    quantity: number,
    serialIds: string[] = [],
    lotId: string | null = null,
    binId: string | null = null
  ): PhysicalAllocation[] {
    const sqlite = this.repository.sqlite;
    const part = this.requirePart(partId);
    this.assertStoredPartTrackingControls(part);
    const tracking = String(part.tracking_type);
    const today = new Date().toISOString().slice(0, 10);
    if (tracking === 'SERIAL') {
      if (!Number.isInteger(quantity) || serialIds.length !== quantity) {
        throw new DomainError(
          'INVENTORY_SERIAL_SELECTION_REQUIRED',
          'Select one eligible serial number for each requested unit.',
          422
        );
      }
      return serialIds.map((serialId) => {
        const row = sqlite
          .prepare(
            `SELECT serial.*, bin.warehouse_id, bin.bin_type, lot.expires_at,
                    lot.certificate_verified lot_certificate_verified
             FROM inventory_serialized_parts serial
             JOIN inventory_bins bin ON bin.id = serial.bin_id
             LEFT JOIN inventory_lots lot ON lot.id = serial.lot_id
             WHERE serial.id = ? AND serial.part_id = ?`
          )
          .get(serialId, partId) as SqlRow | undefined;
        if (
          !row ||
          String(row.warehouse_id) !== warehouseId ||
          row.bin_type !== 'USABLE' ||
          row.condition !== 'SERVICEABLE' ||
          (Boolean(part.certificate_required) &&
            (!Boolean(row.certificate_verified) || !row.certificate_reference)) ||
          (row.expires_at && String(row.expires_at) < today) ||
          (binId && String(row.bin_id) !== binId)
        ) {
          throw new DomainError(
            'INVENTORY_SERIAL_NOT_AVAILABLE',
            `Serialized part ${serialId} is not eligible for issue.`,
            409
          );
        }
        return {
          binId: String(row.bin_id),
          lotId: nullable(row.lot_id),
          serialId,
          quantity: 1
        };
      });
    }
    const params: unknown[] = [partId, warehouseId, today];
    let filters = '';
    if (lotId) {
      filters += ' AND balance.lot_id = ?';
      params.push(lotId);
    }
    if (binId) {
      filters += ' AND balance.bin_id = ?';
      params.push(binId);
    }
    const rows = sqlite
      .prepare(
        `SELECT balance.*, lot.expires_at, lot.certificate_reference, lot.certificate_verified
         FROM inventory_stock_balances balance
         JOIN inventory_bins bin ON bin.id = balance.bin_id
         LEFT JOIN inventory_lots lot ON lot.id = balance.lot_id
         WHERE balance.part_id = ? AND bin.warehouse_id = ?
           AND bin.bin_type = 'USABLE' AND balance.condition = 'SERVICEABLE'
           AND balance.on_hand_quantity > 0
           AND (lot.expires_at IS NULL OR DATE(lot.expires_at) >= DATE(?))
           ${Boolean(part.certificate_required) ? 'AND lot.certificate_verified = 1 AND lot.certificate_reference IS NOT NULL' : ''}
           ${filters}
         ORDER BY CASE WHEN lot.expires_at IS NULL THEN 1 ELSE 0 END,
                  lot.expires_at, lot.created_at, balance.id`
      )
      .all(...params) as SqlRow[];
    const allocations: PhysicalAllocation[] = [];
    let remaining = quantity;
    for (const row of rows) {
      const picked = Math.min(remaining, num(row.on_hand_quantity));
      if (picked > 0) {
        allocations.push({
          binId: String(row.bin_id),
          lotId: nullable(row.lot_id),
          serialId: null,
          quantity: picked
        });
        remaining -= picked;
      }
      if (remaining <= 1e-9) break;
    }
    if (remaining > 1e-9) {
      throw new DomainError(
        'INVENTORY_INSUFFICIENT_STOCK',
        `Insufficient eligible stock for ${String(part.part_number)}.`,
        409,
        { requested: quantity, available: quantity - remaining }
      );
    }
    return allocations;
  }

  private consumeFifo(
    partId: string,
    warehouseId: string,
    quantity: number,
    serialIds: string[],
    update: boolean
  ): CostAllocation[] {
    const sqlite = this.repository.sqlite;
    let sql = `SELECT * FROM inventory_cost_layers
      WHERE part_id = ? AND warehouse_id = ? AND remaining_quantity > 0`;
    const params: unknown[] = [partId, warehouseId];
    if (serialIds.length) {
      sql += ` AND serial_id IN (${serialIds.map(() => '?').join(', ')})`;
      params.push(...serialIds);
    }
    sql += ' ORDER BY received_at, id';
    const layers = sqlite.prepare(sql).all(...params) as SqlRow[];
    const allocations: CostAllocation[] = [];
    let remaining = quantity;
    for (const layer of layers) {
      const consumed = Math.min(remaining, num(layer.remaining_quantity));
      if (consumed > 0) {
        allocations.push({
          layerId: String(layer.id),
          lotId: nullable(layer.lot_id),
          serialId: nullable(layer.serial_id),
          receivedAt: String(layer.received_at),
          quantity: consumed,
          sourceUnitCostMinor: num(layer.source_unit_cost_minor),
          currencyId: String(layer.currency_id),
          exchangeRateToIdrMicros: num(layer.exchange_rate_to_idr_micros),
          baseUnitCostIdr: num(layer.base_unit_cost_idr)
        });
        if (update) {
          sqlite
            .prepare(
              `UPDATE inventory_cost_layers SET remaining_quantity = remaining_quantity - ? WHERE id = ?`
            )
            .run(consumed, layer.id);
        }
        remaining -= consumed;
      }
      if (remaining <= 1e-9) break;
    }
    if (remaining > 1e-9) {
      throw new DomainError(
        'INVENTORY_FIFO_LAYER_INSUFFICIENT',
        'Available stock is missing sufficient FIFO valuation layers.',
        409,
        { partId, warehouseId, requested: quantity, valued: quantity - remaining }
      );
    }
    return allocations;
  }

  private combineAllocations(physical: PhysicalAllocation[], costs: CostAllocation[]) {
    const physicalQueue = physical.map((item) => ({ ...item }));
    const costQueue = costs.map((item) => ({ ...item }));
    const chunks: Array<{
      physical: PhysicalAllocation;
      cost: CostAllocation;
      quantity: number;
    }> = [];
    while (physicalQueue.length && costQueue.length) {
      const currentPhysical = physicalQueue[0]!;
      const currentCost = costQueue[0]!;
      const quantity = Math.min(currentPhysical.quantity, currentCost.quantity);
      chunks.push({
        physical: { ...currentPhysical, quantity },
        cost: { ...currentCost, quantity },
        quantity
      });
      currentPhysical.quantity -= quantity;
      currentCost.quantity -= quantity;
      if (currentPhysical.quantity <= 1e-9) physicalQueue.shift();
      if (currentCost.quantity <= 1e-9) costQueue.shift();
    }
    if (physicalQueue.length || costQueue.length) {
      throw new DomainError(
        'INVENTORY_ALLOCATION_MISMATCH',
        'Physical and FIFO allocations could not be reconciled.',
        500
      );
    }
    return chunks;
  }

  private async assertTransferEligible(part: SqlRow, allocations: PhysicalAllocation[]) {
    const sqlite = this.repository.sqlite;
    const today = new Date().toISOString().slice(0, 10);
    for (const allocation of allocations) {
      if (allocation.serialId) {
        const serial = this.requireSerial(allocation.serialId);
        const lot = serial.lot_id
          ? (sqlite.prepare(`SELECT * FROM inventory_lots WHERE id = ?`).get(serial.lot_id) as
              SqlRow | undefined)
          : undefined;
        if (lot?.expires_at) this.assertDateOnly(String(lot.expires_at), 'Stock expiry date');
        if (lot?.expires_at && String(lot.expires_at) < today) {
          throw new DomainError(
            'INVENTORY_STOCK_EXPIRED',
            'Expired serialized stock cannot be released or issued.',
            422
          );
        }
        if (Boolean(part.certificate_required)) {
          const certificateReference =
            nullable(serial.certificate_reference) ?? nullable(lot?.certificate_reference);
          if (!certificateReference) {
            throw new DomainError(
              'INVENTORY_CERTIFICATE_REFERENCE_REQUIRED',
              'Certificate-controlled serialized stock requires a certificate reference.',
              422
            );
          }
          await this.requireVerifiedCertificateDocument(String(part.id), certificateReference, [
            { ownerType: 'inventory_serial', ownerId: allocation.serialId },
            ...(serial.lot_id
              ? [{ ownerType: 'inventory_lot' as const, ownerId: String(serial.lot_id) }]
              : [])
          ]);
        }
      } else if (allocation.lotId) {
        const lot = sqlite
          .prepare(`SELECT * FROM inventory_lots WHERE id = ?`)
          .get(allocation.lotId) as SqlRow;
        if (lot.expires_at) this.assertDateOnly(String(lot.expires_at), 'Stock expiry date');
        if (lot.expires_at && String(lot.expires_at) < today) {
          throw new DomainError(
            'INVENTORY_STOCK_EXPIRED',
            'Expired lot cannot be released or issued.',
            422
          );
        }
        if (Boolean(part.certificate_required)) {
          const certificateReference = nullable(lot.certificate_reference);
          if (!certificateReference) {
            throw new DomainError(
              'INVENTORY_CERTIFICATE_REFERENCE_REQUIRED',
              'Certificate-controlled lot stock requires a certificate reference.',
              422
            );
          }
          await this.requireVerifiedCertificateDocument(String(part.id), certificateReference, [
            { ownerType: 'inventory_lot', ownerId: allocation.lotId }
          ]);
        }
      } else if (Boolean(part.certificate_required)) {
        await this.requireVerifiedCertificateDocument(String(part.id), null, []);
      }
    }
  }

  private assertUsableTransferLifecycle(allocations: PhysicalAllocation[]) {
    const sqlite = this.repository.sqlite;
    for (const allocation of allocations) {
      if (allocation.condition === 'UNSERVICEABLE' || allocation.condition === 'IN_REPAIR') {
        throw new DomainError(
          'INVENTORY_TRANSFER_CONDITION_INVALID',
          'Unserviceable or in-repair stock cannot be released through a generic transfer.',
          422
        );
      }
      if (!allocation.serialId) continue;
      const activeRepair = sqlite
        .prepare(
          `SELECT id FROM inventory_repair_orders
           WHERE serial_id = ? AND status NOT IN ('CLOSED', 'CANCELLED') LIMIT 1`
        )
        .get(allocation.serialId) as SqlRow | undefined;
      if (activeRepair) {
        throw new DomainError(
          'INVENTORY_TRANSFER_REPAIR_OPEN',
          'Close or cancel the active repair order before releasing this component.',
          409,
          { repairOrderId: activeRepair.id }
        );
      }
    }
  }

  private assertPartTrackingControls(input: InventoryPartInput) {
    if (
      input.trackingType === 'QUANTITY' &&
      (input.certificateRequired || input.shelfLifeDays !== null)
    ) {
      throw new DomainError(
        'INVENTORY_PART_TRACKING_CONTROL_INVALID',
        'Shelf-life or certificate-controlled parts require lot or serial tracking.',
        422
      );
    }
  }

  private assertStoredPartTrackingControls(part: SqlRow) {
    if (
      String(part.tracking_type) === 'QUANTITY' &&
      (Boolean(part.certificate_required) || part.shelf_life_days !== null)
    ) {
      throw new DomainError(
        'INVENTORY_PART_TRACKING_CONTROL_INVALID',
        'Shelf-life or certificate-controlled parts require lot or serial tracking.',
        422,
        { partId: part.id }
      );
    }
  }

  private assertDateOnly(value: string, label: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
      throw new DomainError('INVENTORY_DATE_INVALID', `${label} must use YYYY-MM-DD.`, 422);
    }
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
      throw new DomainError(
        'INVENTORY_DATE_INVALID',
        `${label} is not a valid calendar date.`,
        422
      );
    }
  }

  private assertTimestamp(value: string, label: string) {
    if (Number.isNaN(Date.parse(value))) {
      throw new DomainError('INVENTORY_TIMESTAMP_INVALID', `${label} is invalid.`, 422);
    }
  }

  private async requireVerifiedCertificateDocument(
    partId: string,
    certificateReference: string | null,
    owners: Array<{ ownerType: DocumentOwnerType; ownerId: string }>
  ) {
    const candidates = [...owners, { ownerType: 'inventory_part' as const, ownerId: partId }];
    const documents = (
      await Promise.all(
        candidates.map((owner) =>
          listDocuments({
            ownerType: owner.ownerType,
            ownerId: owner.ownerId,
            search: ''
          })
        )
      )
    ).flat();
    const valid = documents.some(
      (document) =>
        ['PART_CERTIFICATE', 'AUTHORIZED_RELEASE_CERTIFICATE'].includes(document.documentType) &&
        document.verificationStatus === 'VERIFIED' &&
        ['ACTIVE', 'EXPIRING'].includes(document.lifecycleStatus) &&
        (!certificateReference ||
          document.documentNumber === certificateReference ||
          document.id === certificateReference)
    );
    if (!valid) {
      throw new DomainError(
        'INVENTORY_CERTIFICATE_REQUIRED',
        'A matching verified and unexpired certificate document is required.',
        422,
        { partId, certificateReference }
      );
    }
  }

  private insertMovement(input: {
    movementType: string;
    sourceType: string;
    sourceId: string;
    stationId: string | null;
    destinationStationId?: string | null;
    aircraftId?: string | null;
    flightId?: string | null;
    reason: string;
    actorUserId: string;
    reversalOfMovementId?: string | null;
    totalBaseValueIdr?: number;
  }) {
    const id = `inv-move-${nanoid(10)}`;
    this.repository.sqlite
      .prepare(
        `INSERT INTO inventory_movements
         (id, movement_number, movement_type, source_type, source_id, station_id, aircraft_id,
          destination_station_id, flight_id, reason, status, reversal_of_movement_id,
          total_base_value_idr, is_finalized, created_by_user_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'POSTED', ?, ?, 0, ?, ?)`
      )
      .run(
        id,
        this.nextNumber('MOV', 'inventory_movements'),
        input.movementType,
        input.sourceType,
        input.sourceId,
        input.stationId,
        input.aircraftId ?? null,
        input.destinationStationId ?? null,
        input.flightId ?? null,
        input.reason,
        input.reversalOfMovementId ?? null,
        input.totalBaseValueIdr ?? 0,
        input.actorUserId,
        now()
      );
    return id;
  }

  private finalizeMovement(id: string, totalBaseValueIdr: number) {
    const result = this.repository.sqlite
      .prepare(
        `UPDATE inventory_movements
         SET total_base_value_idr = ?, is_finalized = 1
         WHERE id = ? AND is_finalized = 0`
      )
      .run(totalBaseValueIdr, id);
    if (result.changes !== 1) {
      throw new DomainError(
        'INVENTORY_MOVEMENT_FINALIZATION_INVALID',
        'Inventory movement is missing or already finalized.',
        409,
        { movementId: id }
      );
    }
  }

  private insertMovementLine(input: {
    movementId: string;
    partId: string;
    fromBinId: string | null;
    toBinId: string | null;
    lotId: string | null;
    serialId: string | null;
    conditionFrom: string | null;
    conditionTo: string | null;
    quantity: number;
    cost: CostAllocation;
  }) {
    const id = `inv-ml-${nanoid(10)}`;
    this.repository.sqlite
      .prepare(
        `INSERT INTO inventory_movement_lines
         (id, movement_id, part_id, from_bin_id, to_bin_id, lot_id, serial_id,
          condition_from, condition_to, quantity, source_unit_cost_minor, currency_id,
          exchange_rate_to_idr_micros, base_unit_cost_idr, base_value_idr)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.movementId,
        input.partId,
        input.fromBinId,
        input.toBinId,
        input.lotId,
        input.serialId,
        input.conditionFrom,
        input.conditionTo,
        input.quantity,
        input.cost.sourceUnitCostMinor,
        input.cost.currencyId,
        input.cost.exchangeRateToIdrMicros,
        input.cost.baseUnitCostIdr,
        Math.round(input.quantity * input.cost.baseUnitCostIdr)
      );
    return id;
  }

  private createAccountingEvent(input: {
    eventType: string;
    sourceType: string;
    sourceId: string;
    movementId: string;
    stationId: string | null;
    aircraftId?: string | null;
    flightId?: string | null;
    currencyId: string;
    sourceAmountMinor: number;
    exchangeRateToIdrMicros: number;
    baseAmountIdr: number;
    payload: Record<string, unknown>;
  }) {
    this.repository.sqlite
      .prepare(
        `INSERT INTO inventory_accounting_events
         (id, event_type, source_type, source_id, movement_id, station_id, aircraft_id,
          flight_id, currency_id, source_amount_minor, exchange_rate_to_idr_micros,
          base_amount_idr, integration_status, payload_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_INTEGRATION', ?, ?)`
      )
      .run(
        `inv-ae-${nanoid(10)}`,
        input.eventType,
        input.sourceType,
        input.sourceId,
        input.movementId,
        input.stationId,
        input.aircraftId ?? null,
        input.flightId ?? null,
        input.currencyId,
        input.sourceAmountMinor,
        input.exchangeRateToIdrMicros,
        input.baseAmountIdr,
        JSON.stringify(input.payload),
        now()
      );
  }

  private latestUnitCost(
    partId: string,
    warehouseId: string,
    lotId: string | null
  ): CostAllocation {
    const row = this.repository.sqlite
      .prepare(
        `SELECT * FROM inventory_cost_layers
         WHERE part_id = ? AND warehouse_id = ? AND (? IS NULL OR lot_id = ?)
         ORDER BY received_at DESC, id DESC LIMIT 1`
      )
      .get(partId, warehouseId, lotId, lotId) as SqlRow | undefined;
    if (!row) {
      return {
        layerId: '',
        lotId,
        serialId: null,
        receivedAt: now(),
        quantity: 0,
        sourceUnitCostMinor: 0,
        currencyId: 'cur-idr',
        exchangeRateToIdrMicros: 1_000_000,
        baseUnitCostIdr: 0
      };
    }
    return {
      layerId: String(row.id),
      lotId: nullable(row.lot_id),
      serialId: nullable(row.serial_id),
      receivedAt: String(row.received_at),
      quantity: num(row.remaining_quantity),
      sourceUnitCostMinor: num(row.source_unit_cost_minor),
      currencyId: String(row.currency_id),
      exchangeRateToIdrMicros: num(row.exchange_rate_to_idr_micros),
      baseUnitCostIdr: num(row.base_unit_cost_idr)
    };
  }

  private latestSerialCost(serialId: string) {
    const row = this.repository.sqlite
      .prepare(
        `SELECT * FROM inventory_cost_layers WHERE serial_id = ? ORDER BY received_at DESC, id DESC LIMIT 1`
      )
      .get(serialId) as SqlRow | undefined;
    if (row) {
      return {
        layerId: String(row.id),
        lotId: nullable(row.lot_id),
        serialId,
        receivedAt: String(row.received_at),
        quantity: 1,
        sourceUnitCostMinor: num(row.source_unit_cost_minor),
        currencyId: String(row.currency_id),
        exchangeRateToIdrMicros: num(row.exchange_rate_to_idr_micros),
        baseUnitCostIdr: num(row.base_unit_cost_idr)
      } satisfies CostAllocation;
    }
    const movement = this.repository.sqlite
      .prepare(
        `SELECT * FROM inventory_movement_lines WHERE serial_id = ? ORDER BY rowid DESC LIMIT 1`
      )
      .get(serialId) as SqlRow | undefined;
    return {
      layerId: '',
      lotId: nullable(movement?.lot_id),
      serialId,
      receivedAt: now(),
      quantity: 1,
      sourceUnitCostMinor: num(movement?.source_unit_cost_minor),
      currencyId: String(movement?.currency_id ?? 'cur-idr'),
      exchangeRateToIdrMicros: num(movement?.exchange_rate_to_idr_micros) || 1_000_000,
      baseUnitCostIdr: num(movement?.base_unit_cost_idr)
    } satisfies CostAllocation;
  }

  private assertAircraftApplicability(part: SqlRow, aircraft: SqlRow) {
    const applications = this.repository.sqlite
      .prepare(`SELECT * FROM inventory_part_applicabilities WHERE part_id = ?`)
      .all(part.id) as SqlRow[];
    if (!applications.length) return;
    const applicable = applications.some(
      (item) =>
        String(item.aircraft_type).toLowerCase() === String(aircraft.aircraft_type).toLowerCase() &&
        (!item.model || String(item.model).toLowerCase() === String(aircraft.model).toLowerCase())
    );
    if (!applicable) {
      throw new DomainError(
        'INVENTORY_PART_NOT_APPLICABLE',
        `${String(part.part_number)} is not applicable to ${String(aircraft.registration_number)}.`,
        422
      );
    }
  }

  private requirePurchaseRequestRow(id: string, scope: readonly string[]) {
    const row = this.repository.sqlite
      .prepare(
        `SELECT pr.*, s.station_code FROM inventory_purchase_requests pr
         JOIN stations s ON s.id = pr.station_id WHERE pr.id = ?`
      )
      .get(id) as SqlRow | undefined;
    if (!row) throw notFound('Purchase request', id);
    this.assertStationCode(String(row.station_code), scope);
    return row;
  }

  private requirePurchaseRequest(id: string, scope: readonly string[]) {
    this.requirePurchaseRequestRow(id, scope);
    return this.repository
      .listPurchaseRequests({ limit: 250, offset: 0 }, scope)
      .find((item) => item.id === id)!;
  }

  private requirePurchaseOrderRow(id: string, scope: readonly string[]) {
    const row = this.repository.sqlite
      .prepare(
        `SELECT po.*, pr.station_id, s.station_code FROM inventory_purchase_orders po
         JOIN inventory_purchase_requests pr ON pr.id = po.purchase_request_id
         JOIN stations s ON s.id = pr.station_id WHERE po.id = ?`
      )
      .get(id) as SqlRow | undefined;
    if (!row) throw notFound('Purchase order', id);
    this.assertStationCode(String(row.station_code), scope);
    return row;
  }

  private requirePurchaseOrder(id: string, scope: readonly string[]) {
    this.requirePurchaseOrderRow(id, scope);
    return this.repository
      .listPurchaseOrders({ limit: 250, offset: 0 }, scope)
      .find((item) => item.id === id)!;
  }

  private requireReceipt(id: string, scope: readonly string[]) {
    const row = this.repository.sqlite
      .prepare(
        `SELECT gr.*, s.station_code FROM inventory_goods_receipts gr
         JOIN inventory_warehouses w ON w.id = gr.warehouse_id
         JOIN stations s ON s.id = w.station_id WHERE gr.id = ?`
      )
      .get(id) as SqlRow | undefined;
    if (!row) throw notFound('Goods receipt', id);
    this.assertStationCode(String(row.station_code), scope);
    return this.repository
      .listReceipts({ limit: 250, offset: 0 }, scope)
      .find((item) => item.id === id)!;
  }

  private requireIssue(id: string, scope: readonly string[]) {
    const row = this.repository.sqlite
      .prepare(
        `SELECT issue.*, s.station_code FROM maintenance_part_issues issue
         JOIN inventory_warehouses w ON w.id = issue.warehouse_id
         JOIN stations s ON s.id = w.station_id WHERE issue.id = ?`
      )
      .get(id) as SqlRow | undefined;
    if (!row) throw notFound('Maintenance part issue', id);
    this.assertStationCode(String(row.station_code), scope);
    return this.repository
      .listIssues({ limit: 250, offset: 0 }, scope)
      .find((item) => item.id === id)!;
  }

  private requireCountRow(id: string, scope: readonly string[]) {
    const row = this.repository.sqlite
      .prepare(
        `SELECT count.*, w.station_id, s.station_code FROM inventory_counts count
         JOIN inventory_warehouses w ON w.id = count.warehouse_id
         JOIN stations s ON s.id = w.station_id WHERE count.id = ?`
      )
      .get(id) as SqlRow | undefined;
    if (!row) throw notFound('Inventory count', id);
    this.assertStationCode(String(row.station_code), scope);
    return row;
  }

  private requireSerializedDto(id: string, scope: readonly string[]) {
    const serial = this.requireSerial(id);
    if (serial.bin_id) {
      const bin = this.requireBin(String(serial.bin_id));
      this.requireWarehouse(String(bin.warehouse_id), scope);
    }
    const result = this.repository
      .listSerialized({ limit: 250, offset: 0 }, scope)
      .find((item) => item.id === id);
    if (!result) throw notFound('Serialized part', id);
    return result;
  }

  private requireRepairRow(id: string, scope: readonly string[]) {
    const row = this.repository.sqlite
      .prepare(
        `SELECT repair.*, bin.warehouse_id, repair.station_id, s.station_code
         FROM inventory_repair_orders repair
         JOIN inventory_serialized_parts serial ON serial.id = repair.serial_id
         LEFT JOIN inventory_bins bin ON bin.id = serial.bin_id
         JOIN stations s ON s.id = repair.station_id WHERE repair.id = ?`
      )
      .get(id) as SqlRow | undefined;
    if (!row) throw notFound('Repair order', id);
    this.assertStationCode(nullable(row.station_code), scope);
    return row;
  }

  private getRepairOrder(id: string, scope: readonly string[]) {
    this.requireRepairRow(id, scope);
    return this.listRepairOrders({ limit: 250, offset: 0 }, scope).find((item) => item.id === id)!;
  }
}
