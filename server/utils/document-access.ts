import type { H3Event } from 'h3';
import type { DocumentOwnerType } from '../../shared/contracts/documents';
import { getDbClient } from '../db/client';
import { getDemoStationScope } from './auth';
import { DomainError, notFound } from './errors';

const inventoryOwnerTypes = new Set<DocumentOwnerType>([
  'inventory_part',
  'inventory_lot',
  'inventory_serial',
  'purchase_order',
  'goods_receipt'
]);

type OwnerAccess = {
  inventoryOwner: boolean;
  exists: boolean;
  stationCodes: string[];
};

function stationCodes(sql: string, ownerId: string) {
  const bindings = Array.from({ length: (sql.match(/\?/g) ?? []).length }, () => ownerId);
  return (
    getDbClient()
      .sqlite.prepare(sql)
      .all(...bindings) as Array<{ station_code: string | null }>
  )
    .map((row) => row.station_code)
    .filter((code): code is string => Boolean(code));
}

export function resolveDocumentOwnerAccess(
  ownerType: DocumentOwnerType,
  ownerId: string
): OwnerAccess {
  if (!inventoryOwnerTypes.has(ownerType)) {
    return { inventoryOwner: false, exists: true, stationCodes: [] };
  }
  const sqlite = getDbClient().sqlite;
  if (ownerType === 'inventory_part') {
    const exists = Boolean(
      sqlite.prepare(`SELECT 1 FROM inventory_parts WHERE id = ?`).get(ownerId)
    );
    return {
      inventoryOwner: true,
      exists,
      stationCodes: stationCodes(
        `SELECT DISTINCT station_code FROM (
           SELECT station.station_code FROM inventory_reorder_rules rule
           JOIN inventory_warehouses warehouse ON warehouse.id = rule.warehouse_id
           JOIN stations station ON station.id = warehouse.station_id WHERE rule.part_id = ?
           UNION
           SELECT station.station_code FROM inventory_stock_balances balance
           JOIN inventory_bins bin ON bin.id = balance.bin_id
           JOIN inventory_warehouses warehouse ON warehouse.id = bin.warehouse_id
           JOIN stations station ON station.id = warehouse.station_id WHERE balance.part_id = ?
           UNION
           SELECT station.station_code FROM inventory_purchase_request_lines line
           JOIN inventory_purchase_requests request ON request.id = line.purchase_request_id
           JOIN stations station ON station.id = request.station_id WHERE line.part_id = ?
         )`,
        ownerId
      )
    };
  }
  if (ownerType === 'inventory_lot') {
    const exists = Boolean(
      sqlite.prepare(`SELECT 1 FROM inventory_lots WHERE id = ?`).get(ownerId)
    );
    return {
      inventoryOwner: true,
      exists,
      stationCodes: stationCodes(
        `SELECT DISTINCT station_code FROM (
           SELECT station.station_code FROM inventory_stock_balances balance
           JOIN inventory_bins bin ON bin.id = balance.bin_id
           JOIN inventory_warehouses warehouse ON warehouse.id = bin.warehouse_id
           JOIN stations station ON station.id = warehouse.station_id WHERE balance.lot_id = ?
           UNION
           SELECT station.station_code FROM inventory_goods_receipt_lines line
           JOIN inventory_goods_receipts receipt ON receipt.id = line.goods_receipt_id
           JOIN inventory_warehouses warehouse ON warehouse.id = receipt.warehouse_id
           JOIN stations station ON station.id = warehouse.station_id WHERE line.lot_id = ?
         )`,
        ownerId
      )
    };
  }
  if (ownerType === 'inventory_serial') {
    const exists = Boolean(
      sqlite.prepare(`SELECT 1 FROM inventory_serialized_parts WHERE id = ?`).get(ownerId)
    );
    return {
      inventoryOwner: true,
      exists,
      stationCodes: stationCodes(
        `SELECT DISTINCT station_code FROM (
           SELECT station.station_code FROM inventory_serialized_parts serial
           JOIN inventory_bins bin ON bin.id = serial.bin_id
           JOIN inventory_warehouses warehouse ON warehouse.id = bin.warehouse_id
           JOIN stations station ON station.id = warehouse.station_id WHERE serial.id = ?
           UNION
           SELECT station.station_code FROM inventory_serialized_parts serial
           JOIN aircraft aircraft_record ON aircraft_record.id = serial.aircraft_id
           JOIN stations station ON station.id = aircraft_record.current_station_id WHERE serial.id = ?
           UNION
           SELECT station.station_code FROM inventory_repair_orders repair
           JOIN stations station ON station.id = repair.station_id
           WHERE repair.serial_id = ? AND repair.status NOT IN ('CLOSED', 'CANCELLED')
         )`,
        ownerId
      )
    };
  }
  if (ownerType === 'purchase_order') {
    const exists = Boolean(
      sqlite.prepare(`SELECT 1 FROM inventory_purchase_orders WHERE id = ?`).get(ownerId)
    );
    return {
      inventoryOwner: true,
      exists,
      stationCodes: stationCodes(
        `SELECT station.station_code FROM inventory_purchase_orders orders
         JOIN inventory_purchase_requests request ON request.id = orders.purchase_request_id
         JOIN stations station ON station.id = request.station_id WHERE orders.id = ?`,
        ownerId
      )
    };
  }
  const exists = Boolean(
    sqlite.prepare(`SELECT 1 FROM inventory_goods_receipts WHERE id = ?`).get(ownerId)
  );
  return {
    inventoryOwner: true,
    exists,
    stationCodes: stationCodes(
      `SELECT station.station_code FROM inventory_goods_receipts receipt
       JOIN inventory_warehouses warehouse ON warehouse.id = receipt.warehouse_id
       JOIN stations station ON station.id = warehouse.station_id WHERE receipt.id = ?`,
      ownerId
    )
  };
}

export function canAccessDocumentOwner(
  event: H3Event,
  ownerType: DocumentOwnerType,
  ownerId: string
) {
  const owner = resolveDocumentOwnerAccess(ownerType, ownerId);
  if (!owner.inventoryOwner) return true;
  if (!owner.exists) return false;
  const scope = getDemoStationScope(event);
  return (
    scope.includes('ALL') ||
    (owner.stationCodes.length > 0 && owner.stationCodes.every((code) => scope.includes(code)))
  );
}

export function requireDocumentOwnerAccess(
  event: H3Event,
  ownerType: DocumentOwnerType,
  ownerId: string
) {
  const owner = resolveDocumentOwnerAccess(ownerType, ownerId);
  if (!owner.inventoryOwner) return;
  if (!owner.exists) throw notFound('Inventory document owner', ownerId);
  if (!canAccessDocumentOwner(event, ownerType, ownerId)) {
    throw new DomainError(
      'INVENTORY_DOCUMENT_STATION_FORBIDDEN',
      'The document owner is outside the active role station scope.',
      403,
      { ownerType, ownerId, stationCodes: owner.stationCodes, scope: getDemoStationScope(event) }
    );
  }
}
