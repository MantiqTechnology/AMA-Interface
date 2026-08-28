import type { H3Event } from 'h3';
import type { DocumentOwnerType, DocumentVisibility } from '../../shared/contracts/documents';
import { getDbClient } from '../db/client';
import { getDemoStationScope, hasDemoPermission } from './auth';
import { DomainError, notFound } from './errors';

const inventoryOwnerTypes = new Set<DocumentOwnerType>([
  'inventory_part',
  'inventory_lot',
  'inventory_serial',
  'purchase_order',
  'goods_receipt'
]);

type OwnerAccess = {
  exists: boolean;
  stationCodes: string[];
  globalOnly: boolean;
  permissions: string[];
};

function queryStationCodes(sql: string, ownerId: string) {
  const bindings = Array.from({ length: (sql.match(/\?/g) ?? []).length }, () => ownerId);
  return (
    getDbClient()
      .sqlite.prepare(sql)
      .all(...bindings) as Array<{ station_code: string | null }>
  )
    .map((row) => row.station_code)
    .filter((code): code is string => Boolean(code));
}

function exists(table: string, ownerId: string) {
  const allowedTables = new Set([
    'aircraft',
    'crews',
    'stations',
    'vendors',
    'customers',
    'agents',
    'rate_cards',
    'contract_subsidy_programs',
    'routes',
    'flight_operations',
    'inventory_parts',
    'inventory_lots',
    'inventory_serialized_parts',
    'inventory_purchase_orders',
    'inventory_goods_receipts'
  ]);
  if (!allowedTables.has(table)) return false;
  return Boolean(getDbClient().sqlite.prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(ownerId));
}

function inventoryAccess(ownerType: DocumentOwnerType, ownerId: string): OwnerAccess {
  if (ownerType === 'inventory_part') {
    return {
      exists: exists('inventory_parts', ownerId),
      globalOnly: false,
      permissions: ['inventory.read'],
      stationCodes: queryStationCodes(
        `SELECT DISTINCT station_code FROM (
          SELECT station.station_code FROM inventory_reorder_rules rule
          JOIN inventory_warehouses warehouse ON warehouse.id = rule.warehouse_id
          JOIN stations station ON station.id = warehouse.station_id WHERE rule.part_id = ?
          UNION
          SELECT station.station_code FROM inventory_stock_balances balance
          JOIN inventory_bins bin ON bin.id = balance.bin_id
          JOIN inventory_warehouses warehouse ON warehouse.id = bin.warehouse_id
          JOIN stations station ON station.id = warehouse.station_id WHERE balance.part_id = ?
        )`,
        ownerId
      )
    };
  }
  if (ownerType === 'inventory_lot') {
    return {
      exists: exists('inventory_lots', ownerId),
      globalOnly: false,
      permissions: ['inventory.read'],
      stationCodes: queryStationCodes(
        `SELECT DISTINCT station.station_code FROM inventory_stock_balances balance
         JOIN inventory_bins bin ON bin.id = balance.bin_id
         JOIN inventory_warehouses warehouse ON warehouse.id = bin.warehouse_id
         JOIN stations station ON station.id = warehouse.station_id WHERE balance.lot_id = ?`,
        ownerId
      )
    };
  }
  if (ownerType === 'inventory_serial') {
    return {
      exists: exists('inventory_serialized_parts', ownerId),
      globalOnly: false,
      permissions: ['inventory.read'],
      stationCodes: queryStationCodes(
        `SELECT DISTINCT station_code FROM (
          SELECT station.station_code FROM inventory_serialized_parts serial
          JOIN inventory_bins bin ON bin.id = serial.bin_id
          JOIN inventory_warehouses warehouse ON warehouse.id = bin.warehouse_id
          JOIN stations station ON station.id = warehouse.station_id WHERE serial.id = ?
          UNION
          SELECT station.station_code FROM inventory_serialized_parts serial
          JOIN aircraft aircraft_record ON aircraft_record.id = serial.aircraft_id
          JOIN stations station ON station.id = aircraft_record.current_station_id WHERE serial.id = ?
        )`,
        ownerId
      )
    };
  }
  if (ownerType === 'purchase_order') {
    return {
      exists: exists('inventory_purchase_orders', ownerId),
      globalOnly: false,
      permissions: ['inventory.read'],
      stationCodes: queryStationCodes(
        `SELECT station.station_code FROM inventory_purchase_orders orders
         JOIN inventory_purchase_requests request ON request.id = orders.purchase_request_id
         JOIN stations station ON station.id = request.station_id WHERE orders.id = ?`,
        ownerId
      )
    };
  }
  return {
    exists: exists('inventory_goods_receipts', ownerId),
    globalOnly: false,
    permissions: ['inventory.read'],
    stationCodes: queryStationCodes(
      `SELECT station.station_code FROM inventory_goods_receipts receipt
       JOIN inventory_warehouses warehouse ON warehouse.id = receipt.warehouse_id
       JOIN stations station ON station.id = warehouse.station_id WHERE receipt.id = ?`,
      ownerId
    )
  };
}

