// ============================================================================
// data/procurement.ts
// SINGLE SOURCE OF TRUTH for all dummy data used across the Procurement
// module. Every page/component reads from here (via composables/useProcurement.ts)
// so the demo stays consistent no matter which screen you open.
//
// This is frontend-only fixture data for a prototype. No backend/API/DB is
// required to run the module — everything below is plain TypeScript.
// ============================================================================

import type {
  AslSegment,
  ApprovalAuthorityTier,
  ApprovalQueueItem,
  AttentionItem,
  AuditLogEntry,
  DeliverySegment,
  GoodsReceipt,
  LeadTimeCategory,
  OverviewKpi,
  PendingApprovalItem,
  PipelineStage,
  PurchaseOrder,
  PurchaseRequisition,
  RecentActivity,
  SourcingEvent,
  SpendCategoryBreakdown,
  Supplier,
  ThreeWayMatchRow,
  VendorClaim,
  VendorPerformanceRow,
  VendorScore,
  VendorSpend
} from '../types/procurement';

// ----------------------------------------------------------------------------
// 1. OVERVIEW — KPI strip
// ----------------------------------------------------------------------------
export const overviewKpis: OverviewKpi[] = [
  {
    id: 'total-po',
    label: 'Total PO',
    value: '128',
    icon: 'mdi-file-document-multiple-outline',
    iconColor: '#0F4C81',
    trend: { label: 'vs last week 12%', direction: 'up', tone: 'positive' }
  },
  {
    id: 'draft',
    label: 'Draft',
    value: '18',
    icon: 'mdi-file-edit-outline',
    iconColor: '#64748B',
    trend: { label: 'vs last week 5%', direction: 'up', tone: 'neutral' }
  },
  {
    id: 'pending-approval',
    label: 'Pending Approval',
    value: '24',
    icon: 'mdi-clipboard-clock-outline',
    iconColor: '#e87e2d',
    trend: { label: 'vs last week 9%', direction: 'up', tone: 'negative' }
  },
  {
    id: 'approved',
    label: 'Approved',
    value: '32',
    icon: 'mdi-shield-check-outline',
    iconColor: '#0E9F9A',
    trend: { label: 'vs last week 14%', direction: 'up', tone: 'positive' }
  },
  {
    id: 'sent-to-vendor',
    label: 'Sent to Vendor',
    value: '28',
    icon: 'mdi-account-arrow-right-outline',
    iconColor: '#0F4C81',
    trend: { label: 'vs last week 8%', direction: 'up', tone: 'positive' }
  },
  {
    id: 'partially-received',
    label: 'Partially Received',
    value: '16',
    icon: 'mdi-truck-check-outline',
    iconColor: '#583390',
    trend: { label: 'vs last week 6%', direction: 'down', tone: 'negative' }
  },
  {
    id: 'completed',
    label: 'Completed',
    value: '10',
    icon: 'mdi-check-circle-outline',
    iconColor: '#15803D',
    trend: { label: 'vs last week 25%', direction: 'up', tone: 'positive' }
  }
];

// ----------------------------------------------------------------------------
// 2. OVERVIEW — PO Approval Pipeline + bottlenecks
// ----------------------------------------------------------------------------
export const poPipeline: PipelineStage[] = [
  { status: 'Draft', count: 18, icon: 'mdi-file-document-outline', color: '#64748B' },
  { status: 'Pending Approval', count: 24, icon: 'mdi-account-clock-outline', color: '#b41209' },
  { status: 'Approved', count: 32, icon: 'mdi-shield-check-outline', color: '#0E9F9A' },
  { status: 'Sent to Vendor', count: 28, icon: 'mdi-account-arrow-right-outline', color: '#7e4fc5' },
  { status: 'Partially Received', count: 16, icon: 'mdi-truck-check-outline', color: '#20477a' },
  { status: 'Completed', count: 10, icon: 'mdi-check-circle-outline', color: '#2da54d' }
];

export const pendingApprovalItems: PendingApprovalItem[] = [
  {
    poNumber: 'PO-2026-0445',
    supplier: 'PT Aero Parts Indonesia',
    amount: 125_000_000,
    submittedDate: '20/08/2026',
    pendingDays: 3,
    currentApprover: 'Procurement Manager'
  },
  {
    poNumber: 'PO-2026-0447',
    supplier: 'PT Tech Aviasi',
    amount: 87_500_000,
    submittedDate: '21/08/2026',
    pendingDays: 2,
    currentApprover: 'Finance Manager'
  },
  {
    poNumber: 'PO-2026-0449',
    supplier: 'PT Nusantara Fuel',
    amount: 540_000_000,
    submittedDate: '19/08/2026',
    pendingDays: 4,
    currentApprover: 'Direktur Operasional'
  },
  {
    poNumber: 'PO-2026-0451',
    supplier: 'PT Global Aero Supply',
    amount: 210_000_000,
    submittedDate: '18/08/2026',
    pendingDays: 5,
    currentApprover: 'Direktur Utama'
  }
];

export const poBottleneckCount = 7;

