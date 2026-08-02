import { describe, expect, it } from 'vitest';
import { createSeededTestServices } from '../helpers/demo-db';

const flightId = 'fop-checkin-open';
const stationId = 'st-djj';
const stationActor = 'USR-STATION-ADMIN';
const financeActor = 'USR-FINANCE-REVIEWER';

describe('Station Service and Station Cost Hybrid Lite', () => {
  it('requires an explicit supplier for a Station Service', async () => {
    const { services, sqlite } = await createSeededTestServices();

    expect(() =>
      services.flightOperations.createStationService(
        {
          flightId,
          stationId,
          serviceSupplierId: '',
          serviceTypeId: 'station-service-type-handling',
          referenceRate: 2_750_000,
          creationReason: 'Supplier validation test.'
        },
        stationActor
      )
    ).toThrowError(expect.objectContaining({ code: 'STATION_SERVICE_SUPPLIER_REQUIRED' }));

    sqlite.close();
  });

  it('creates one service and one reference-estimate cost draft across retries', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const input = {
      flightId,
      stationId,
      serviceSupplierId: 'hp-angkasa-djj',
      serviceTypeId: 'station-service-type-handling',
      referenceRate: 2_750_000,
      creationReason: 'Required handling for the operational demo.'
    };

    const service = services.flightOperations.createStationService(input, stationActor);
    const duplicate = services.flightOperations.createStationService(input, stationActor);
    expect(duplicate.id).toBe(service.id);
    expect(service.status).toBe('PLANNED');

    services.flightOperations.confirmStationService(service.id, stationActor, service.version);
    services.flightOperations.confirmStationService(service.id, stationActor, service.version);

    const costs = services.flightOperations
      .listStationCosts({ flightId })
      .filter((cost) => cost.sourceServiceId === service.id);
    expect(costs).toHaveLength(1);
    expect(costs[0]).toMatchObject({
      status: 'DRAFT',
      estimatedAmount: 2_750_000,
      actualAmount: null,
      supplierName: 'Angkasa Pura Handling Mock - DJJ'
    });
    expect(
      (
        sqlite
          .prepare(
            `SELECT COUNT(*) AS count FROM flight_station_service_requests
             WHERE flight_id = ? AND station_id = ? AND service_type_id = ?`
          )
          .get(flightId, stationId, input.serviceTypeId) as { count: number }
      ).count
    ).toBe(1);
    expect(
      (
        sqlite
          .prepare(
            `SELECT COUNT(*) AS count FROM flight_operational_audit
             WHERE flight_id = ? AND action = 'COST_DRAFT_CREATED'`
          )
          .get(flightId) as { count: number }
      ).count
    ).toBe(1);

    sqlite.close();
  });

  it('creates exactly one parking cost draft from a confirmed parking service', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const service = services.flightOperations.createStationService(
      {
        flightId,
        stationId,
        serviceSupplierId: 'hp-angkasa-djj',
        serviceTypeId: 'station-service-type-parking',
        referenceRate: 1_250_000,
        creationReason: 'Required parking cost test.'
      },
      stationActor
    );

    services.flightOperations.confirmStationService(service.id, stationActor, service.version);
    services.flightOperations.confirmStationService(service.id, stationActor, service.version);

    expect(
      services.flightOperations
        .listStationCosts({ flightId })
        .filter((cost) => cost.sourceServiceId === service.id)
    ).toEqual([
      expect.objectContaining({
        costCategoryName: 'Parking',
        estimatedAmount: 1_250_000,
        actualAmount: null,
        status: 'DRAFT'
      })
    ]);
    expect(
      sqlite
        .prepare('SELECT COUNT(*) AS count FROM flight_station_costs WHERE source_service_id = ?')
        .get(service.id)
    ).toEqual({ count: 1 });

    sqlite.close();
  });

  it('requires completion evidence before an authorized station verification', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const service = services.flightOperations.createStationService(
      {
        flightId,
        stationId,
        serviceSupplierId: 'hp-angkasa-djj',
        serviceTypeId: 'station-service-type-handling',
        referenceRate: 2_750_000,
        creationReason: 'Required handling completion test.'
      },
      stationActor
    );

    expect(() =>
      services.flightOperations.verifyStationService(service.id, stationActor, service.version)
    ).toThrowError(expect.objectContaining({ code: 'INVALID_TRANSITION' }));

    const confirmed = services.flightOperations.confirmStationService(
      service.id,
      stationActor,
      service.version
    );
    const confirmedService = confirmed.stationServices.find((item) => item.id === service.id)!;
    const completed = services.flightOperations.completeStationService(
      service.id,
      {
        expectedVersion: confirmedService.version,
        completionRecord: 'Origin handling completed without operational exception.',
        evidenceReference: 'CHECKLIST-DJJ-001'
      },
      stationActor
    );
    const completedService = completed.stationServices.find((item) => item.id === service.id)!;
    const verified = services.flightOperations.verifyStationService(
      service.id,
      stationActor,
      completedService.version
    );
    expect(verified.stationServices.find((item) => item.id === service.id)).toMatchObject({
      status: 'VERIFIED',
      completionEvidenceReference: 'CHECKLIST-DJJ-001'
    });

    sqlite.close();
  });

  it('separates actual cost, blocks self-approval, and creates one finance handoff', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const service = services.flightOperations.createStationService(
      {
        flightId,
        stationId,
        serviceSupplierId: 'hp-angkasa-djj',
        serviceTypeId: 'station-service-type-handling',
        referenceRate: 2_750_000,
        creationReason: 'Required handling cost test.'
      },
      stationActor
    );
    const confirmed = services.flightOperations.confirmStationService(
      service.id,
      stationActor,
      service.version
    );
    const draft = confirmed.stationCosts.find((cost) => cost.sourceServiceId === service.id)!;

    services.flightOperations.updateStationCost(
      draft.id,
      {
        expectedVersion: draft.version,
        actualAmount: 2_925_000,
        currencyId: 'cur-idr',
        vendorReference: 'INV-DJJ-2026-001',
        evidenceReference: 'DOC-RECEIPT-DJJ-001',
        description: 'Actual origin handling charge.'
      },
      stationActor
    );
    const updatedCost = services.flightOperations
      .detail(flightId)
      .stationCosts.find((cost) => cost.id === draft.id)!;
    services.flightOperations.submitStationCost(draft.id, stationActor, updatedCost.version);
    const submittedCost = services.flightOperations
      .detail(flightId)
      .stationCosts.find((cost) => cost.id === draft.id)!;

    expect(() =>
      services.flightOperations.approveStationCost(draft.id, stationActor, submittedCost.version)
    ).toThrowError(expect.objectContaining({ code: 'STATION_COST_SELF_APPROVAL_FORBIDDEN' }));

    services.flightOperations.approveStationCost(draft.id, financeActor, submittedCost.version);
    services.flightOperations.approveStationCost(draft.id, financeActor, submittedCost.version);
    expect(
      services.flightOperations.detail(flightId).stationCosts.find((cost) => cost.id === draft.id)
    ).toMatchObject({
      status: 'APPROVED',
      estimatedAmount: 2_750_000,
      actualAmount: 2_925_000,
      approvedByUserId: financeActor
    });
    expect(
      (
        sqlite
          .prepare(
            `SELECT COUNT(*) AS count FROM flight_finance_handoffs
             WHERE source_type = 'station_cost' AND source_id = ?`
          )
          .get(draft.id) as { count: number }
      ).count
    ).toBe(1);

    sqlite.close();
  });

  it('creates one policy-driven draft journal from an approved actual station cost', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const service = services.flightOperations.createStationService(
      {
        flightId,
        stationId,
        serviceSupplierId: 'hp-angkasa-djj',
        serviceTypeId: 'station-service-type-handling',
        referenceRate: 8_000_000,
        creationReason: 'Golden-path handling accounting test.'
      },
      stationActor
    );
    const confirmed = services.flightOperations.confirmStationService(
      service.id,
      stationActor,
      service.version
    );
    const draft = confirmed.stationCosts.find((cost) => cost.sourceServiceId === service.id)!;

    services.flightOperations.updateStationCost(
      draft.id,
      {
        expectedVersion: draft.version,
        actualAmount: 8_750_000,
        currencyId: 'cur-idr',
        vendorReference: 'INV-WMX-HANDLING-001',
        evidenceReference: 'DOC-WMX-HANDLING-001',
        description: 'Actual handling charge for the finance golden path.'
      },
      stationActor
    );
    const updated = services.flightOperations
      .detail(flightId)
      .stationCosts.find((cost) => cost.id === draft.id)!;
    services.flightOperations.submitStationCost(draft.id, stationActor, updated.version);
    const submitted = services.flightOperations
      .detail(flightId)
      .stationCosts.find((cost) => cost.id === draft.id)!;

    services.flightOperations.approveStationCost(draft.id, financeActor, submitted.version);
    services.flightOperations.approveStationCost(draft.id, financeActor, submitted.version);

    const chain = sqlite
      .prepare(
        `SELECT cost.estimated_amount, cost.actual_amount, cost.approved_amount,
                handoff.id AS handoff_id, event.id AS event_id, event.amount_minor,
                event.currency_code, event.policy_code, journal.id AS journal_id,
                journal.status AS journal_status, journal.created_by_user_id
         FROM flight_station_costs cost
         JOIN flight_finance_handoffs handoff
           ON handoff.source_type = 'station_cost' AND handoff.source_id = cost.id
         JOIN accounting_events event
           ON event.source_type = 'STATION_COST' AND event.source_id = cost.id
         JOIN journal_entries journal ON journal.accounting_event_id = event.id
         WHERE cost.id = ?`
      )
      .get(draft.id) as {
      estimated_amount: number;
      actual_amount: number;
      approved_amount: number;
      handoff_id: string;
      event_id: string;
      amount_minor: number;
      currency_code: string;
      policy_code: string;
      journal_id: string;
      journal_status: string;
      created_by_user_id: string;
    };

    expect(chain).toMatchObject({
      estimated_amount: 8_000_000,
      actual_amount: 8_750_000,
      approved_amount: 8_750_000,
      amount_minor: 8_750_000,
      currency_code: 'IDR',
      policy_code: 'STATION_HANDLING_COST_APPROVED_V1',
      journal_status: 'DRAFT',
      created_by_user_id: 'SYSTEM-STATION-COST-ACCOUNTING'
    });
    expect(
      sqlite
        .prepare(
          `SELECT COUNT(*) AS count FROM accounting_events
           WHERE source_type = 'STATION_COST' AND source_id = ?`
        )
        .get(draft.id)
    ).toEqual({ count: 1 });
    expect(
      sqlite
        .prepare(
          `SELECT COUNT(*) AS count FROM journal_entries journal
           JOIN accounting_events event ON event.id = journal.accounting_event_id
           WHERE event.source_type = 'STATION_COST' AND event.source_id = ?`
        )
        .get(draft.id)
    ).toEqual({ count: 1 });
    expect(
      services.accounting
        .generalLedger({ limit: 250, offset: 0 })
        .filter((line) => line.sourceType === 'STATION_COST' && line.sourceId === draft.id)
    ).toEqual([]);
    expect(services.accounting.getJournalDetail(chain.journal_id)).toMatchObject({
      event: {
        sourceType: 'STATION_COST',
        sourceId: draft.id,
        sourceRoute: expect.stringContaining(`sourceRecordId=${draft.id}`)
      },
      totals: { debitMinor: 8_750_000, creditMinor: 8_750_000, balanced: true },
      evidence: expect.arrayContaining([
        expect.objectContaining({
          type: 'COST_EVIDENCE',
          reference: 'DOC-WMX-HANDLING-001',
          status: 'AVAILABLE'
        }),
        expect.objectContaining({ type: 'FINANCE_APPROVAL', status: 'VERIFIED' })
      ])
    });
    expect(
      services.flightOperations
        .validateClosureRequirements(flightId, 'SCHEDULED_PASSENGER', false)
        .find((requirement) => requirement.code === 'STATION_COST_HANDOFF_REQUIRED')
    ).toMatchObject({ status: 'NOT_REQUIRED', satisfied: true });
    expect(services.flightOperations.detail(flightId).closureReadiness.missing).not.toContain(
      'resolved station cost and finance handoff'
    );

    services.accounting.submitJournal(chain.journal_id, financeActor);
    services.accounting.approveJournal(chain.journal_id, 'USR-DIRECTOR');
    services.accounting.postJournal(chain.journal_id, financeActor);

    const postedCost = services.flightOperations
      .detail(flightId)
      .stationCosts.find((cost) => cost.id === draft.id)!;
    expect(postedCost).toMatchObject({
      approvedAmount: 8_750_000,
      approvedCurrencyCode: 'IDR',
      financialBasis: 'POSTED_LEDGER',
      reconciliationStatus: 'RECONCILED',
      postedLedgerAmount: 8_750_000,
      journalStatus: 'POSTED'
    });
    expect(
      services.accounting
        .generalLedger({ limit: 250, offset: 0 })
        .filter((line) => line.sourceType === 'STATION_COST' && line.sourceId === draft.id)
    ).toHaveLength(2);
    expect(
      sqlite
        .prepare(
          `SELECT actor_user_id AS actorUserId, action, request_id AS sourceId
           FROM flight_operational_audit
           WHERE flight_id = ? AND action = 'JOURNAL_POSTED' AND request_id = ?`
        )
        .get(flightId, draft.id)
    ).toEqual({
      actorUserId: financeActor,
      action: 'JOURNAL_POSTED',
      sourceId: draft.id
    });
    expect(
      services.financeReporting
        .trialBalance({ period: '2026-07' })
        .accounts.find((account) => account.code === '5200')
    ).toMatchObject({ debitMinor: 8_750_000, balanceMinor: 8_750_000 });

    sqlite
      .prepare(
        `DELETE FROM flight_finance_handoffs
         WHERE source_type = 'station_cost' AND source_id = ?`
      )
      .run(draft.id);
    expect(
      services.flightOperations
        .validateClosureRequirements(flightId, 'SCHEDULED_PASSENGER', false)
        .find((requirement) => requirement.code === 'STATION_COST_HANDOFF_REQUIRED')
    ).toMatchObject({ status: 'BLOCKED', satisfied: false });
    expect(services.flightOperations.detail(flightId).closureReadiness.missing).toContain(
      'resolved station cost and finance handoff'
    );

    sqlite.close();
  });

  it('requires a positive actual amount and cost evidence before submission', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const service = services.flightOperations.createStationService(
      {
        flightId,
        stationId,
        serviceSupplierId: 'hp-angkasa-djj',
        serviceTypeId: 'station-service-type-handling',
        referenceRate: 8_000_000,
        creationReason: 'Submission validation test.'
      },
      stationActor
    );
    const confirmed = services.flightOperations.confirmStationService(
      service.id,
      stationActor,
      service.version
    );
    const draft = confirmed.stationCosts.find((cost) => cost.sourceServiceId === service.id)!;

    expect(() =>
      services.flightOperations.submitStationCost(draft.id, stationActor, draft.version)
    ).toThrowError(expect.objectContaining({ code: 'STATION_COST_ACTUAL_REQUIRED' }));

    expect(() =>
      services.flightOperations.updateStationCost(
        draft.id,
        {
          expectedVersion: draft.version,
          actualAmount: 0,
          currencyId: 'cur-idr',
          vendorReference: 'INV-WMX-ZERO-001',
          evidenceReference: 'DOC-WMX-ZERO-001',
          description: 'Zero actual amount must not be submitted.'
        },
        stationActor
      )
    ).toThrowError(expect.objectContaining({ code: 'STATION_COST_ACTUAL_REQUIRED' }));

    services.flightOperations.updateStationCost(
      draft.id,
      {
        expectedVersion: draft.version,
        actualAmount: 8_750_000,
        currencyId: 'cur-idr',
        vendorReference: 'INV-WMX-NO-EVIDENCE-001',
        evidenceReference: '',
        description: 'Evidence-free actual amount must not be submitted.'
      },
      stationActor
    );
    const noEvidence = services.flightOperations
      .detail(flightId)
      .stationCosts.find((cost) => cost.id === draft.id)!;
    expect(() =>
      services.flightOperations.submitStationCost(draft.id, stationActor, noEvidence.version)
    ).toThrowError(expect.objectContaining({ code: 'STATION_COST_EVIDENCE_REQUIRED' }));

    sqlite.close();
  });

  it('does not require a cost that was never created and accepts an existing voided cost', async () => {
    const { services, sqlite } = await createSeededTestServices();
    sqlite.prepare('DELETE FROM flight_station_costs WHERE flight_id = ?').run(flightId);
    expect(services.flightOperations.detail(flightId).closureReadiness.missing).not.toContain(
      'resolved station cost and finance handoff'
    );

    const cost = services.flightOperations.createStationCost(
      {
        flightId,
        stationId,
        vendorId: 'vendor-transport-wmx',
        costCategoryId: 'cost-handling',
        amount: 100_000,
        currencyId: 'cur-idr',
        description: 'Recorded exception cost.',
        vendorReference: 'REF-DJJ-VOID-001',
        evidenceReference: 'EVIDENCE-DJJ-VOID-001'
      },
      stationActor
    );
    expect(services.flightOperations.detail(flightId).closureReadiness.missing).toContain(
      'resolved station cost and finance handoff'
    );
    services.flightOperations.voidStationCost(
      cost.id,
      { expectedVersion: cost.version, reason: 'Duplicate supplier invoice record.' },
      financeActor
    );
    expect(services.flightOperations.detail(flightId).closureReadiness.missing).not.toContain(
      'resolved station cost and finance handoff'
    );

    sqlite.close();
  });
});