export function resolveDocumentOwnerAccess(
  ownerType: DocumentOwnerType,
  ownerId: string
): OwnerAccess {
  if (inventoryOwnerTypes.has(ownerType)) return inventoryAccess(ownerType, ownerId);
  if (ownerType === 'aircraft') {
    return {
      exists: exists('aircraft', ownerId),
      globalOnly: false,
      permissions: ['aircraft.airworthiness.read', 'maintenance.package.read', 'flight.read'],
      stationCodes: queryStationCodes(
        `SELECT station.station_code FROM aircraft record
         LEFT JOIN stations station ON station.id = record.current_station_id WHERE record.id = ?`,
        ownerId
      )
    };
  }
  if (ownerType === 'aircraft_type') {
    const row = getDbClient()
      .sqlite.prepare('SELECT 1 FROM aircraft WHERE aircraft_type = ? OR model = ?')
      .get(ownerId, ownerId);
    return {
      exists: Boolean(row),
      globalOnly: true,
      permissions: ['aircraft.airworthiness.read', 'maintenance.package.read'],
      stationCodes: []
    };
  }
  if (ownerType === 'personnel') {
    return {
      exists: exists('crews', ownerId),
      globalOnly: false,
      permissions: ['personnel.read'],
      stationCodes: queryStationCodes(
        `SELECT station.station_code FROM crews person
         LEFT JOIN stations station ON station.id = COALESCE(person.duty_station_id, person.base_station_id)
         WHERE person.id = ?`,
        ownerId
      )
    };
  }
  if (ownerType === 'station' || ownerType === 'airport') {
    return {
      exists: exists('stations', ownerId),
      globalOnly: false,
      permissions: ['station.task.view'],
      stationCodes: queryStationCodes('SELECT station_code FROM stations WHERE id = ?', ownerId)
    };
  }
  if (ownerType === 'route') {
    return {
      exists: exists('routes', ownerId),
      globalOnly: false,
      permissions: ['flight.read'],
      stationCodes: queryStationCodes(
        `SELECT station.station_code FROM routes route
         JOIN stations station ON station.id IN (route.origin_station_id, route.destination_station_id)
         WHERE route.id = ?`,
        ownerId
      )
    };
  }
  if (ownerType === 'flight') {
    return {
      exists: exists('flight_operations', ownerId),
      globalOnly: false,
      permissions: ['flight.read'],
      stationCodes: queryStationCodes(
        `SELECT station.station_code FROM flight_operations flight
         JOIN stations station ON station.id IN (flight.origin_station_id, flight.destination_station_id)
         WHERE flight.id = ?`,
        ownerId
      )
    };
  }
  if (ownerType === 'corporate_asset') {
    const rows = queryStationCodes(
      `SELECT station.station_code FROM managed_assets asset
       LEFT JOIN stations station ON station.id = asset.station_id WHERE asset.id = ?`,
      ownerId
    );
    const assetExists = Boolean(
      getDbClient().sqlite.prepare('SELECT 1 FROM managed_assets WHERE id = ?').get(ownerId)
    );
    return {
      exists: assetExists,
      stationCodes: rows,
      globalOnly: false,
      permissions: ['asset.read']
    };
  }

  const globalOwners: Partial<Record<DocumentOwnerType, { table: string; permissions: string[] }>> =
    {
      vendor: { table: 'vendors', permissions: ['finance.accounting.read'] },
      customer: { table: 'customers', permissions: ['customer.read'] },
      commercial_agent: { table: 'agents', permissions: ['agent.read'] },
      rate_card: { table: 'rate_cards', permissions: ['rate.read'] },
      contract_subsidy: {
        table: 'contract_subsidy_programs',
        permissions: ['commercial.contract.read']
      }
    };
  const global = globalOwners[ownerType];
  if (global) {
    return {
      exists: exists(global.table, ownerId),
      stationCodes: [],
      globalOnly: true,
      permissions: global.permissions
    };
  }
  if (ownerType === 'company') {
    return {
      exists: ownerId === 'pt-ama' || ownerId === 'company-ama',
      stationCodes: [],
      globalOnly: true,
      permissions: ['platform.dashboard.view']
    };
  }
  return { exists: false, stationCodes: [], globalOnly: true, permissions: [] };
}