// ----------------------------------------------------------------------------
// 3. OVERVIEW — Vendor performance, ASL / AVL status
// ----------------------------------------------------------------------------
export const topVendorScores: VendorScore[] = [
  {
    vendorCode: 'SUP-001',
    vendor: 'PT Aero Parts Indonesia',
    onTimeDelivery: 96,
    quality: 95,
    priceCompetitiveness: 90,
    overallScore: 93,
    rating: 'Excellent'
  },
  {
    vendorCode: 'SUP-002',
    vendor: 'PT Aviation Supply',
    onTimeDelivery: 92,
    quality: 93,
    priceCompetitiveness: 88,
    overallScore: 90,
    rating: 'Excellent'
  },
  {
    vendorCode: 'SUP-004',
    vendor: 'PT Global Aero',
    onTimeDelivery: 88,
    quality: 89,
    priceCompetitiveness: 86,
    overallScore: 87,
    rating: 'Good'
  },
  {
    vendorCode: 'SUP-003',
    vendor: 'PT Nusantara Fuel',
    onTimeDelivery: 84,
    quality: 90,
    priceCompetitiveness: 85,
    overallScore: 86,
    rating: 'Good'
  },
  {
    vendorCode: 'SUP-005',
    vendor: 'PT Tech Aviasi',
    onTimeDelivery: 78,
    quality: 82,
    priceCompetitiveness: 80,
    overallScore: 80,
    rating: 'Fair'
  }
];

export const aslCertificateStatus: AslSegment[] = [
  { label: 'Valid', value: 128, percent: 72, color: '#2cb85f' },
  { label: 'Expiring ≤ 60 days', value: 32, percent: 18, color: '#d7772d' },
  { label: 'Expired', value: 12, percent: 7, color: '#DC2626' },
  { label: 'No Certificate', value: 6, percent: 8, color: '#94A3B8' }
];

export const totalAvlVendors = 178;
export const certificatesExpiringSoon = 4;

// ----------------------------------------------------------------------------
// 4. OVERVIEW — Lead time & delivery tracking
// ----------------------------------------------------------------------------
export const leadTimeByCategory: LeadTimeCategory[] = [
  { category: 'Aircraft Spare Parts', averageDays: 24, targetDays: 10 },
  { category: 'Rotables', averageDays: 32, targetDays: 18 },
  { category: 'Consumables', averageDays: 15, targetDays: 7 },
  { category: 'Fuel', averageDays: 7, targetDays: 5 },
  { category: 'Ground Handling', averageDays: 18, targetDays: 15 },
  { category: 'Maintenance Services', averageDays: 29, targetDays: 15 }
];

export const deliveryPerformance: DeliverySegment[] = [
  { label: 'On Time', value: 92, percent: 65, color: '#2eaf91' },
  { label: 'Delayed', value: 38, percent: 27, color: '#f07b22' },
  { label: 'Overdue', value: 12, percent: 8, color: '#DC2626' }
];

export const totalDeliveriesThisWeek = 142;
export const overdueDeliveriesCount = 3;

// ----------------------------------------------------------------------------
// 5. OVERVIEW — Spend analysis
// ----------------------------------------------------------------------------
export const totalSpendThisYear = 82_450_000_000;
export const totalBudgetThisYear = 109_500_000_000;
export const budgetUtilizationPercent = 75.2;

export const spendByCategory: SpendCategoryBreakdown[] = [
  { category: 'Aircraft Spare Parts', amount: 38_500_000_000, percent: 46.7, color: '#3495ea' },
  { category: 'Fuel', amount: 18_200_000_000, percent: 22.1, color: '#29b15b' },
  { category: 'Maintenance Services', amount: 12_400_000_000, percent: 15.1, color: '#ce2e2e' },
  { category: 'Rotables', amount: 7_300_000_000, percent: 8.9, color: '#6d2ea5' },
  { category: 'General Goods & Services', amount: 6_000_000_000, percent: 7.2, color: '#2abca9' }
];

export const topVendorSpend: VendorSpend[] = [
  { vendor: 'PT Aero Parts Indonesia', amount: 21_450_000_000 },
  { vendor: 'PT Global Aero Supply', amount: 15_200_000_000 },
  { vendor: 'PT Nusantara Fuel', amount: 12_800_000_000 },
  { vendor: 'PT Aviation Supply', amount: 10_350_000_000 },
  { vendor: 'PT Tech Aviasi', amount: 7_250_000_000 }
];

// ----------------------------------------------------------------------------
// 6. OVERVIEW — Recent activity + attention queue
// ----------------------------------------------------------------------------
export const recentActivity: RecentActivity[] = [
  {
    reference: 'PR-AMA-260822-018',
    type: 'Purchase Requisition',
    counterparty: 'MRO',
    amount: 185_000_000,
    date: '22 Aug 2026',
    status: 'Pending Approval'
  },
  {
    reference: 'PO-AMA-260821-014',
    type: 'Purchase Order',
    counterparty: 'PT Aero Parts Indonesia',
    amount: 425_000_000,
    date: '21 Aug 2026',
    status: 'Pending Finance Approval'
  },
  {
    reference: 'RFQ-AMA-260819-006',
    type: 'RFQ',
    counterparty: 'Aircraft Components',
    amount: 680_000_000,
    date: '19 Aug 2026',
    status: 'Evaluation'
  },
  {
    reference: 'GR-AMA-260818-022',
    type: 'Goods Receipt',
    counterparty: 'PT Aviation Supply',
    amount: 95_000_000,
    date: '18 Aug 2026',
    status: 'Accepted'
  }
];

