import { rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { $fetch, setup } from '@nuxt/test-utils/e2e';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ApiResponse } from '../../shared/contracts/api';
import type { MasterDocumentDto } from '../../shared/contracts/documents';
import type {
  GoodsReceiptDto,
  InventoryDashboardDto,
  InventoryMovementDto,
  InventoryStockDto,
  InventoryWarehouseDto,
  PurchaseOrderDto,
  PurchaseRequestDto
} from '../../shared/features/inventory';
import { resolveDbPath } from '../../server/db/client';
import { resetDemoDatabase } from '../../server/db/reset-demo';

process.env.DEMO_MODE = 'true';
const testDbPath = './data/test-inventory-api.sqlite';
const testDocumentPath = './data/test-inventory-api-documents.json';
process.env.AMA_DB_PATH = testDbPath;
process.env.AMA_DOCUMENT_MANIFEST = testDocumentPath;

const controllerCookie = { cookie: 'ama_demo_role=Inventory%20Controller' };
const directorCookie = { cookie: 'ama_demo_role=Director' };

beforeAll(async () => {
  await resetDemoDatabase(testDbPath);
  const timestamp = '2026-07-16T00:00:00.000Z';
  writeFileSync(
    testDocumentPath,
    JSON.stringify({
      documents: [
        {
          id: 'doc-api-filter-lot',
          ownerType: 'inventory_lot',
          ownerId: 'inv-lot-filter-260701',
          uploadId: 'upload-api-filter-lot',
          documentType: 'AUTHORIZED_RELEASE_CERTIFICATE',
          title: 'API filter lot certificate',
          documentNumber: 'ARC-DEMO-PC6-260701',
          issuer: 'Inventory API test',
          issuedAt: '2026-01-01',
          validFrom: '2026-01-01',
          expiresAt: '2028-12-31',
          verificationStatus: 'VERIFIED',
          visibility: 'INTERNAL',
          version: 1,
          uploadedBy: 'Inventory API test',
          uploadedAt: timestamp,
          verifiedBy: 'Inventory API test',
          verifiedAt: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ]
    })
  );
});

afterAll(() => {
  rmSync(testDocumentPath, { force: true });
});

await setup({
  rootDir: fileURLToPath(new URL('../..', import.meta.url)),
  server: true,
  browser: false
});

describe('inventory APIs', () => {
  it('enforces role permissions and station scope', async () => {
    const controllerApproval = await $fetch<ApiResponse<PurchaseOrderDto>>(
      '/api/inventory/purchase-orders/inv-po-demo-001/approve',
      { method: 'POST', headers: controllerCookie, ignoreResponseError: true }
    );
    expect(!controllerApproval.ok && controllerApproval.error.code).toBe('FORBIDDEN');

    const directorAdjustment = await $fetch<ApiResponse<unknown>>('/api/inventory/adjustments', {
      method: 'POST',
      headers: directorCookie,
      body: {
        partId: 'inv-part-oil',
        binId: 'inv-bin-djj-usable',
        quantityDelta: 1,
        reason: 'Permission regression test.'
      },
      ignoreResponseError: true
    });
    expect(!directorAdjustment.ok && directorAdjustment.error.code).toBe('FORBIDDEN');

    const financeMutation = await $fetch<ApiResponse<unknown>>('/api/inventory/parts', {
      method: 'POST',
      headers: { cookie: 'ama_demo_role=Finance%20Reviewer' },
      body: {
        partNumber: 'DENIED-001',
        partName: 'Denied part',
        manufacturer: 'Denied',
        unitOfMeasure: 'EA',
        lifecycleType: 'CONSUMABLE',
        trackingType: 'QUANTITY',
        criticality: 'STANDARD',
        certificateRequired: false,
        shelfLifeDays: null,
        aircraftApplicability: []
      },
      ignoreResponseError: true
    });
    expect(!financeMutation.ok && financeMutation.error.code).toBe('FORBIDDEN');

    const maintenanceWarehouses = await $fetch<ApiResponse<InventoryWarehouseDto[]>>(
      '/api/inventory/warehouses',
      { headers: { cookie: 'ama_demo_role=Maintenance%20Manager' } }
    );
    expect(maintenanceWarehouses.ok).toBe(true);
    expect(
      maintenanceWarehouses.ok &&
        maintenanceWarehouses.data.map((warehouse) => warehouse.stationCode)
    ).toEqual(['DJJ']);

    const stationWarehouses = await $fetch<ApiResponse<InventoryWarehouseDto[]>>(
      '/api/inventory/warehouses',
      { headers: { cookie: 'ama_demo_role=Station%20Admin' } }
    );
    expect(stationWarehouses.ok).toBe(true);
    expect(
      stationWarehouses.ok && stationWarehouses.data.map((warehouse) => warehouse.stationCode)
    ).toEqual(['WMX']);
  });

  it('runs PR to PO approval and partial receipt without over-receipt', async () => {
    const createdRequest = await $fetch<ApiResponse<PurchaseRequestDto>>(
      '/api/inventory/purchase-requests',
      {
        method: 'POST',
        headers: controllerCookie,
        body: {
          stationId: 'st-djj',
          requestReason: 'Inventory API procurement workflow test.',
          lines: [
            {
              partId: 'inv-part-oil',
              quantity: 4,
              requiredAt: '2026-08-01',
              note: 'API test line.'
            }
          ]
        }
      }
    );
    expect(createdRequest.ok).toBe(true);
    if (!createdRequest.ok) throw new Error(createdRequest.error.message);

    const submittedRequest = await $fetch<ApiResponse<PurchaseRequestDto>>(
      `/api/inventory/purchase-requests/${createdRequest.data.id}/submit`,
      { method: 'POST', headers: controllerCookie }
    );
    expect(submittedRequest.ok && submittedRequest.data.status).toBe('SUBMITTED');

    const createdOrder = await $fetch<ApiResponse<PurchaseOrderDto>>(
      '/api/inventory/purchase-orders',
      {
        method: 'POST',
        headers: controllerCookie,
        body: {
          purchaseRequestId: createdRequest.data.id,
          vendorId: 'vendor-maintenance',
          currencyId: 'cur-idr',
          exchangeRateToIdrMicros: 1_000_000,
          expectedAt: '2026-08-01',
          lines: [
            {
              purchaseRequestLineId: createdRequest.data.lines[0]!.id,
              quantity: 4,
              sourceUnitCostMinor: 200_000
            }
          ]
        }
      }
    );
    expect(createdOrder.ok).toBe(true);
    if (!createdOrder.ok) throw new Error(createdOrder.error.message);

    await $fetch(`/api/inventory/purchase-orders/${createdOrder.data.id}/submit`, {
      method: 'POST',
      headers: controllerCookie
    });
    const approvedOrder = await $fetch<ApiResponse<PurchaseOrderDto>>(
      `/api/inventory/purchase-orders/${createdOrder.data.id}/approve`,
      { method: 'POST', headers: directorCookie }
    );
    expect(approvedOrder.ok && approvedOrder.data.status).toBe('APPROVED');

    const directorReceipt = await $fetch<ApiResponse<GoodsReceiptDto>>('/api/inventory/receipts', {
      method: 'POST',
      headers: directorCookie,
      body: {},
      ignoreResponseError: true
    });
    expect(!directorReceipt.ok && directorReceipt.error.code).toBe('FORBIDDEN');

    const receipt = await $fetch<ApiResponse<GoodsReceiptDto>>('/api/inventory/receipts', {
      method: 'POST',
      headers: controllerCookie,
      body: {
        purchaseOrderId: createdOrder.data.id,
        warehouseId: 'inv-wh-djj-main',
        receivedAt: '2026-07-16T10:00:00.000+09:00',
        documentReference: 'DO-API-PARTIAL-01',
        lines: [
          {
            purchaseOrderLineId: createdOrder.data.lines[0]!.id,
            binId: 'inv-bin-djj-usable',
            quantity: 2,
            lotNumber: 'LOT-API-OIL-260716',
            manufacturedAt: '2026-07-01',
            expiresAt: '2029-06-30',
            certificateReference: null,
            certificateVerified: false,
            serialNumbers: []
          }
        ]
      }
    });
    expect(receipt.ok && receipt.data.totalBaseValueIdr).toBe(400_000);

    const overReceipt = await $fetch<ApiResponse<GoodsReceiptDto>>('/api/inventory/receipts', {
      method: 'POST',
      headers: controllerCookie,
      body: {
        purchaseOrderId: createdOrder.data.id,
        warehouseId: 'inv-wh-djj-main',
        receivedAt: '2026-07-16T11:00:00.000+09:00',
        documentReference: 'DO-API-OVER-01',
        lines: [
          {
            purchaseOrderLineId: createdOrder.data.lines[0]!.id,
            binId: 'inv-bin-djj-usable',
            quantity: 3,
            lotNumber: null,
            manufacturedAt: null,
            expiresAt: null,
            certificateReference: null,
            certificateVerified: false,
            serialNumbers: []
          }
        ]
      },
      ignoreResponseError: true
    });
    expect(!overReceipt.ok && overReceipt.error.code).toBe('INVENTORY_RECEIPT_OVER_PO');

    const database = new Database(resolveDbPath(testDbPath));
    const event = database
      .prepare(
        `SELECT integration_status, base_amount_idr FROM inventory_accounting_events
         WHERE source_id = ?`
      )
      .get(receipt.ok ? receipt.data.id : '') as Record<string, unknown>;
    database.close();
    expect(event).toMatchObject({
      integration_status: 'PENDING_INTEGRATION',
      base_amount_idr: 400_000
    });
  });

  it('hides valuation unless the active role can read it', async () => {
    const maintenanceCookie = { cookie: 'ama_demo_role=Maintenance%20Manager' };
    const stationDashboard = await $fetch<ApiResponse<InventoryDashboardDto>>(
      '/api/inventory/dashboard',
      { headers: { cookie: 'ama_demo_role=Station%20Admin' } }
    );
    const financeDashboard = await $fetch<ApiResponse<InventoryDashboardDto>>(
      '/api/inventory/dashboard',
      { headers: { cookie: 'ama_demo_role=Finance%20Reviewer' } }
    );
    expect(stationDashboard.ok && stationDashboard.data.fifoValuationIdr).toBeNull();
    expect(financeDashboard.ok && financeDashboard.data.fifoValuationIdr).toBeGreaterThan(0);

    const stock = await $fetch<ApiResponse<InventoryStockDto[]>>('/api/inventory/stock', {
      headers: maintenanceCookie
    });
    const movements = await $fetch<ApiResponse<InventoryMovementDto[]>>(
      '/api/inventory/movements',
      {
        headers: maintenanceCookie
      }
    );
    const orders = await $fetch<ApiResponse<PurchaseOrderDto[]>>('/api/inventory/purchase-orders', {
      headers: maintenanceCookie
    });
    expect(stock.ok && stock.data.every((row) => row.fifoValueIdr === null)).toBe(true);
    expect(
      movements.ok && movements.data.every((movement) => movement.totalBaseValueIdr === null)
    ).toBe(true);
    expect(
      orders.ok &&
        orders.data.every(
          (order) =>
            order.exchangeRateToIdrMicros === null &&
            order.lines.every(
              (line) => line.sourceUnitCostMinor === null && line.baseUnitCostIdr === null
            )
        )
    ).toBe(true);
  });

  it('enforces station scope for inventory document owners', async () => {
    const maintenanceCookie = { cookie: 'ama_demo_role=Maintenance%20Manager' };
    const stationCookie = { cookie: 'ama_demo_role=Station%20Admin' };
    const djjDocuments = await $fetch<ApiResponse<MasterDocumentDto[]>>(
      '/api/documents?ownerType=inventory_lot&ownerId=inv-lot-filter-260701',
      { headers: maintenanceCookie }
    );
    const wmxDocuments = await $fetch<ApiResponse<MasterDocumentDto[]>>(
      '/api/documents?ownerType=inventory_lot&ownerId=inv-lot-filter-260701',
      { headers: stationCookie }
    );
    expect(djjDocuments.ok && djjDocuments.data.length).toBeGreaterThan(0);
    expect(wmxDocuments.ok && wmxDocuments.data).toEqual([]);
    if (!djjDocuments.ok || !djjDocuments.data[0]) throw new Error('Seed document is missing');

    const forbiddenRead = await $fetch<ApiResponse<MasterDocumentDto>>(
      `/api/documents/${djjDocuments.data[0].id}`,
      { headers: stationCookie, ignoreResponseError: true }
    );
    expect(!forbiddenRead.ok && forbiddenRead.error.code).toBe(
      'INVENTORY_DOCUMENT_STATION_FORBIDDEN'
    );

    const forbiddenUpload = await $fetch<ApiResponse<MasterDocumentDto>>('/api/documents', {
      method: 'POST',
      headers: stationCookie,
      body: {
        ownerType: 'inventory_lot',
        ownerId: 'inv-lot-filter-260701',
        uploadId: 'upload-does-not-exist',
        documentType: 'AUTHORIZED_RELEASE_CERTIFICATE',
        title: 'Cross-station upload attempt',
        visibility: 'INTERNAL'
      },
      ignoreResponseError: true
    });
    expect(!forbiddenUpload.ok && forbiddenUpload.error.code).toBe(
      'INVENTORY_DOCUMENT_STATION_FORBIDDEN'
    );
  });
});
