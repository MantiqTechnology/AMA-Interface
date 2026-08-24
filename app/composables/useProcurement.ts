// ============================================================================
// composables/useProcurement.ts
// Thin reactive wrapper around data/procurement.ts.
//
// Everything here is CLIENT-SIDE STATE ONLY — there is no backend call.
// `refreshOverview()` simulates a network round trip (short delay + tiny
// random variance on the KPI numbers) purely so the demo "feels" live when
// the user presses the Refresh button. `simulateAction()` is used by every
// page to fake Approve / Reject / Send to Vendor / Receive / Return / Match
// actions: it just flips a status in local state and raises a snackbar.
// ============================================================================

import * as procurementData from '../data/procurement';
import type { POStatus, PRStatus, ApprovalStatus } from '../types/procurement';

export interface ProcurementSnackbar {
  show: boolean;
  text: string;
  color: 'success' | 'error' | 'info' | 'warning';
}

// Shared (module-scoped) snackbar state so any component can trigger a toast
// without prop-drilling.
const snackbar = reactive<ProcurementSnackbar>({
  show: false,
  text: '',
  color: 'success'
});

function notify(text: string, color: ProcurementSnackbar['color'] = 'success') {
  snackbar.text = text;
  snackbar.color = color;
  snackbar.show = true;
}

export function useProcurementSnackbar() {
  return { snackbar, notify };
}

// ----------------------------------------------------------------------------
// Overview data + refresh simulation
// ----------------------------------------------------------------------------
export function useProcurementOverview() {
  const isRefreshing = ref(false);
  const lastUpdated = ref('23 Aug 2026, 14:20');

  const kpis = ref(structuredClone(procurementData.overviewKpis));
  const pipeline = ref(structuredClone(procurementData.poPipeline));

  async function refresh() {
    isRefreshing.value = true;
    await new Promise((resolve) => setTimeout(resolve, 700));

    // Nudge a couple of numbers slightly so the refresh feels alive, without
    // drifting away from the reference values by more than +/-2.
    kpis.value = structuredClone(procurementData.overviewKpis).map((kpi) => {
      const numeric = Number(kpi.value.replace(/[^\d]/g, ''));
      if (Number.isNaN(numeric)) return kpi;
      const jitter = Math.floor(Math.random() * 3) - 1;
      return { ...kpi, value: String(Math.max(0, numeric + jitter)) };
    });

    const now = new Date();
    lastUpdated.value = now.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    isRefreshing.value = false;
    notify('Procurement overview data refreshed.', 'info');
  }

  return {
    isRefreshing,
    lastUpdated,
    kpis,
    pipeline,
    pendingApprovalItems: procurementData.pendingApprovalItems,
    poBottleneckCount: procurementData.poBottleneckCount,
    topVendorScores: procurementData.topVendorScores,
    aslCertificateStatus: procurementData.aslCertificateStatus,
    totalAvlVendors: procurementData.totalAvlVendors,
    certificatesExpiringSoon: procurementData.certificatesExpiringSoon,
    leadTimeByCategory: procurementData.leadTimeByCategory,
    deliveryPerformance: procurementData.deliveryPerformance,
    totalDeliveriesThisWeek: procurementData.totalDeliveriesThisWeek,
    overdueDeliveriesCount: procurementData.overdueDeliveriesCount,
    totalSpendThisYear: procurementData.totalSpendThisYear,
    totalBudgetThisYear: procurementData.totalBudgetThisYear,
    budgetUtilizationPercent: procurementData.budgetUtilizationPercent,
    spendByCategory: procurementData.spendByCategory,
    topVendorSpend: procurementData.topVendorSpend,
    recentActivity: procurementData.recentActivity,
    attentionQueue: procurementData.attentionQueue,
    refresh
  };
}