export const attentionQueue: AttentionItem[] = [
  {
    id: 'att-1',
    category: 'Approval Bottleneck',
    reference: 'PO-AMA-260821-014',
    description: 'Waiting Finance Approval',
    meta: '3 days',
    severity: 'high'
  },
  {
    id: 'att-2',
    category: 'Delivery Overdue',
    reference: 'PO-AMA-260816-007',
    description: 'Aircraft Spare Parts',
    meta: '5 days overdue',
    severity: 'high'
  },
  {
    id: 'att-3',
    category: 'Certificate Expiring',
    reference: 'PT Aero Parts Indonesia',
    description: 'CASR 145 Supplier Certificate',
    meta: 'Expires in 18 days',
    severity: 'medium'
  },
  {
    id: 'att-4',
    category: 'Three-Way Match Exception',
    reference: 'PO-AMA-260815-003',
    description: 'Invoice amount mismatch',
    meta: 'Needs review',
    severity: 'medium'
  },
  {
    id: 'att-5',
    category: 'Budget Review',
    reference: 'PR-AMA-260814-011',
    description: 'General Affairs budget line near limit',
    meta: 'Pending review',
    severity: 'low'
  },
  {
    id: 'att-6',
    category: 'Vendor Claim',
    reference: 'CLM-AMA-260812-004',
    description: 'PT Nusantara Ground Services — short quantity',
    meta: 'Open',
    severity: 'low'
  }
];

// ----------------------------------------------------------------------------
// 7. SUPPLIERS & VENDORS
// ----------------------------------------------------------------------------
export const suppliers: Supplier[] = [
  {
    id: 'sup-001',
    vendorCode: 'SUP-001',
    company: 'PT Aero Parts Indonesia',
    category: 'Aircraft Spare Parts',
    contactName: 'Budi Santoso',
    contactEmail: 'budi.santoso@aeroparts.co.id',
    contactPhone: '+62 21 5551 2201',
    leadTimeDays: 14,
    avlStatus: 'Approved',
    performanceScore: 95,
    certificateName: 'CASR 145 Supplier Certificate',
    certificateExpiry: '14 Feb 2027',
    businessLicense: 'NIB 8120041572201',
    paymentTerms: 'Net 30',
    status: 'Active',
    address: 'Kawasan Industri Cikarang, Bekasi, Jawa Barat',
    procurementHistoryCount: 64,
    totalSpend: 21_450_000_000
  },
  {
    id: 'sup-002',
    vendorCode: 'SUP-002',
    company: 'PT Aviation Supply Nusantara',
    category: 'Consumables',
    contactName: 'Siti Rahmawati',
    contactEmail: 'siti.rahmawati@aviationsupply.co.id',
    contactPhone: '+62 21 5551 3390',
    leadTimeDays: 6,
    avlStatus: 'Approved',
    performanceScore: 89,
    certificateName: 'ISO 9001:2015',
    certificateExpiry: '02 Nov 2026',
    businessLicense: 'NIB 8120039012110',
    paymentTerms: 'Net 30',
    status: 'Active',
    address: 'Jl. Marsekal Suryadarma, Tangerang, Banten',
    procurementHistoryCount: 51,
    totalSpend: 10_350_000_000
  },
  {
    id: 'sup-003',
    vendorCode: 'SUP-003',
    company: 'PT Nusantara Ground Services',
    category: 'Ground Handling',
    contactName: 'Ahmad Fauzi',
    contactEmail: 'ahmad.fauzi@ngs.co.id',
    contactPhone: '+62 274 555 8821',
    leadTimeDays: 4,
    avlStatus: 'Conditional',
    performanceScore: 82,
    certificateName: 'Ground Support Equipment Certification',
    certificateExpiry: '30 Sep 2026',
    businessLicense: 'NIB 8120027713340',
    paymentTerms: 'Net 14',
    status: 'Active',
    address: 'Jl. Adisucipto, Yogyakarta',
    procurementHistoryCount: 38,
    totalSpend: 4_120_000_000
  },
  {
    id: 'sup-004',
    vendorCode: 'SUP-004',
    company: 'PT Garuda Engineering Supply',
    category: 'Rotables',
    contactName: 'Dewi Lestari',
    contactEmail: 'dewi.lestari@garudaengineering.co.id',
    contactPhone: '+62 21 5551 7710',
    leadTimeDays: 21,
    avlStatus: 'Approved',
    performanceScore: 87,
    certificateName: 'FAA 8130-3 Repair Station Approval',
    certificateExpiry: '11 Sep 2026',
    businessLicense: 'NIB 8120018834401',
    paymentTerms: 'Net 45',
    status: 'Active',
    address: 'Kawasan GMF, Tangerang, Banten',
    procurementHistoryCount: 47,
    totalSpend: 7_300_000_000
  },
  {
    id: 'sup-005',
    vendorCode: 'SUP-005',
    company: 'PT Pacific Aviation Components',
    category: 'Aircraft Spare Parts',
    contactName: 'Yusuf Prasetyo',
    contactEmail: 'yusuf.prasetyo@pacificaviation.co.id',
    contactPhone: '+62 21 5551 4432',
    leadTimeDays: 26,
    avlStatus: 'Pending Review',
    performanceScore: 74,
    certificateName: 'CASR 145 Supplier Certificate',
    certificateExpiry: '05 Oct 2026',
    businessLicense: 'NIB 8120052291187',
    paymentTerms: 'Net 30',
    status: 'Active',
    address: 'Jl. Marunda Raya, Jakarta Utara',
    procurementHistoryCount: 22,
    totalSpend: 3_680_000_000
  },
  {
    id: 'sup-006',
    vendorCode: 'SUP-006',
    company: 'PT Nusantara Fuel',
    category: 'Fuel',
    contactName: 'Rangga Wibowo',
    contactEmail: 'rangga.wibowo@nusantarafuel.co.id',
    contactPhone: '+62 21 5551 9020',
    leadTimeDays: 7,
    avlStatus: 'Approved',
    performanceScore: 90,
    certificateName: 'Fuel Handling Safety Certificate',
    certificateExpiry: '19 Jan 2027',
    businessLicense: 'NIB 8120061192204',
    paymentTerms: 'Net 21',
    status: 'Active',
    address: 'Depo Pertamina, Balikpapan, Kalimantan Timur',
    procurementHistoryCount: 58,
    totalSpend: 12_800_000_000
  },
  {
    id: 'sup-007',
    vendorCode: 'SUP-007',
    company: 'PT Tech Aviasi',
    category: 'Maintenance Services',
    contactName: 'Andi Kurniawan',
    contactEmail: 'andi.kurniawan@techaviasi.co.id',
    contactPhone: '+62 21 5551 6650',
    leadTimeDays: 18,
    avlStatus: 'Suspended',
    performanceScore: 61,
    certificateName: 'CASR 145 Supplier Certificate',
    certificateExpiry: '28 Aug 2026',
    businessLicense: 'NIB 8120073345510',
    paymentTerms: 'Net 30',
    status: 'Inactive',
    address: 'Jl. Husein Sastranegara, Bandung, Jawa Barat',
    procurementHistoryCount: 19,
    totalSpend: 2_150_000_000
  },
  {
    id: 'sup-008',
    vendorCode: 'SUP-008',
    company: 'PT Global Aero Supply',
    category: 'Rotables',
    contactName: 'Teguh Prabowo',
    contactEmail: 'teguh.prabowo@globalaero.co.id',
    contactPhone: '+62 21 5551 2298',
    leadTimeDays: 19,
    avlStatus: 'Approved',
    performanceScore: 88,
    certificateName: 'EASA Part-145 Approval',
    certificateExpiry: '22 Dec 2026',
    businessLicense: 'NIB 8120044456672',
    paymentTerms: 'Net 30',
    status: 'Active',
    address: 'Kawasan Berikat Cakung, Jakarta Timur',
    procurementHistoryCount: 44,
    totalSpend: 15_200_000_000
  }
];