function hasAnyPermission(event: H3Event, permissions: string[]) {
  return permissions.some((permission) => hasDemoPermission(event, permission));
}

function canReadRestrictedDocument(
  event: H3Event,
  ownerType: DocumentOwnerType,
  documentType: string
) {
  if (ownerType === 'personnel') {
    if (documentType.includes('MEDICAL')) return hasDemoPermission(event, 'personnel.medical.read');
    if (documentType.includes('LICENSE')) return hasDemoPermission(event, 'personnel.license.read');
    return hasDemoPermission(event, 'personnel.documents.read');
  }
  if (ownerType === 'vendor') return hasDemoPermission(event, 'finance.accounting.read');
  if (ownerType === 'flight' && documentType.includes('DANGEROUS_GOODS')) {
    return hasDemoPermission(event, 'flight.manifest.sensitive.read');
  }
  return hasDemoPermission(event, 'document.restricted.read');
}

export function canAccessDocumentOwner(
  event: H3Event,
  ownerType: DocumentOwnerType,
  ownerId: string,
  visibility: DocumentVisibility = 'INTERNAL',
  documentType = ''
) {
  const owner = resolveDocumentOwnerAccess(ownerType, ownerId);
  if (!owner.exists || !hasAnyPermission(event, owner.permissions)) return false;
  if (visibility === 'RESTRICTED' && !canReadRestrictedDocument(event, ownerType, documentType)) {
    return false;
  }
  const scope = getDemoStationScope(event);
  if (scope.includes('ALL')) return true;
  if (owner.globalOnly) return false;
  return owner.stationCodes.some((stationCode) => scope.includes(stationCode));
}

export function requireDocumentOwnerAccess(
  event: H3Event,
  ownerType: DocumentOwnerType,
  ownerId: string,
  visibility: DocumentVisibility = 'INTERNAL',
  documentType = ''
) {
  const owner = resolveDocumentOwnerAccess(ownerType, ownerId);
  if (!owner.exists) throw notFound('Document owner', ownerId);
  if (!canAccessDocumentOwner(event, ownerType, ownerId, visibility, documentType)) {
    throw new DomainError(
      'DOCUMENT_OWNER_FORBIDDEN',
      'The document owner or visibility is outside the active role authority.',
      403,
      { ownerType, ownerId, stationCodes: owner.stationCodes, scope: getDemoStationScope(event) }
    );
  }
}
