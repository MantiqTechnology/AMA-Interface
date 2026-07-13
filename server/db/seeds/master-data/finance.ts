import type { AppDatabase } from '../../client';
import {
  currencies,
  paymentTerms,
  chartOfAccounts,
  costCategories,
  vendors,
  fuelSuppliers,
  stationServiceSuppliers,
  taxCodes
} from '../../schema/finance';

const referenceNow = '2026-07-07T09:00:00.000+07:00';

export async function seedFinanceMasterData(db: AppDatabase) {
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
        description: 'Payment due immediately for demo cash transactions.',
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
        vendorName: 'Vendor Akomodasi Jayapura Demo',
        vendorType: 'ACCOMMODATION',
        stationId: 'st-djj',
        contactPerson: 'Hotel Desk Demo',
        phone: '+62-812-0000-3001',
        email: 'hotel@jayapura.demo',
        paymentTermId: 'term-net-14',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'vendor-transport-wmx',
        vendorCode: 'VEND_TRANSPORT_WMX',
        vendorName: 'Vendor Transport Wamena Demo',
        vendorType: 'TRANSPORT',
        stationId: 'st-wmx',
        contactPerson: 'Transport Desk Demo',
        phone: '+62-812-0000-3002',
        email: 'transport@wamena.demo',
        paymentTermId: 'term-net-7',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'vendor-maintenance',
        vendorCode: 'VEND_MAINT_SUPPORT',
        vendorName: 'Vendor Maintenance Support Demo',
        vendorType: 'MAINTENANCE',
        stationId: null,
        contactPerson: 'Maintenance Desk Demo',
        phone: '+62-812-0000-3003',
        email: 'maintenance@support.demo',
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
        contactPerson: 'Fuel Desk DJJ Demo',
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
        contactPerson: 'Fuel Desk TIM Demo',
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
        contactPerson: 'Fuel Desk WMX Demo',
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
        contactPerson: 'Handling Desk DJJ Demo',
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
        contactPerson: 'Handling Desk TIM Demo',
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
        taxName: 'Non Tax Demo',
        taxRateBasisPoints: 0,
        taxType: 'NON_TAX',
        effectiveFrom: '2026-07-01',
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'tax-ppn-demo',
        taxCode: 'PPN_DEMO',
        taxName: 'PPN Demo Placeholder',
        taxRateBasisPoints: 1100,
        taxType: 'VAT',
        effectiveFrom: '2026-07-01',
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'tax-withholding-demo',
        taxCode: 'WITHHOLDING_DEMO',
        taxName: 'Withholding Demo Placeholder',
        taxRateBasisPoints: 200,
        taxType: 'WITHHOLDING',
        effectiveFrom: '2026-07-01',
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();
}