// ----------------------------------------------------------------------------
// 8. PURCHASE REQUISITION
// ----------------------------------------------------------------------------
export const purchaseRequisitions: PurchaseRequisition[] = [
  {
    id: 'pr-001',
    prNumber: 'PR-AMA-260822-018',
    date: '22 Aug 2026',
    requester: 'Bayu Saputra',
    department: 'MRO',
    itemService: 'Hydraulic seal kit - A320 landing gear',
    items: [{ name: 'Hydraulic seal kit', quantity: 12, unit: 'set', estimatedUnitPrice: 15_400_000 }],
    estimatedValue: 185_000_000,
    requiredDate: '05 Sep 2026',
    priority: 'High',
    status: 'Under Review',
    budgetCheck: 'Needs Review',
    nextAction: 'Waiting budget confirmation from Finance'
  },
  {
    id: 'pr-002',
    prNumber: 'PR-AMA-260821-017',
    date: '21 Aug 2026',
    requester: 'Deni Herlambang',
    department: 'Ground Handling',
    itemService: 'Tug truck replacement parts',
    items: [{ name: 'Tug truck gearbox', quantity: 2, unit: 'unit', estimatedUnitPrice: 42_000_000 }],
    estimatedValue: 84_000_000,
    requiredDate: '10 Sep 2026',
    priority: 'Medium',
    status: 'Approved',
    budgetCheck: 'Available',
    nextAction: 'Ready to convert to RFQ'
  },
  {
    id: 'pr-003',
    prNumber: 'PR-AMA-260820-016',
    date: '20 Aug 2026',
    requester: 'Rangga Wibowo',
    department: 'IT',
    itemService: 'Network switch upgrade - Ops Center',
    items: [{ name: 'Managed switch 24-port', quantity: 6, unit: 'unit', estimatedUnitPrice: 9_800_000 }],
    estimatedValue: 58_800_000,
    requiredDate: '15 Sep 2026',
    priority: 'Low',
    status: 'Submitted',
    budgetCheck: 'Available',
    nextAction: 'Awaiting department head review'
  },
  {
    id: 'pr-004',
    prNumber: 'PR-AMA-260819-015',
    date: '19 Aug 2026',
    requester: 'Wahyu Nugroho',
    department: 'Finance',
    itemService: 'Office consumables Q3',
    items: [{ name: 'Printer toner & stationery bundle', quantity: 1, unit: 'lot', estimatedUnitPrice: 21_500_000 }],
    estimatedValue: 21_500_000,
    requiredDate: '01 Sep 2026',
    priority: 'Low',
    status: 'Converted',
    budgetCheck: 'Available',
    nextAction: 'Converted to PO-AMA-260820-011'
  },
  {
    id: 'pr-005',
    prNumber: 'PR-AMA-260818-014',
    date: '18 Aug 2026',
    requester: 'Andi Kurniawan',
    department: 'MRO',
    itemService: 'Engine borescope inspection service',
    items: [{ name: 'Borescope inspection — CFM56', quantity: 1, unit: 'job', estimatedUnitPrice: 320_000_000 }],
    estimatedValue: 320_000_000,
    requiredDate: '30 Aug 2026',
    priority: 'Urgent',
    status: 'Rejected',
    budgetCheck: 'Over Budget',
    nextAction: 'Requester to revise scope and resubmit'
  },
  {
    id: 'pr-006',
    prNumber: 'PR-AMA-260817-013',
    date: '17 Aug 2026',
    requester: 'Dewi Lestari',
    department: 'General Affairs',
    itemService: 'Facility cleaning contract renewal',
    items: [{ name: 'Cleaning service contract', quantity: 12, unit: 'month', estimatedUnitPrice: 9_500_000 }],
    estimatedValue: 114_000_000,
    requiredDate: '01 Oct 2026',
    priority: 'Medium',
    status: 'Draft',
    budgetCheck: 'Available',
    nextAction: 'Requester to complete item details'
  }
];