// ----------------------------------------------------------------------------
// Generic "simulate an action" helper used by every sub-page.
// Mutates a status field locally and fires a toast — no network involved.
// ----------------------------------------------------------------------------
export function useProcurementActions() {
  function simulateAction<T extends Record<string, any>>(
    row: T,
    field: keyof T,
    nextValue: T[keyof T],
    message: string
  ) {
    row[field] = nextValue;
    notify(message, 'success');
  }

  function approvePO(row: { poNumber: string; status: POStatus }) {
    row.status = 'Approved';
    notify(`${row.poNumber} approved successfully.`, 'success');
  }

  function rejectPO(row: { poNumber: string; status: POStatus }) {
    row.status = 'Cancelled';
    notify(`${row.poNumber} was rejected.`, 'error');
  }

  function sendToVendor(row: { poNumber: string; status: POStatus }) {
    row.status = 'Sent to Vendor';
    notify(`${row.poNumber} sent to vendor.`, 'success');
  }

  function approvePR(row: { prNumber: string; status: PRStatus }) {
    row.status = 'Approved';
    notify(`${row.prNumber} approved successfully.`, 'success');
  }

  function rejectPR(row: { prNumber: string; status: PRStatus }) {
    row.status = 'Rejected';
    notify(`${row.prNumber} was rejected.`, 'error');
  }

  function approveQueueItem(row: { reference: string; status: ApprovalStatus }) {
    row.status = 'Approved';
    notify(`${row.reference} approved successfully.`, 'success');
  }

  function rejectQueueItem(row: { reference: string; status: ApprovalStatus }) {
    row.status = 'Rejected';
    notify(`${row.reference} was rejected.`, 'error');
  }

  return {
    simulateAction,
    approvePO,
    rejectPO,
    sendToVendor,
    approvePR,
    rejectPR,
    approveQueueItem,
    rejectQueueItem
  };
}

// ----------------------------------------------------------------------------
// Formatting helpers shared across the module
// ----------------------------------------------------------------------------
export function formatIDR(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `IDR ${(amount / 1_000_000_000).toFixed(2)} B`;
  }
  if (amount >= 1_000_000) {
    return `IDR ${(amount / 1_000_000).toFixed(0)} M`;
  }
  return `IDR ${amount.toLocaleString('id-ID')}`;
}

export function formatIDRFull(amount: number): string {
  return `IDR ${amount.toLocaleString('id-ID')}`;
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    Draft: '#9CA3AF',
    Submitted: '#3B5BFF',
    'Under Review': '#3B5BFF',
    'Pending Approval': '#F5A623',
    Pending: '#F5A623',
    'Pending Review': '#F5A623',
    'Pending Inspection': '#F5A623',
    Approved: '#22B07D',
    Active: '#22B07D',
    Accepted: '#22B07D',
    Matched: '#22B07D',
    Completed: '#22B07D',
    Resolved: '#22B07D',
    'Credit Note Issued': '#22B07D',
    'Sent to Vendor': '#3B5BFF',
    'Partially Received': '#3B5BFF',
    'Partially Accepted': '#F5A623',
    'Partial Match': '#F5A623',
    'Replacement in Progress': '#3B5BFF',
    Evaluation: '#3B5BFF',
    'Quotation Received': '#3B5BFF',
    'Invitation Sent': '#3B5BFF',
    Awarded: '#22B07D',
    Rejected: '#E5484D',
    Cancelled: '#E5484D',
    Mismatch: '#E5484D',
    Overdue: '#E5484D',
    Suspended: '#E5484D',
    Conditional: '#F5A623',
    Open: '#E5484D',
    'Submitted to Vendor': '#3B5BFF',
    'Revision Required': '#F5A623',
    Converted: '#22B07D',
    Inactive: '#9CA3AF'
  };
  return map[status] ?? '#9CA3AF';
}

export function priorityColor(priority: string): string {
  const map: Record<string, string> = {
    Low: 'grey',
    Medium: 'blue',
    High: 'amber-darken-2',
    Urgent: 'red'
  };
  return map[priority] ?? 'grey';
}

export function severityColor(severity: 'high' | 'medium' | 'low'): string {
  return { high: 'red', medium: 'amber-darken-2', low: 'blue' }[severity];
}
