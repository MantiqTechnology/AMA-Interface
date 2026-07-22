import type { AppDatabase } from '../../client';
import { createDemoSeedContext, type DemoSeedContext } from '../context';
import {
  currencies,
  paymentTerms,
  chartOfAccounts,
  costCategories,
  vendors,
  fuelSuppliers,
  stationServiceSuppliers,
  taxCodes,
  accountingPeriods,
  productAccountingProfiles,
  accountingPolicies
} from '../../schema/finance';

export async function seedFinanceMasterData(
  db: AppDatabase,
  context: DemoSeedContext = createDemoSeedContext()
) {
  const referenceNow = context.now;
  await db
    .insert(currencies)
    .values([
      {
        id: 'cur-idr',
        currencyCode: 'IDR',
        currencyName: 'Indonesian Rupiah',
        symbol: 'Rp',
        decimalPlaces: 0,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'cur-usd',
        currencyCode: 'USD',
        currencyName: 'US Dollar',
        symbol: '$',
        decimalPlaces: 2,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(paymentTerms)
    .values([
      {
        id: 'term-cod',
        termCode: 'COD',
        termName: 'Cash on Delivery',
        dueDays: 0,
        description: 'Payment due immediately for cash transactions.',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'term-net-7',
        termCode: 'NET_7',
        termName: 'Net 7',
        dueDays: 7,
        description: 'Payment due seven days after invoice date.',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'term-net-14',
        termCode: 'NET_14',
        termName: 'Net 14',
        dueDays: 14,
        description: 'Payment due fourteen days after invoice date.',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'term-net-30',
        termCode: 'NET_30',
        termName: 'Net 30',
        dueDays: 30,
        description: 'Payment due thirty days after invoice date.',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(chartOfAccounts)
    .values([
      {
        id: 'coa-1000',
        accountCode: '1000',
        accountName: 'Cash',
        accountType: 'ASSET',
        normalBalance: 'DEBIT',
        parentAccountId: null,
        isPostable: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'coa-1100',
        accountCode: '1100',
        accountName: 'Accounts Receivable',
        accountType: 'ASSET',
        normalBalance: 'DEBIT',
        parentAccountId: null,
        isPostable: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'coa-1200',
        accountCode: '1200',
        accountName: 'Inventory - Aircraft Parts',
        accountType: 'ASSET',
        normalBalance: 'DEBIT',
        parentAccountId: null,
        isPostable: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'coa-1300',
        accountCode: '1300',
        accountName: 'Aircraft Component Asset',
        accountType: 'ASSET',
        normalBalance: 'DEBIT',
        parentAccountId: null,
        isPostable: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'coa-2000',
        accountCode: '2000',
        accountName: 'Accounts Payable',
        accountType: 'LIABILITY',
        normalBalance: 'CREDIT',
        parentAccountId: null,
        isPostable: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'coa-2100',
        accountCode: '2100',
        accountName: 'Tax Payable',
        accountType: 'LIABILITY',
        normalBalance: 'CREDIT',
        parentAccountId: null,
        isPostable: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'coa-2200',
        accountCode: '2200',
        accountName: 'Unearned Passenger and Cargo Revenue',
        accountType: 'LIABILITY',
        normalBalance: 'CREDIT',
        parentAccountId: null,
        isPostable: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'coa-2300',
        accountCode: '2300',
        accountName: 'Refund Payable',
        accountType: 'LIABILITY',
        normalBalance: 'CREDIT',
        parentAccountId: null,
        isPostable: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'coa-2400',
        accountCode: '2400',
        accountName: 'Inventory Receipt Clearing',
        accountType: 'LIABILITY',
        normalBalance: 'CREDIT',
        parentAccountId: null,
        isPostable: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'coa-4100',
        accountCode: '4100',
        accountName: 'Charter Revenue',
        accountType: 'REVENUE',
        normalBalance: 'CREDIT',
        parentAccountId: null,
        isPostable: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'coa-4200',
        accountCode: '4200',
        accountName: 'Passenger Revenue',
        accountType: 'REVENUE',
        normalBalance: 'CREDIT',
        parentAccountId: null,
        isPostable: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'coa-4300',
        accountCode: '4300',
        accountName: 'Cargo Revenue',
        accountType: 'REVENUE',
        normalBalance: 'CREDIT',
        parentAccountId: null,
        isPostable: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'coa-5100',
        accountCode: '5100',
        accountName: 'Fuel Expense',
        accountType: 'EXPENSE',
        normalBalance: 'DEBIT',
        parentAccountId: null,
        isPostable: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'coa-5200',
        accountCode: '5200',
        accountName: 'Handling Expense',
        accountType: 'EXPENSE',
        normalBalance: 'DEBIT',
        parentAccountId: null,
        isPostable: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'coa-5300',
        accountCode: '5300',
        accountName: 'Parking Expense',
        accountType: 'EXPENSE',
        normalBalance: 'DEBIT',
        parentAccountId: null,
        isPostable: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'coa-5400',
        accountCode: '5400',
        accountName: 'Maintenance Expense',
        accountType: 'EXPENSE',
        normalBalance: 'DEBIT',
        parentAccountId: null,
        isPostable: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'coa-5500',
        accountCode: '5500',
        accountName: 'Station Operational Expense',
        accountType: 'EXPENSE',
        normalBalance: 'DEBIT',
        parentAccountId: null,
        isPostable: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  const periodStart = new Date(`${context.date(-45)}T00:00:00.000Z`);
  const periods = Array.from({ length: 6 }, (_, index) => {
    const start = new Date(
      Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + index, 1)
    );
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
    const code = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
    return {
      id: `period-${code}`,
      periodCode: code,
      periodName: code,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      status: 'OPEN',
      lockedAt: null,
      lockedByUserId: null,
      createdAt: referenceNow,
      updatedAt: referenceNow
    };
  });

  await db.insert(accountingPeriods).values(periods).onConflictDoNothing();

  await db
    .insert(costCategories)
    .values([
      {
        id: 'cost-fuel',
        categoryCode: 'FUEL',
        categoryName: 'Fuel',
        costGroup: 'Station Operations',
        defaultCoaId: 'coa-5100',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'cost-handling',
        categoryCode: 'HANDLING',
        categoryName: 'Handling',
        costGroup: 'Station Operations',
        defaultCoaId: 'coa-5200',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'cost-parking',
        categoryCode: 'PARKING',
        categoryName: 'Parking',
        costGroup: 'Station Operations',
        defaultCoaId: 'coa-5300',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'cost-accommodation',
        categoryCode: 'ACCOMMODATION',
        categoryName: 'Accommodation',
        costGroup: 'Crew Support',
        defaultCoaId: 'coa-5500',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'cost-transport',
        categoryCode: 'TRANSPORT',
        categoryName: 'Transport',
        costGroup: 'Crew Support',
        defaultCoaId: 'coa-5500',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'cost-maintenance',
        categoryCode: 'MAINTENANCE',
        categoryName: 'Maintenance',
        costGroup: 'Maintenance',
        defaultCoaId: 'coa-5400',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'cost-emergency',
        categoryCode: 'EMERGENCY',
        categoryName: 'Emergency',
        costGroup: 'Irregular Operations',
        defaultCoaId: 'coa-5500',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'cost-other',
        categoryCode: 'OTHER',
        categoryName: 'Other',
        costGroup: 'Other',
        defaultCoaId: 'coa-5500',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(vendors)
    .values([
      {
        id: 'vendor-accommodation-djj',
        vendorCode: 'VEND_ACCOM_DJJ',
        vendorName: 'Vendor Akomodasi Jayapura',
        vendorType: 'ACCOMMODATION',
        stationId: 'st-djj',
        contactPerson: 'Hotel Desk',
        phone: '+62-812-0000-3001',
        email: 'hotel@jayapura.example',
        paymentTermId: 'term-net-14',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'vendor-transport-wmx',
        vendorCode: 'VEND_TRANSPORT_WMX',
        vendorName: 'Vendor Transport Wamena',
        vendorType: 'TRANSPORT',
        stationId: 'st-wmx',
        contactPerson: 'Transport Desk',
        phone: '+62-812-0000-3002',
        email: 'transport@wamena.example',
        paymentTermId: 'term-net-7',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'vendor-maintenance',
        vendorCode: 'VEND_MAINT_SUPPORT',
        vendorName: 'Vendor Maintenance Support',
        vendorType: 'MAINTENANCE',
        stationId: null,
        contactPerson: 'Maintenance Desk',
        phone: '+62-812-0000-3003',
        email: 'maintenance@support.example',
        paymentTermId: 'term-net-30',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(fuelSuppliers)
    .values([
      {
        id: 'fuel-pertamina-djj',
        supplierCode: 'FUEL_DJJ_MOCK',
        supplierName: 'Pertamina Aviation Fuel Mock - DJJ',
        stationId: 'st-djj',
        fuelType: 'AVTUR',
        referencePricePerLitre: 18500,
        currencyId: 'cur-idr',
        contactPerson: 'Fuel Desk DJJ',
        phone: '+62-812-0000-4001',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'fuel-pertamina-tim',
        supplierCode: 'FUEL_TIM_MOCK',
        supplierName: 'Pertamina Aviation Fuel Mock - TIM',
        stationId: 'st-tim',
        fuelType: 'AVTUR',
        referencePricePerLitre: 19200,
        currencyId: 'cur-idr',
        contactPerson: 'Fuel Desk TIM',
        phone: '+62-812-0000-4002',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'fuel-pertamina-wmx',
        supplierCode: 'FUEL_WMX_MOCK',
        supplierName: 'Pertamina Aviation Fuel Mock - WMX',
        stationId: 'st-wmx',
        fuelType: 'AVTUR',
        referencePricePerLitre: 20500,
        currencyId: 'cur-idr',
        contactPerson: 'Fuel Desk WMX',
        phone: '+62-812-0000-4003',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(stationServiceSuppliers)
    .values([
      {
        id: 'hp-angkasa-djj',
        supplierCode: 'HANDLING_DJJ_MOCK',
        supplierName: 'Angkasa Pura Handling Mock - DJJ',
        stationId: 'st-djj',
        serviceType: 'BOTH',
        referenceRate: 2750000,
        currencyId: 'cur-idr',
        contactPerson: 'Handling Desk DJJ',
        phone: '+62-812-0000-5001',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'hp-angkasa-tim',
        supplierCode: 'HANDLING_TIM_MOCK',
        supplierName: 'Angkasa Pura Handling Mock - TIM',
        stationId: 'st-tim',
        serviceType: 'HANDLING',
        referenceRate: 3100000,
        currencyId: 'cur-idr',
        contactPerson: 'Handling Desk TIM',
        phone: '+62-812-0000-5002',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(taxCodes)
    .values([
      {
        id: 'tax-non-tax',
        taxCode: 'NON_TAX',
        taxName: 'Non Tax',
        taxRateBasisPoints: 0,
        taxType: 'NON_TAX',
        effectiveFrom: context.date(-16),
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'tax-ppn',
        taxCode: 'PPN_11',
        taxName: 'PPN Placeholder',
        taxRateBasisPoints: 1100,
        taxType: 'VAT',
        effectiveFrom: context.date(-16),
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'tax-withholding',
        taxCode: 'PPH_23',
        taxName: 'Withholding Placeholder',
        taxRateBasisPoints: 200,
        taxType: 'WITHHOLDING',
        effectiveFrom: context.date(-16),
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(productAccountingProfiles)
    .values([
      {
        id: 'pap-inventory-part',
        profileCode: 'INV_PART_STANDARD',
        profileName: 'Aircraft parts inventory profile',
        productType: 'INVENTORY_PART',
        accountingClass: 'INVENTORY',
        inventoryAccountId: 'coa-1200',
        expenseAccountId: 'coa-5400',
        assetAccountId: 'coa-1300',
        revenueAccountId: null,
        deferredRevenueAccountId: null,
        taxProfileId: null,
        capitalizationCandidate: true,
        allowedTreatmentsJson: JSON.stringify(['INVENTORY', 'EXPENSE', 'CAPITALIZE']),
        requiredDimensionsJson: JSON.stringify(['stationId', 'aircraftId']),
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'pap-passenger-ticket',
        profileCode: 'PAX_TICKET_DEFERRED',
        profileName: 'Passenger ticket deferred revenue profile',
        productType: 'PASSENGER_TICKET',
        accountingClass: 'PASSENGER_REVENUE',
        inventoryAccountId: null,
        expenseAccountId: null,
        assetAccountId: null,
        revenueAccountId: 'coa-4200',
        deferredRevenueAccountId: 'coa-2200',
        taxProfileId: 'tax-ppn',
        capitalizationCandidate: false,
        allowedTreatmentsJson: JSON.stringify([
          'DEFERRED_REVENUE',
          'REVENUE_RECOGNITION',
          'REFUND_REVERSAL'
        ]),
        requiredDimensionsJson: JSON.stringify(['flightId', 'stationId']),
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'pap-cargo-booking',
        profileCode: 'CARGO_DEFERRED',
        profileName: 'Cargo booking deferred revenue profile',
        productType: 'CARGO_BOOKING',
        accountingClass: 'CARGO_REVENUE',
        inventoryAccountId: null,
        expenseAccountId: null,
        assetAccountId: null,
        revenueAccountId: 'coa-4300',
        deferredRevenueAccountId: 'coa-2200',
        taxProfileId: 'tax-ppn',
        capitalizationCandidate: false,
        allowedTreatmentsJson: JSON.stringify([
          'DEFERRED_REVENUE',
          'REVENUE_RECOGNITION',
          'REFUND_REVERSAL'
        ]),
        requiredDimensionsJson: JSON.stringify(['flightId', 'stationId']),
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'pap-charter-invoice',
        profileCode: 'CHARTER_AR',
        profileName: 'Charter invoice receivable profile',
        productType: 'CHARTER_INVOICE',
        accountingClass: 'CHARTER_REVENUE',
        inventoryAccountId: null,
        expenseAccountId: null,
        assetAccountId: null,
        revenueAccountId: 'coa-4100',
        deferredRevenueAccountId: null,
        taxProfileId: 'tax-ppn',
        capitalizationCandidate: false,
        allowedTreatmentsJson: JSON.stringify(['ACCOUNTS_RECEIVABLE']),
        requiredDimensionsJson: JSON.stringify(['flightId']),
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(accountingPolicies)
    .values([
      {
        id: 'policy-inventory-receipt-v1',
        policyCode: 'INV_RECEIPT_TO_INVENTORY_V1',
        policyName: 'Receive aircraft parts into inventory',
        eventType: 'INVENTORY_RECEIVED',
        productAccountingProfileId: 'pap-inventory-part',
        debitAccountId: 'coa-1200',
        creditAccountId: 'coa-2400',
        treatment: 'INVENTORY',
        capitalizationCandidate: false,
        requiredDimensionsJson: JSON.stringify(['stationId']),
        priority: 10,
        effectiveFrom: context.date(-60),
        effectiveTo: null,
        approvalStatus: 'APPROVED',
        version: 1,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'policy-maint-issue-expense-v1',
        policyCode: 'MAINT_PART_ISSUE_EXPENSE_V1',
        policyName: 'Issue routine maintenance parts to expense',
        eventType: 'MAINTENANCE_PART_ISSUED',
        productAccountingProfileId: 'pap-inventory-part',
        debitAccountId: 'coa-5400',
        creditAccountId: 'coa-1200',
        treatment: 'EXPENSE',
        capitalizationCandidate: false,
        requiredDimensionsJson: JSON.stringify(['aircraftId']),
        priority: 10,
        effectiveFrom: context.date(-60),
        effectiveTo: null,
        approvalStatus: 'APPROVED',
        version: 1,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'policy-component-install-asset-v1',
        policyCode: 'HEAVY_MAINT_COMPONENT_CAPITALIZE_V1',
        policyName: 'Capitalize heavy maintenance component installation',
        eventType: 'AIRCRAFT_COMPONENT_READY_FOR_USE',
        productAccountingProfileId: 'pap-inventory-part',
        debitAccountId: 'coa-1300',
        creditAccountId: 'coa-1200',
        treatment: 'CAPITALIZE',
        capitalizationCandidate: true,
        requiredDimensionsJson: JSON.stringify(['aircraftId']),
        priority: 10,
        effectiveFrom: context.date(-60),
        effectiveTo: null,
        approvalStatus: 'APPROVED',
        version: 1,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'policy-ticket-payment-deferred-v1',
        policyCode: 'TICKET_PAYMENT_DEFERRED_REVENUE_V1',
        policyName: 'Defer paid passenger and cargo ticket revenue before service',
        eventType: 'TICKET_PAYMENT_RECEIVED',
        productAccountingProfileId: 'pap-passenger-ticket',
        debitAccountId: 'coa-1000',
        creditAccountId: 'coa-2200',
        treatment: 'DEFERRED_REVENUE',
        capitalizationCandidate: false,
        requiredDimensionsJson: JSON.stringify(['flightId']),
        priority: 10,
        effectiveFrom: context.date(-60),
        effectiveTo: null,
        approvalStatus: 'APPROVED',
        version: 1,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'policy-cargo-payment-deferred-v1',
        policyCode: 'CARGO_PAYMENT_DEFERRED_REVENUE_V1',
        policyName: 'Defer paid cargo booking revenue before service',
        eventType: 'TICKET_PAYMENT_RECEIVED',
        productAccountingProfileId: 'pap-cargo-booking',
        debitAccountId: 'coa-1000',
        creditAccountId: 'coa-2200',
        treatment: 'DEFERRED_REVENUE',
        capitalizationCandidate: false,
        requiredDimensionsJson: JSON.stringify(['flightId']),
        priority: 10,
        effectiveFrom: context.date(-60),
        effectiveTo: null,
        approvalStatus: 'APPROVED',
        version: 1,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'policy-ticket-revenue-recognition-v1',
        policyCode: 'FLIGHT_COMPLETION_REVENUE_RECOGNITION_V1',
        policyName: 'Recognize passenger and cargo revenue when flight is complete',
        eventType: 'FLIGHT_COMPLETED_REVENUE',
        productAccountingProfileId: 'pap-passenger-ticket',
        debitAccountId: 'coa-2200',
        creditAccountId: 'coa-4200',
        treatment: 'REVENUE_RECOGNITION',
        capitalizationCandidate: false,
        requiredDimensionsJson: JSON.stringify(['flightId']),
        priority: 10,
        effectiveFrom: context.date(-60),
        effectiveTo: null,
        approvalStatus: 'APPROVED',
        version: 1,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'policy-passenger-service-fulfilled-v1',
        policyCode: 'PASSENGER_SERVICE_FULFILLED_REVENUE_V1',
        policyName: 'Recognize passenger ticket revenue when passenger service is fulfilled',
        eventType: 'PASSENGER_SERVICE_FULFILLED',
        productAccountingProfileId: 'pap-passenger-ticket',
        debitAccountId: 'coa-2200',
        creditAccountId: 'coa-4200',
        treatment: 'REVENUE_RECOGNITION',
        capitalizationCandidate: false,
        requiredDimensionsJson: JSON.stringify(['flightId']),
        priority: 10,
        effectiveFrom: context.date(-60),
        effectiveTo: null,
        approvalStatus: 'APPROVED',
        version: 1,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'policy-cargo-revenue-recognition-v1',
        policyCode: 'CARGO_FLIGHT_COMPLETION_REVENUE_RECOGNITION_V1',
        policyName: 'Recognize cargo revenue when flight is complete',
        eventType: 'FLIGHT_COMPLETED_REVENUE',
        productAccountingProfileId: 'pap-cargo-booking',
        debitAccountId: 'coa-2200',
        creditAccountId: 'coa-4300',
        treatment: 'REVENUE_RECOGNITION',
        capitalizationCandidate: false,
        requiredDimensionsJson: JSON.stringify(['flightId']),
        effectiveFrom: context.date(-60),
        effectiveTo: null,
        approvalStatus: 'APPROVED',
        version: 1,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'policy-ticket-refund-v1',
        policyCode: 'TICKET_REFUND_REVERSAL_V1',
        policyName: 'Reverse deferred revenue for approved ticket refunds',
        eventType: 'TICKET_REFUND_APPROVED',
        productAccountingProfileId: 'pap-passenger-ticket',
        debitAccountId: 'coa-2200',
        creditAccountId: 'coa-2300',
        treatment: 'REFUND_REVERSAL',
        capitalizationCandidate: false,
        requiredDimensionsJson: JSON.stringify(['flightId']),
        priority: 10,
        effectiveFrom: context.date(-60),
        effectiveTo: null,
        approvalStatus: 'APPROVED',
        version: 1,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'policy-cargo-refund-v1',
        policyCode: 'CARGO_REFUND_REVERSAL_V1',
        policyName: 'Reverse deferred revenue for approved cargo refunds',
        eventType: 'TICKET_REFUND_APPROVED',
        productAccountingProfileId: 'pap-cargo-booking',
        debitAccountId: 'coa-2200',
        creditAccountId: 'coa-2300',
        treatment: 'REFUND_REVERSAL',
        capitalizationCandidate: false,
        requiredDimensionsJson: JSON.stringify(['flightId']),
        priority: 10,
        effectiveFrom: context.date(-60),
        effectiveTo: null,
        approvalStatus: 'APPROVED',
        version: 1,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'policy-charter-ar-v1',
        policyCode: 'CHARTER_INVOICE_AR_V1',
        policyName: 'Record approved charter invoice as accounts receivable',
        eventType: 'CHARTER_INVOICE_ISSUED',
        productAccountingProfileId: 'pap-charter-invoice',
        debitAccountId: 'coa-1100',
        creditAccountId: 'coa-4100',
        treatment: 'ACCOUNTS_RECEIVABLE',
        capitalizationCandidate: false,
        requiredDimensionsJson: JSON.stringify(['flightId']),
        priority: 10,
        effectiveFrom: context.date(-60),
        effectiveTo: null,
        approvalStatus: 'APPROVED',
        version: 1,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();
}