// ----------------------------------------------------------------------------
// 9. SOURCING & TENDER
// ----------------------------------------------------------------------------
export const sourcingEvents: SourcingEvent[] = [
  {
    id: 'src-001',
    reference: 'RFQ-AMA-260819-006',
    sourcePr: 'PR-AMA-260810-009',
    type: 'RFQ',
    itemService: 'Aircraft Components - Brake Assembly',
    invitedVendors: 4,
    deadline: '26 Aug 2026',
    lowestQuote: 640_000_000,
    status: 'Evaluation',
    quotations: [
      { vendor: 'PT Aero Parts Indonesia', quotedPrice: 640_000_000, leadTimeDays: 14, paymentTerms: 'Net 30', warranty: '12 months', documentCompliance: 'Complete', score: 93, selected: true },
      { vendor: 'PT Pacific Aviation Components', quotedPrice: 680_000_000, leadTimeDays: 21, paymentTerms: 'Net 30', warranty: '12 months', documentCompliance: 'Complete', score: 85 },
      { vendor: 'PT Global Aero Supply', quotedPrice: 710_000_000, leadTimeDays: 19, paymentTerms: 'Net 45', warranty: '6 months', documentCompliance: 'Partial', score: 78 },
      { vendor: 'PT Garuda Engineering Supply', quotedPrice: 725_000_000, leadTimeDays: 18, paymentTerms: 'Net 30', warranty: '12 months', documentCompliance: 'Complete', score: 82 }
    ]
  },
  {
    id: 'src-002',
    reference: 'TND-AMA-260812-002',
    sourcePr: 'PR-AMA-260805-004',
    type: 'Tender',
    itemService: 'Annual Ground Handling Equipment Maintenance Contract',
    invitedVendors: 6,
    deadline: '02 Sep 2026',
    lowestQuote: 1_450_000_000,
    status: 'Quotation Received',
    quotations: [
      { vendor: 'PT Nusantara Ground Services', quotedPrice: 1_450_000_000, leadTimeDays: 30, paymentTerms: 'Net 30', warranty: '12 months', documentCompliance: 'Complete', score: 88 },
      { vendor: 'PT Tech Aviasi', quotedPrice: 1_510_000_000, leadTimeDays: 30, paymentTerms: 'Net 30', warranty: '12 months', documentCompliance: 'Partial', score: 74 }
    ]
  },
  {
    id: 'src-003',
    reference: 'RFQ-AMA-260815-005',
    sourcePr: 'PR-AMA-260808-007',
    type: 'Direct Purchase',
    itemService: 'Office consumables Q3',
    invitedVendors: 1,
    deadline: '20 Aug 2026',
    lowestQuote: 21_500_000,
    status: 'Awarded',
    quotations: [
      { vendor: 'PT Aviation Supply Nusantara', quotedPrice: 21_500_000, leadTimeDays: 6, paymentTerms: 'Net 30', warranty: '-', documentCompliance: 'Complete', score: 90, selected: true }
    ]
  },
  {
    id: 'src-004',
    reference: 'EMG-AMA-260821-001',
    sourcePr: 'PR-AMA-260821-017',
    type: 'Emergency Procurement',
    itemService: 'AOG spare - hydraulic pump unit',
    invitedVendors: 2,
    deadline: '24 Aug 2026',
    lowestQuote: 96_000_000,
    status: 'Invitation Sent',
    quotations: [
      { vendor: 'PT Aero Parts Indonesia', quotedPrice: 96_000_000, leadTimeDays: 2, paymentTerms: 'Net 14', warranty: '6 months', documentCompliance: 'Complete', score: 91 }
    ]
  },
  {
    id: 'src-005',
    reference: 'RFQ-AMA-260806-003',
    sourcePr: 'PR-AMA-260801-002',
    type: 'RFQ',
    itemService: 'Network switch upgrade - Ops Center',
    invitedVendors: 3,
    deadline: '14 Aug 2026',
    lowestQuote: 58_800_000,
    status: 'Draft',
    quotations: []
  },
  {
    id: 'src-006',
    reference: 'TND-AMA-260728-001',
    sourcePr: 'PR-AMA-260720-011',
    type: 'Tender',
    itemService: 'Fuel supply contract - 2027 renewal',
    invitedVendors: 5,
    deadline: '10 Sep 2026',
    lowestQuote: 12_800_000_000,
    status: 'Evaluation',
    quotations: [
      { vendor: 'PT Nusantara Fuel', quotedPrice: 12_800_000_000, leadTimeDays: 7, paymentTerms: 'Net 21', warranty: '-', documentCompliance: 'Complete', score: 90, selected: true },
      { vendor: 'PT Pertamina Aviation Partner', quotedPrice: 13_050_000_000, leadTimeDays: 7, paymentTerms: 'Net 21', warranty: '-', documentCompliance: 'Complete', score: 87 }
    ]
  }
];

