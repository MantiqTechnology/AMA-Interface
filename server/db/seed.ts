import type { AppDatabase } from './client';
import { seedOperationsMasterData } from './seeds/master-data/operations';
import { seedFinanceMasterData } from './seeds/master-data/finance';
import { seedCommercialMasterData } from './seeds/master-data/commercial';
import { seedCargoMasterData } from './seeds/master-data/cargo';
import {
  alerts,
  approvals,
  flightOrders,
  fuelRequests,
  fuelUplifts,
  invoices,
  maintenanceWorkOrders,
  manifests,
  payments,
  serializedParts,
  stationExpenses
} from './schema';

const now = '2026-07-04T09:00:00.000+07:00';

export async function seedDemoData(db: AppDatabase) {
  await seedOperationsMasterData(db);
  await seedFinanceMasterData(db);
  await seedCommercialMasterData(db);
  await seedCargoMasterData(db);

  await db
    .insert(flightOrders)
    .values([
      {
        id: 'fo-ama-260704-001',
        flightNumber: 'AMA401',
        orderNumber: 'AMA-FO-2026-0704-001',
        customerId: 'cust-mission-air',
        routeId: 'route-djj-wmx',
        aircraftId: 'ac-pk-amb',
        status: 'scheduled',
        scheduledDeparture: '2026-07-04T10:15:00.000+07:00',
        scheduledArrival: '2026-07-04T11:10:00.000+07:00',
        purpose: 'Community supply and passenger charter',
        quotedAmount: 78500000,
        currency: 'IDR'
      },
      {
        id: 'fo-ama-260704-002',
        flightNumber: 'AMA217',
        orderNumber: 'AMA-FO-2026-0704-002',
        customerId: 'cust-government',
        routeId: 'route-wmx-oks',
        aircraftId: 'ac-pk-ama',
        status: 'ready',
        scheduledDeparture: '2026-07-04T12:40:00.000+07:00',
        scheduledArrival: '2026-07-04T13:38:00.000+07:00',
        purpose: 'Medevac return leg with clinical escort',
        quotedAmount: 62000000,
        currency: 'IDR'
      },
      {
        id: 'fo-ama-260705-003',
        flightNumber: 'AMA688',
        orderNumber: 'AMA-FO-2026-0705-003',
        customerId: 'cust-cargo-partner',
        routeId: 'route-tim-dex',
        aircraftId: 'ac-pk-amb',
        status: 'draft',
        scheduledDeparture: '2026-07-05T08:30:00.000+07:00',
        scheduledArrival: '2026-07-05T10:45:00.000+07:00',
        purpose: 'High-priority cargo movement',
        quotedAmount: 112000000,
        currency: 'IDR'
      },
      {
        id: 'fo-ama-260703-004',
        flightNumber: 'AMA909',
        orderNumber: 'AMA-FO-2026-0703-004',
        customerId: 'cust-government',
        routeId: 'route-djj-nbx',
        aircraftId: 'ac-pk-ama',
        status: 'completed',
        scheduledDeparture: '2026-07-03T07:20:00.000+07:00',
        scheduledArrival: '2026-07-03T10:50:00.000+07:00',
        purpose: 'Relief coordination flight',
        quotedAmount: 148000000,
        currency: 'IDR'
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(manifests)
    .values([
      {
        id: 'mn-001-a',
        flightOrderId: 'fo-ama-260704-001',
        passengerName: 'Maya Rumbiak',
        documentNumber: 'KTP-927101-001',
        seatNumber: '1A',
        weightKg: 62,
        remarks: 'Team lead'
      },
      {
        id: 'mn-001-b',
        flightOrderId: 'fo-ama-260704-001',
        passengerName: 'Jonas Kogoya',
        documentNumber: 'KTP-950201-332',
        seatNumber: '1B',
        weightKg: 74,
        remarks: null
      },
      {
        id: 'mn-002-a',
        flightOrderId: 'fo-ama-260704-002',
        passengerName: 'Patient MED-2407',
        documentNumber: 'MED-CASE-2407',
        seatNumber: 'MED',
        weightKg: 58,
        remarks: 'Stretcher position'
      },
      {
        id: 'mn-002-b',
        flightOrderId: 'fo-ama-260704-002',
        passengerName: 'Nurse Adelina Waromi',
        documentNumber: 'STR-77822',
        seatNumber: '2A',
        weightKg: 55,
        remarks: 'Clinical escort'
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(fuelRequests)
    .values([
      {
        id: 'fr-001',
        flightOrderId: 'fo-ama-260704-001',
        stationId: 'st-djj',
        aircraftId: 'ac-pk-amb',
        requestedLiters: 780,
        status: 'approved',
        requestedBy: 'OCC Desk',
        requiredAt: '2026-07-04T09:45:00.000+07:00',
        notes: 'Top-off before mountain sector'
      },
      {
        id: 'fr-002',
        flightOrderId: 'fo-ama-260704-002',
        stationId: 'st-wmx',
        aircraftId: 'ac-pk-ama',
        requestedLiters: 420,
        status: 'requested',
        requestedBy: 'Wamena Station Admin',
        requiredAt: '2026-07-04T12:00:00.000+07:00',
        notes: 'Supplier confirmation pending'
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(fuelUplifts)
    .values([
      {
        id: 'fu-001',
        fuelRequestId: 'fr-001',
        supplier: 'PT Avtur Papua Sentani',
        liters: 760,
        unitPrice: 18350,
        total: 13946000,
        currency: 'IDR',
        upliftedAt: '2026-07-04T09:30:00.000+07:00',
        receiptPath: '/uploads/mock-receipts/sentani-fuel-fr-001.txt'
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(stationExpenses)
    .values([
      {
        id: 'se-001',
        stationId: 'st-wmx',
        flightOrderId: 'fo-ama-260704-002',
        category: 'handling',
        description: 'Ground handling and stretcher positioning support',
        amount: 2750000,
        currency: 'IDR',
        status: 'submitted',
        receiptPath: '/uploads/mock-receipts/wamena-handling-se-001.txt',
        incurredAt: '2026-07-04T11:15:00.000+07:00',
        submittedBy: 'Wamena Station Admin'
      },
      {
        id: 'se-002',
        stationId: 'st-djj',
        flightOrderId: 'fo-ama-260704-001',
        category: 'catering',
        description: 'Crew meal packs for delayed departure window',
        amount: 640000,
        currency: 'IDR',
        status: 'approved',
        receiptPath: null,
        incurredAt: '2026-07-04T08:25:00.000+07:00',
        submittedBy: 'Sentani Station Admin'
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(maintenanceWorkOrders)
    .values([
      {
        id: 'mwo-001',
        aircraftId: 'ac-pk-amc',
        title: 'Prop governor vibration inspection',
        description:
          'Pilot reported vibration during taxi run. Inspect governor and mounting hardware.',
        priority: 'high',
        status: 'in_progress',
        openedAt: '2026-07-03T15:40:00.000+07:00',
        closedAt: null,
        dueAt: '2026-07-05T18:00:00.000+07:00'
      },
      {
        id: 'mwo-002',
        aircraftId: 'ac-pk-amb',
        title: '50-hour cabin and tire inspection',
        description: 'Routine inspection before next cargo rotation.',
        priority: 'normal',
        status: 'open',
        openedAt: '2026-07-04T07:00:00.000+07:00',
        closedAt: null,
        dueAt: '2026-07-06T17:00:00.000+07:00'
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(serializedParts)
    .values([
      {
        id: 'sp-001',
        aircraftId: 'ac-pk-amc',
        partNumber: 'PT6A-FCU-014',
        serialNumber: 'FCU-P750-8821',
        description: 'Fuel control unit',
        status: 'quarantined',
        installedAt: null,
        workOrderId: 'mwo-001'
      },
      {
        id: 'sp-002',
        aircraftId: 'ac-pk-amb',
        partNumber: 'C208-TIRE-6006',
        serialNumber: 'TIRE-C208-4410',
        description: 'Main tire assembly',
        status: 'available',
        installedAt: null,
        workOrderId: 'mwo-002'
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(invoices)
    .values([
      {
        id: 'inv-001',
        customerId: 'cust-mission-air',
        flightOrderId: 'fo-ama-260704-001',
        invoiceNumber: 'AMA-INV-2026-0704-001',
        status: 'issued',
        subtotal: 78500000,
        tax: 8635000,
        total: 87135000,
        currency: 'IDR',
        issuedAt: '2026-07-04T08:00:00.000+07:00',
        dueAt: '2026-07-18T23:59:59.000+07:00'
      },
      {
        id: 'inv-002',
        customerId: 'cust-government',
        flightOrderId: 'fo-ama-260703-004',
        invoiceNumber: 'AMA-INV-2026-0703-004',
        status: 'partially_paid',
        subtotal: 148000000,
        tax: 16280000,
        total: 164280000,
        currency: 'IDR',
        issuedAt: '2026-07-03T13:30:00.000+07:00',
        dueAt: '2026-07-17T23:59:59.000+07:00'
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(payments)
    .values([
      {
        id: 'pay-001',
        invoiceId: 'inv-002',
        amount: 64000000,
        currency: 'IDR',
        paidAt: '2026-07-04T08:45:00.000+07:00',
        method: 'bank_transfer',
        reference: 'BPD-TRF-0704-8841'
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(approvals)
    .values([
      {
        id: 'ap-001',
        domainEntity: 'fuel_request',
        entityId: 'fr-002',
        requestedBy: 'Wamena Station Admin',
        roleRequired: 'Director',
        status: 'pending',
        decidedBy: null,
        decidedAt: null,
        reason: null,
        createdAt: '2026-07-04T08:50:00.000+07:00'
      },
      {
        id: 'ap-002',
        domainEntity: 'station_expense',
        entityId: 'se-001',
        requestedBy: 'Wamena Station Admin',
        roleRequired: 'Director',
        status: 'pending',
        decidedBy: null,
        decidedAt: null,
        reason: null,
        createdAt: '2026-07-04T08:55:00.000+07:00'
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(alerts)
    .values([
      {
        id: 'al-001',
        severity: 'warning',
        title: 'Fuel approval pending',
        message: 'Wamena uplift request FR-002 needs director approval before noon.',
        entityType: 'fuel_request',
        entityId: 'fr-002',
        isRead: false,
        createdAt: now
      },
      {
        id: 'al-002',
        severity: 'critical',
        title: 'PAC aircraft in maintenance',
        message: 'PK-RMB remains unavailable until prop governor inspection is cleared.',
        entityType: 'maintenance_work_order',
        entityId: 'mwo-001',
        isRead: false,
        createdAt: '2026-07-04T08:20:00.000+07:00'
      },
      {
        id: 'al-003',
        severity: 'info',
        title: 'Invoice issued',
        message: 'AMA-INV-2026-0704-001 sent to Yayasan Lentera Papua.',
        entityType: 'invoice',
        entityId: 'inv-001',
        isRead: false,
        createdAt: '2026-07-04T08:05:00.000+07:00'
      }
    ])
    .onConflictDoNothing();
}
