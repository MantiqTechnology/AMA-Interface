import type Database from 'better-sqlite3';
import { createDemoSeedContext, type DemoSeedContext } from './context';
type Row = Record<string, string | number | null>;

function insert(sqlite: Database.Database, table: string, row: Row) {
  const keys = Object.keys(row);
  const columns = keys.map((key) => key.replace(/[A-Z]/gu, (letter) => `_${letter.toLowerCase()}`));
  sqlite
    .prepare(
      `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${keys.map((key) => `@${key}`).join(', ')})`
    )
    .run(row);
}

export function seedCorporateAssets(
  sqlite: Database.Database,
  context: DemoSeedContext = createDemoSeedContext()
) {
  const seedNow = context.now;
  const seed = sqlite.transaction(() => {
    for (const [id, code, name] of [
      ['dept-ops', 'OPS', 'Operations'],
      ['dept-it', 'IT', 'Information Technology'],
      ['dept-finance', 'FIN', 'Finance']
    ] as const)
      insert(sqlite, 'departments', {
        id,
        departmentCode: code,
        departmentName: name,
        isActive: 1,
        createdAt: seedNow,
        updatedAt: seedNow
      });

    for (const employee of [
      {
        id: 'emp-hendra',
        employeeCode: 'EMP-OPS-001',
        fullName: 'Hendra Gunawan',
        departmentId: 'dept-ops',
        baseStationId: 'st-djj',
        positionTitle: 'GSE Supervisor',
        employmentStatus: 'ACTIVE',
        demoActorId: 'USR-STATION-ADMIN'
      },
      {
        id: 'emp-anisa',
        employeeCode: 'EMP-IT-001',
        fullName: 'Anisa Putri',
        departmentId: 'dept-it',
        baseStationId: 'st-djj',
        positionTitle: 'IT Support Officer',
        employmentStatus: 'ACTIVE',
        demoActorId: null
      },
      {
        id: 'emp-rangga',
        employeeCode: 'EMP-MNT-001',
        fullName: 'Rangga Wibowo',
        departmentId: 'dept-ops',
        baseStationId: 'st-djj',
        positionTitle: 'Asset Technician',
        employmentStatus: 'ACTIVE',
        demoActorId: 'USR-MAINTENANCE-MANAGER'
      }
    ])
      insert(sqlite, 'employees', { ...employee, createdAt: seedNow, updatedAt: seedNow });

    for (const asset of [
      {
        id: 'asset-gse-gpu-01',
        assetCode: 'GSE-00001',
        name: 'Ground Power Unit GPU-01',
        category: 'GSE',
        brand: 'ITW GSE',
        model: 'GPU-90',
        serialNumber: 'AMA-GPU-0001',
        stationId: 'st-djj',
        locationType: 'STATION',
        locationDetail: 'DJJ GSE Bay A',
        departmentId: 'dept-ops',
        currentCustodianEmployeeId: 'emp-hendra',
        custodianNameSnapshot: 'Hendra Gunawan',
        acquisitionDate: '2023-04-01',
        acquisitionReference: 'PO-GSE-2023-001',
        lifecycleStatus: 'ACTIVE',
        conditionStatus: 'UNDER_MAINTENANCE',
        version: 2
      },
      {
        id: 'asset-it-laptop-01',
        assetCode: 'IT-00001',
        name: 'Dell Latitude 5440',
        category: 'IT_EQUIPMENT',
        brand: 'Dell',
        model: 'Latitude 5440',
        serialNumber: 'AMA-IT-0001',
        stationId: 'st-djj',
        locationType: 'DEPARTMENT',
        locationDetail: 'IT Department',
        departmentId: 'dept-it',
        currentCustodianEmployeeId: 'emp-anisa',
        custodianNameSnapshot: 'Anisa Putri',
        acquisitionDate: '2024-02-01',
        acquisitionReference: 'PO-IT-2024-014',
        lifecycleStatus: 'ACTIVE',
        conditionStatus: 'SERVICEABLE',
        version: 1
      },
      {
        id: 'asset-vehicle-wmx-01',
        assetCode: 'VEH-00001',
        name: 'Toyota Hilux Operational Vehicle',
        category: 'VEHICLE',
        brand: 'Toyota',
        model: 'Hilux',
        serialNumber: 'AMA-VEH-0001',
        stationId: 'st-wmx',
        locationType: 'STATION',
        locationDetail: 'WMX Vehicle Pool',
        departmentId: 'dept-ops',
        currentCustodianEmployeeId: null,
        custodianNameSnapshot: null,
        acquisitionDate: '2022-08-15',
        acquisitionReference: 'PO-GA-2022-011',
        lifecycleStatus: 'ACTIVE',
        conditionStatus: 'LIMITED',
        version: 1
      }
    ])
      insert(sqlite, 'managed_assets', { ...asset, createdAt: seedNow, updatedAt: seedNow });

    insert(sqlite, 'asset_assignments', {
      id: 'asg-laptop-primary',
      assignmentNumber: 'ASG-00001',
      assetId: 'asset-it-laptop-01',
      employeeId: 'emp-anisa',
      custodianNameSnapshot: 'Anisa Putri',
      departmentId: 'dept-it',
      stationId: 'st-djj',
      locationSnapshot: 'IT Department',
      reason: 'Primary work device assignment.',
      startedAt: '2024-02-05T08:00:00.000+09:00',
      endedAt: null,
      createdByUserId: 'USR-STATION-ADMIN',
      createdAt: seedNow
    });
    insert(sqlite, 'asset_maintenance_work_orders', {
      id: 'amw-gpu-maintenance',
      workOrderNumber: 'AMW-00001',
      assetId: 'asset-gse-gpu-01',
      maintenanceType: 'CORRECTIVE',
      priority: 'HIGH',
      status: 'OPEN',
      conditionBefore: 'SERVICEABLE',
      conditionAfter: null,
      summary: 'Intermittent GPU output requires battery and electrical inspection.',
      completionResult: null,
      scheduledAt: context.at(1, '09:00'),
      completedAt: null,
      completedByUserId: null,
      createdByUserId: 'USR-MAINTENANCE-MANAGER',
      createdAt: seedNow,
      updatedAt: seedNow
    });
    insert(sqlite, 'asset_insurance_policies', {
      id: 'policy-gpu-01',
      assetId: 'asset-gse-gpu-01',
      insurer: 'Papua Aviation Insurance',
      policyNumber: `POL-GSE-${context.anchorDate.slice(0, 4)}-001`,
      coverageMinor: 850000000,
      premiumMinor: 9500000,
      effectiveDate: context.date(-180),
      expiryDate: context.date(180),
      status: 'ACTIVE',
      createdAt: seedNow,
      updatedAt: seedNow
    });
    insert(sqlite, 'asset_audits', {
      id: 'audit-wmx-vehicle',
      auditNumber: 'AUD-00001',
      assetId: 'asset-vehicle-wmx-01',
      auditorEmployeeId: 'emp-hendra',
      auditorNameSnapshot: 'Hendra Gunawan',
      auditedAt: context.at(-1, '10:00'),
      notes: 'Minor body damage requires verification.',
      hasDiscrepancy: 1,
      reconciledAt: null,
      reconciledByUserId: null,
      reconciliationReason: null,
      createdAt: seedNow
    });
    insert(sqlite, 'asset_audit_lines', {
      id: 'audit-line-wmx-condition',
      auditId: 'audit-wmx-vehicle',
      fieldName: 'conditionStatus',
      expectedValue: 'SERVICEABLE',
      actualValue: 'LIMITED',
      discrepancyType: 'CONDITION_MISMATCH',
      notes: 'Rear body panel damaged.'
    });
    const acquisitionDate = context.date(-30);
    const periodId = `period-${acquisitionDate.slice(0, 7)}`;
    insert(sqlite, 'accounting_events', {
      id: 'accounting-event-corporate-gpu',
      eventNumber: `EVT-${context.compactDate(-30)}-CORP-001`,
      eventType: 'CORPORATE_ASSET_ACQUIRED',
      sourceType: 'MANAGED_ASSET',
      sourceId: 'asset-gse-gpu-01',
      idempotencyKey: 'corporate-asset:asset-gse-gpu-01:acquisition',
      productAccountingProfileId: null,
      policyId: null,
      policyCode: 'CORPORATE_ASSET_ACQUISITION_V1',
      policyVersion: 1,
      accountingDate: acquisitionDate,
      transactionDate: acquisitionDate,
      documentDate: acquisitionDate,
      serviceDate: null,
      amountMinor: 850000000,
      currencyId: 'cur-idr',
      currencyCode: 'IDR',
      exchangeRateToIdrMicros: 1000000,
      baseAmountIdr: 850000000,
      postingStatus: 'DRAFT',
      journalEntryId: 'journal-corporate-gpu',
      stationId: 'st-djj',
      aircraftId: null,
      flightId: null,
      workOrderReference: null,
      costCenterId: null,
      payloadJson: JSON.stringify({ managedAssetId: 'asset-gse-gpu-01' }),
      createdAt: seedNow,
      updatedAt: seedNow
    });
    insert(sqlite, 'journal_entries', {
      id: 'journal-corporate-gpu',
      journalNumber: `JRN-${context.compactDate(-30)}-CORP-001`,
      accountingEventId: 'accounting-event-corporate-gpu',
      periodId,
      status: 'DRAFT',
      sourceType: 'MANAGED_ASSET',
      sourceId: 'asset-gse-gpu-01',
      transactionDate: acquisitionDate,
      documentDate: acquisitionDate,
      postingDate: acquisitionDate,
      serviceDate: null,
      currencyCode: 'IDR',
      exchangeRateToIdrMicros: 1000000,
      policyCode: 'CORPORATE_ASSET_ACQUISITION_V1',
      policyVersion: 1,
      reversalOfJournalEntryId: null,
      createdByUserId: 'USR-FINANCE-REVIEWER',
      approvedByUserId: 'USR-DIRECTOR',
      postedByUserId: 'USR-FINANCE-REVIEWER',
      postedAt: seedNow,
      memo: 'Deterministic corporate GPU acquisition.',
      createdAt: seedNow,
      updatedAt: seedNow
    });
    const corporateJournalHasLines = sqlite
      .prepare(
        "SELECT 1 FROM journal_lines WHERE journal_entry_id = 'journal-corporate-gpu' LIMIT 1"
      )
      .get();
    if (!corporateJournalHasLines) {
      for (const [id, lineNumber, accountId, debitMinor, creditMinor] of [
        ['journal-line-corporate-gpu-asset', 1, 'coa-1300', 850000000, 0],
        ['journal-line-corporate-gpu-payable', 2, 'coa-2000', 0, 850000000]
      ] as const)
        insert(sqlite, 'journal_lines', {
          id,
          journalEntryId: 'journal-corporate-gpu',
          lineNumber,
          accountId,
          debitMinor,
          creditMinor,
          baseDebitIdr: debitMinor,
          baseCreditIdr: creditMinor,
          stationId: 'st-djj',
          aircraftId: null,
          flightId: null,
          workOrderReference: null,
          costCenterId: null,
          description: 'Ground Power Unit GPU-01 acquisition.'
        });
    }
    insert(sqlite, 'asset_register', {
      id: 'financial-asset-gpu-01',
      assetNumber: 'FA-GSE-00001',
      sourceJournalEntryId: 'journal-corporate-gpu',
      sourceType: 'MANAGED_ASSET',
      sourceId: 'asset-gse-gpu-01',
      assetAccountId: 'coa-1300',
      assetName: 'Ground Power Unit GPU-01',
      aircraftId: null,
      inventoryPartId: null,
      componentSerialId: null,
      serialNumber: 'GPU-DJJ-001',
      managedAssetId: 'asset-gse-gpu-01',
      acquisitionDate,
      readyForUseDate: acquisitionDate,
      costMinor: 850000000,
      currencyCode: 'IDR',
      usefulLifeMonths: 60,
      status: 'ACTIVE',
      reversalJournalEntryId: null,
      createdAt: seedNow,
      updatedAt: seedNow
    });
    sqlite
      .prepare(
        "UPDATE journal_entries SET status = 'POSTED' WHERE id = 'journal-corporate-gpu' AND status != 'POSTED'"
      )
      .run();
    sqlite
      .prepare(
        "UPDATE accounting_events SET posting_status = 'POSTED' WHERE id = 'accounting-event-corporate-gpu' AND posting_status != 'POSTED'"
      )
      .run();
    for (const [type, value] of [
      ['GSE', 1],
      ['IT_EQUIPMENT', 1],
      ['VEHICLE', 1],
      ['ASSIGNMENT', 1],
      ['WORK_ORDER', 1],
      ['AUDIT', 1],
      ['MOVEMENT', 0]
    ] as const)
      insert(sqlite, 'asset_number_sequences', { sequenceType: type, currentValue: value });
    for (const [id, assetId, action, reason] of [
      [
        'asset-history-gpu-created',
        'asset-gse-gpu-01',
        'ASSET_CREATED',
        'Deterministic Corporate Assets scenario seed.'
      ],
      [
        'asset-history-laptop-created',
        'asset-it-laptop-01',
        'ASSET_CREATED',
        'Deterministic Corporate Assets scenario seed.'
      ],
      [
        'asset-history-vehicle-audit',
        'asset-vehicle-wmx-01',
        'ASSET_AUDIT_DISCREPANCY',
        'Condition discrepancy found during physical audit.'
      ]
    ] as const)
      insert(sqlite, 'asset_action_history', {
        id,
        assetId,
        actionType: action,
        actorUserId: 'USR-DIRECTOR',
        reason,
        beforeJson: '{}',
        afterJson: '{}',
        requestContextJson: '{"source":"scenario-seed"}',
        createdAt: seedNow
      });
  });
  seed.immediate();
}