// ----------------------------------------------------------------------------
// 10. PURCHASE ORDERS
// ----------------------------------------------------------------------------
export const purchaseOrders: PurchaseOrder[] = [
  {
    id: 'po-001',
    poNumber: 'PO-AMA-260821-014',
    supplier: 'PT Aero Parts Indonesia',
    sourcePr: 'PR-AMA-260810-009',
    category: 'Aircraft Spare Parts',
    poDate: '21 Aug 2026',
    totalAmount: 425_000_000,
    expectedDelivery: '04 Sep 2026',
    delivery: { ordered: 100, received: 0, outstanding: 100 },
    status: 'Pending Approval',
    isOverdue: false
  },
  {
    id: 'po-002',
    poNumber: 'PO-AMA-260820-011',
    supplier: 'PT Aviation Supply Nusantara',
    sourcePr: 'PR-AMA-260819-015',
    category: 'General Goods & Services',
    poDate: '20 Aug 2026',
    totalAmount: 21_500_000,
    expectedDelivery: '27 Aug 2026',
    delivery: { ordered: 1, received: 1, outstanding: 0 },
    status: 'Completed',
    isOverdue: false
  },
  {
    id: 'po-003',
    poNumber: 'PO-AMA-260819-010',
    supplier: 'PT Global Aero Supply',
    sourcePr: 'PR-AMA-260805-004',
    category: 'Rotables',
    poDate: '19 Aug 2026',
    totalAmount: 710_000_000,
    expectedDelivery: '20 Aug 2026',
    delivery: { ordered: 100, received: 70, outstanding: 30 },
    status: 'Partially Received',
    isOverdue: true
  },
  {
    id: 'po-004',
    poNumber: 'PO-AMA-260818-009',
    supplier: 'PT Nusantara Fuel',
    sourcePr: 'PR-AMA-260720-011',
    category: 'Fuel',
    poDate: '18 Aug 2026',
    totalAmount: 12_800_000_000,
    expectedDelivery: '25 Aug 2026',
    delivery: { ordered: 100, received: 0, outstanding: 100 },
    status: 'Sent to Vendor',
    isOverdue: false
  },
  {
    id: 'po-005',
    poNumber: 'PO-AMA-260816-007',
    supplier: 'PT Garuda Engineering Supply',
    sourcePr: 'PR-AMA-260806-006',
    category: 'Rotables',
    poDate: '16 Aug 2026',
    totalAmount: 725_000_000,
    expectedDelivery: '18 Aug 2026',
    delivery: { ordered: 100, received: 40, outstanding: 60 },
    status: 'Partially Received',
    isOverdue: true
  },
  {
    id: 'po-006',
    poNumber: 'PO-AMA-260815-006',
    supplier: 'PT Tech Aviasi',
    sourcePr: 'PR-AMA-260808-008',
    category: 'Maintenance Services',
    poDate: '15 Aug 2026',
    totalAmount: 320_000_000,
    expectedDelivery: '29 Aug 2026',
    delivery: { ordered: 1, received: 0, outstanding: 1 },
    status: 'Approved',
    isOverdue: false
  },
  {
    id: 'po-007',
    poNumber: 'PO-AMA-260812-004',
    supplier: 'PT Nusantara Ground Services',
    sourcePr: 'PR-AMA-260802-003',
    category: 'Ground Handling',
    poDate: '12 Aug 2026',
    totalAmount: 1_450_000_000,
    expectedDelivery: '12 Sep 2026',
    delivery: { ordered: 12, received: 2, outstanding: 10 },
    status: 'Draft',
    isOverdue: false
  },
  {
    id: 'po-008',
    poNumber: 'PO-AMA-260805-002',
    supplier: 'PT Pacific Aviation Components',
    sourcePr: 'PR-AMA-260728-005',
    category: 'Aircraft Spare Parts',
    poDate: '05 Aug 2026',
    totalAmount: 96_000_000,
    expectedDelivery: '07 Aug 2026',
    delivery: { ordered: 1, received: 0, outstanding: 1 },
    status: 'Cancelled',
    isOverdue: false
  }
];

