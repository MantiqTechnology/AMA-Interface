export type POStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Sent to Vendor'
  | 'Partially Received'
  | 'Completed'
  | 'Closed'
  | 'Cancelled';

export type PRStatus =
  'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Converted';

export type PRPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type SourcingType = 'RFQ' | 'Direct Purchase' | 'Tender' | 'Emergency Procurement';
export type SourcingStatus =
  'Draft' | 'Invitation Sent' | 'Quotation Received' | 'Evaluation' | 'Awarded' | 'Cancelled';

export type AvlStatus = 'Approved' | 'Conditional' | 'Pending Review' | 'Suspended';

export type InspectionStatus =
  'Pending Inspection' | 'Accepted' | 'Partially Accepted' | 'Rejected';

export type ClaimReason =
  | 'Damaged'
  | 'Wrong Item'
  | 'Wrong Specification'
  | 'Short Quantity'
  | 'Warranty Claim'
  | 'Document Non-Conformance';

export type ClaimStatus =
  | 'Open'
  | 'Submitted to Vendor'
  | 'Under Review'
  | 'Credit Note Issued'
  | 'Replacement in Progress'
  | 'Resolved';

export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected' | 'Revision Required';
export type MatchStatus = 'Matched' | 'Partial Match' | 'Mismatch' | 'Pending Review';

export type ProcurementCategory =
  | 'Aircraft Spare Parts'
  | 'Rotables'
  | 'Consumables'
  | 'Fuel'
  | 'Ground Handling'
  | 'Maintenance Services'
  | 'General Goods & Services';

export interface KpiTrend {
  label: string;
  direction: 'up' | 'down' | 'flat';
  tone: 'positive' | 'negative' | 'neutral';
}

export interface OverviewKpi {
  id: string;
  label: string;
  value: string;
  icon: string;
  iconColor: string;
  trend?: KpiTrend;
}

export interface PipelineStage {
  status: POStatus;
  count: number;
  icon: string;
  color: string;
}

export interface PendingApprovalItem {
  poNumber: string;
  supplier: string;
  amount: number;
  submittedDate: string;
  pendingDays: number;
  currentApprover: string;
}

export interface VendorScore {
  vendorCode: string;
  vendor: string;
  onTimeDelivery: number;
  quality: number;
  priceCompetitiveness: number;
  overallScore: number;
  rating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}

export interface AslSegment {
  label: string;
  value: number;
  percent: number;
  color: string;
}

export interface LeadTimeCategory {
  category: ProcurementCategory;
  averageDays: number;
  targetDays: number;
}

export interface DeliverySegment {
  label: string;
  value: number;
  percent: number;
  color: string;
}

export interface SpendCategoryBreakdown {
  category: ProcurementCategory;
  amount: number;
  percent: number;
  color: string;
}

export interface VendorSpend {
  vendor: string;
  amount: number;
}

export interface AttentionItem {
  id: string;
  category:
    | 'Approval Bottleneck'
    | 'Delivery Overdue'
    | 'Certificate Expiring'
    | 'Budget Review'
    | 'Three-Way Match Exception'
    | 'Vendor Claim';
  reference: string;
  description: string;
  meta: string;
  severity: 'high' | 'medium' | 'low';
}

export interface RecentActivity {
  reference: string;
  type: 'Purchase Requisition' | 'Purchase Order' | 'RFQ' | 'Goods Receipt';
  counterparty: string;
  amount: number;
  date: string;
  status: string;
}

export interface Supplier {
  id: string;
  vendorCode: string;
  company: string;
  category: ProcurementCategory;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  leadTimeDays: number;
  avlStatus: AvlStatus;
  performanceScore: number;
  certificateName: string;
  certificateExpiry: string;
  businessLicense: string;
  paymentTerms: string;
  status: 'Active' | 'Inactive';
  address: string;
  procurementHistoryCount: number;
  totalSpend: number;
}

export interface PurchaseRequisitionItem {
  name: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice: number;
}

export interface PurchaseRequisition {
  id: string;
  prNumber: string;
  date: string;
  requester: string;
  department: string;
  itemService: string;
  items: PurchaseRequisitionItem[];
  estimatedValue: number;
  requiredDate: string;
  priority: PRPriority;
  status: PRStatus;
  budgetCheck: 'Available' | 'Over Budget' | 'Needs Review';
  nextAction: string;
}

export interface QuotationEntry {
  vendor: string;
  quotedPrice: number;
  leadTimeDays: number;
  paymentTerms: string;
  warranty: string;
  documentCompliance: 'Complete' | 'Partial' | 'Incomplete';
  score: number;
  selected?: boolean;
}

export interface SourcingEvent {
  id: string;
  reference: string;
  sourcePr: string;
  type: SourcingType;
  itemService: string;
  invitedVendors: number;
  deadline: string;
  lowestQuote: number;
  status: SourcingStatus;
  quotations: QuotationEntry[];
}

export interface DeliveryProgress {
  ordered: number;
  received: number;
  outstanding: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: string;
  sourcePr: string;
  category: ProcurementCategory;
  poDate: string;
  totalAmount: number;
  expectedDelivery: string;
  delivery: DeliveryProgress;
  status: POStatus;
  isOverdue: boolean;
}

export interface GoodsReceipt {
  id: string;
  grNumber: string;
  poNumber: string;
  supplier: string;
  receivedDate: string;
  item: string;
  quantity: number;
  inspection: InspectionStatus;
  documents: ('Form 1' | '8130-3' | 'CoC')[];
  status: 'Accepted' | 'Partially Accepted' | 'Rejected' | 'Pending Inspection';
}

export interface VendorClaim {
  id: string;
  claimNumber: string;
  poNumber: string;
  supplier: string;
  item: string;
  reason: ClaimReason;
  claimValue: number;
  rejectedQuantity: number;
  notes?: string;
  date: string;
  status: ClaimStatus;
}

export interface VendorPerformanceRow {
  vendorCode: string;
  vendor: string;
  onTimeDelivery: number;
  leadTimeDays: number;
  quality: number;
  price: number;
  documents: number;
  overallScore: number;
  avlStatus: AvlStatus;
}

export interface ApprovalQueueItem {
  id: string;
  reference: string;
  type: 'Purchase Requisition' | 'Purchase Order' | 'RFQ';
  requester: string;
  amount: number;
  currentApprover: string;
  waitingSince: string;
  waitingDays: number;
  status: ApprovalStatus;
}

export interface ApprovalAuthorityTier {
  range: string;
  approver: string;
}

export interface ThreeWayMatchRow {
  id: string;
  poNumber: string;
  grNumber: string;
  invoiceNumber: string;
  supplier: string;
  poAmount: number;
  grAmount: number;
  invoiceAmount: number;
  status: MatchStatus;
}

export interface AuditLogEntry {
  timestamp: string;
  user: string;
  module: string;
  reference: string;
  action: string;
  previousValue: string;
  newValue: string;
}