// ----------------------------------------------------------------------------
// 11. RECEIVING & RETURNS
// ----------------------------------------------------------------------------
export const goodsReceipts: GoodsReceipt[] = [
  {
    id: 'gr-001',
    grNumber: 'GR-AMA-260818-022',
    poNumber: 'PO-AMA-260812-004',
    supplier: 'PT Aviation Supply Nusantara',
    receivedDate: '18 Aug 2026',
    item: 'Printer toner & stationery bundle',
    quantity: 1,
    inspection: 'Accepted',
    documents: ['CoC'],
    status: 'Accepted'
  },
  {
    id: 'gr-002',
    grNumber: 'GR-AMA-260819-023',
    poNumber: 'PO-AMA-260819-010',
    supplier: 'PT Global Aero Supply',
    receivedDate: '19 Aug 2026',
    item: 'Brake assembly',
    quantity: 70,
    inspection: 'Partially Accepted',
    documents: ['Form 1', '8130-3'],
    status: 'Partially Accepted'
  },
  {
    id: 'gr-003',
    grNumber: 'GR-AMA-260816-020',
    poNumber: 'PO-AMA-260816-007',
    supplier: 'PT Garuda Engineering Supply',
    receivedDate: '16 Aug 2026',
    item: 'Landing gear bushing set',
    quantity: 40,
    inspection: 'Accepted',
    documents: ['Form 1', '8130-3', 'CoC'],
    status: 'Accepted'
  },
  {
    id: 'gr-004',
    grNumber: 'GR-AMA-260814-019',
    poNumber: 'PO-AMA-260805-002',
    supplier: 'PT Pacific Aviation Components',
    receivedDate: '14 Aug 2026',
    item: 'Hydraulic pump unit',
    quantity: 1,
    inspection: 'Rejected',
    documents: ['CoC'],
    status: 'Rejected'
  },
  {
    id: 'gr-005',
    grNumber: 'GR-AMA-260822-024',
    poNumber: 'PO-AMA-260818-009',
    supplier: 'PT Nusantara Fuel',
    receivedDate: '22 Aug 2026',
    item: 'Fuel handling nozzle set',
    quantity: 1,
    inspection: 'Pending Inspection',
    documents: [],
    status: 'Pending Inspection'
  }
];

export const vendorClaims: VendorClaim[] = [
  {
    id: 'clm-001',
    claimNumber: 'CLM-AMA-260812-004',
    poNumber: 'PO-AMA-260812-004',
    supplier: 'PT Nusantara Ground Services',
    item: 'Ground power unit connector',
    reason: 'Short Quantity',
    claimValue: 18_000_000,
    rejectedQuantity: 3,
    notes: 'Kekurangan 3 unit dari total pengiriman, sudah dikonfirmasi ke vendor.',
    date: '19 Aug 2026',
    status: 'Open'
  },
  {
    id: 'clm-002',
    claimNumber: 'CLM-AMA-260805-002',
    poNumber: 'PO-AMA-260805-002',
    supplier: 'PT Pacific Aviation Components',
    item: 'Hydraulic pump unit',
    reason: 'Document Non-Conformance',
    claimValue: 96_000_000,
    rejectedQuantity: 1,
    notes: 'Dokumen 8130-3 tidak dilampirkan, unit ditahan di gudang karantina.',
    date: '14 Aug 2026',
    status: 'Submitted to Vendor'
  },
  {
    id: 'clm-003',
    claimNumber: 'CLM-AMA-260728-001',
    poNumber: 'PO-AMA-260816-007',
    supplier: 'PT Garuda Engineering Supply',
    item: 'Landing gear bushing set',
    reason: 'Wrong Specification',
    claimValue: 42_500_000,
    rejectedQuantity: 10,
    notes: 'Spesifikasi bushing tidak sesuai PO, menunggu penggantian dari vendor.',
    date: '17 Aug 2026',
    status: 'Replacement in Progress'
  },
  {
    id: 'clm-004',
    claimNumber: 'CLM-AMA-260710-006',
    poNumber: 'PO-AMA-260819-010',
    supplier: 'PT Global Aero Supply',
    item: 'Brake assembly',
    reason: 'Damaged',
    claimValue: 71_000_000,
    rejectedQuantity: 5,
    notes: 'Kerusakan fisik pada kemasan, foto terlampir di sistem inspeksi.',
    date: '20 Aug 2026',
    status: 'Credit Note Issued'
  }
];

// ----------------------------------------------------------------------------
// 12. VENDOR PERFORMANCE
// ----------------------------------------------------------------------------
export const vendorPerformanceRows: VendorPerformanceRow[] = [
  { vendorCode: 'SUP-001', vendor: 'PT Aero Parts Indonesia', onTimeDelivery: 96, leadTimeDays: 14, quality: 95, price: 90, documents: 98, overallScore: 93, avlStatus: 'Approved' },
  { vendorCode: 'SUP-002', vendor: 'PT Aviation Supply Nusantara', onTimeDelivery: 92, leadTimeDays: 6, quality: 93, price: 88, documents: 95, overallScore: 90, avlStatus: 'Approved' },
  { vendorCode: 'SUP-008', vendor: 'PT Global Aero Supply', onTimeDelivery: 88, leadTimeDays: 19, quality: 89, price: 86, documents: 90, overallScore: 87, avlStatus: 'Approved' },
  { vendorCode: 'SUP-006', vendor: 'PT Nusantara Fuel', onTimeDelivery: 84, leadTimeDays: 7, quality: 90, price: 85, documents: 92, overallScore: 86, avlStatus: 'Approved' },
  { vendorCode: 'SUP-004', vendor: 'PT Garuda Engineering Supply', onTimeDelivery: 81, leadTimeDays: 21, quality: 87, price: 83, documents: 88, overallScore: 84, avlStatus: 'Approved' },
  { vendorCode: 'SUP-003', vendor: 'PT Nusantara Ground Services', onTimeDelivery: 79, leadTimeDays: 4, quality: 82, price: 80, documents: 76, overallScore: 82, avlStatus: 'Conditional' },
  { vendorCode: 'SUP-005', vendor: 'PT Pacific Aviation Components', onTimeDelivery: 70, leadTimeDays: 26, quality: 75, price: 79, documents: 70, overallScore: 74, avlStatus: 'Pending Review' },
  { vendorCode: 'SUP-007', vendor: 'PT Tech Aviasi', onTimeDelivery: 58, leadTimeDays: 18, quality: 64, price: 71, documents: 55, overallScore: 61, avlStatus: 'Suspended' }
];

// ----------------------------------------------------------------------------
// 13. APPROVAL & CONTROL
// ----------------------------------------------------------------------------
export const approvalQueue: ApprovalQueueItem[] = [
  { id: 'apq-001', reference: 'PO-AMA-260821-014', type: 'Purchase Order', requester: 'Bayu Saputra', amount: 425_000_000, currentApprover: 'Finance Manager', waitingSince: '21 Aug 2026', waitingDays: 3, status: 'Pending' },
  { id: 'apq-002', reference: 'PO-AMA-260820-009', type: 'Purchase Order', requester: 'Deni Herlambang', amount: 210_000_000, currentApprover: 'Procurement Manager', waitingSince: '20 Aug 2026', waitingDays: 2, status: 'Pending' },
  { id: 'apq-003', reference: 'PR-AMA-260822-018', type: 'Purchase Requisition', requester: 'Bayu Saputra', amount: 185_000_000, currentApprover: 'Department Head', waitingSince: '22 Aug 2026', waitingDays: 1, status: 'Pending' },
  { id: 'apq-004', reference: 'RFQ-AMA-260819-006', type: 'RFQ', requester: 'Rangga Wibowo', amount: 640_000_000, currentApprover: 'Procurement Manager', waitingSince: '19 Aug 2026', waitingDays: 4, status: 'Revision Required' },
  { id: 'apq-005', reference: 'PO-AMA-260818-009', type: 'Purchase Order', requester: 'Wahyu Nugroho', amount: 12_800_000_000, currentApprover: 'Direktur Operasional', waitingSince: '18 Aug 2026', waitingDays: 5, status: 'Pending' },
  { id: 'apq-006', reference: 'PR-AMA-260818-014', type: 'Purchase Requisition', requester: 'Andi Kurniawan', amount: 320_000_000, currentApprover: 'Finance Manager', waitingSince: '18 Aug 2026', waitingDays: 5, status: 'Rejected' }
];

export const approvalAuthorityMatrix: ApprovalAuthorityTier[] = [
  { range: '≤ IDR 50 Million', approver: 'Procurement Manager' },
  { range: 'IDR 50 – 500 Million', approver: 'Director' },
  { range: '> IDR 500 Million', approver: 'Management Approval' }
];

export const threeWayMatchRows: ThreeWayMatchRow[] = [
  { id: 'twm-001', poNumber: 'PO-AMA-260821-014', grNumber: '-', invoiceNumber: '-', supplier: 'PT Aero Parts Indonesia', poAmount: 425_000_000, grAmount: 0, invoiceAmount: 0, status: 'Pending Review' },
  { id: 'twm-002', poNumber: 'PO-AMA-260819-010', grNumber: 'GR-AMA-260819-023', invoiceNumber: 'INV-9982', supplier: 'PT Global Aero Supply', poAmount: 710_000_000, grAmount: 497_000_000, invoiceAmount: 497_000_000, status: 'Matched' },
  { id: 'twm-003', poNumber: 'PO-AMA-260816-007', grNumber: 'GR-AMA-260816-020', invoiceNumber: 'INV-4471', supplier: 'PT Garuda Engineering Supply', poAmount: 725_000_000, grAmount: 290_000_000, invoiceAmount: 305_000_000, status: 'Mismatch' },
  { id: 'twm-004', poNumber: 'PO-AMA-260812-004', grNumber: 'GR-AMA-260818-022', invoiceNumber: 'INV-2280', supplier: 'PT Aviation Supply Nusantara', poAmount: 21_500_000, grAmount: 21_500_000, invoiceAmount: 21_500_000, status: 'Matched' },
  { id: 'twm-005', poNumber: 'PO-AMA-260805-002', grNumber: 'GR-AMA-260814-019', invoiceNumber: 'INV-1187', supplier: 'PT Pacific Aviation Components', poAmount: 96_000_000, grAmount: 0, invoiceAmount: 96_000_000, status: 'Partial Match' }
];

export const auditTrail: AuditLogEntry[] = [
  { timestamp: '22 Aug 2026 14:32', user: 'Andi Procurement', module: 'Purchase Order', reference: 'PO-AMA-260821-014', action: 'Status Changed', previousValue: 'Pending Approval', newValue: 'Approved' },
  { timestamp: '21 Aug 2026 09:14', user: 'Sinta Finance', module: 'Purchase Order', reference: 'PO-AMA-260820-009', action: 'Approval Requested', previousValue: 'Draft', newValue: 'Pending Approval' },
  { timestamp: '20 Aug 2026 16:45', user: 'Rangga Wibowo', module: 'Sourcing', reference: 'RFQ-AMA-260819-006', action: 'Vendor Selected', previousValue: '-', newValue: 'PT Aero Parts Indonesia' },
  { timestamp: '19 Aug 2026 11:02', user: 'Dewi Lestari', module: 'Goods Receipt', reference: 'GR-AMA-260819-023', action: 'Inspection Completed', previousValue: 'Pending Inspection', newValue: 'Partially Accepted' },
  { timestamp: '18 Aug 2026 08:37', user: 'Bayu Saputra', module: 'Purchase Requisition', reference: 'PR-AMA-260822-018', action: 'Submitted for Review', previousValue: 'Draft', newValue: 'Submitted' }
];
