<script setup lang="ts">
import { useDisplay } from 'vuetify';

const rail = useState('ama-sidebar-rail', () => false);
const mobileDrawer = useState('ama-sidebar-mobile-open', () => false);
const { can } = useAuthorization();
const route = useRoute();
const { mdAndUp } = useDisplay();
const { t } = useI18n();

const openedGroups = ref<string[]>([]);

const drawerOpen = computed({
  get: () => mdAndUp.value || mobileDrawer.value,
  set: (value: boolean) => {
    mobileDrawer.value = value;
  }
});

type NavChild = {
  label: string;
  to: string;
  icon: string;
  visible: boolean;
};

type NavItem = {
  label: string;
  to?: string;
  icon: string;
  visible: boolean;
  children?: NavChild[];
};

const masterDataVisible = computed(() => can('platform.module.manage').allowed);
const routeMasterDataVisible = computed(
  () => masterDataVisible.value || can('master_data.read').allowed
);
const financeVisible = computed(
  () => can('finance.invoice.read').allowed || can('finance.accounting.read').allowed
);

const commercialVisible = computed(
  () => masterDataVisible.value || can('commercial.contract.read').allowed
);
const excludedDemoModuleVisible = false;

const navItems = computed<NavItem[]>(() =>
  [
    {
      label: t('nav.dashboard'),
      to: '/dashboard',
      icon: 'mdi-view-dashboard-outline',
      visible: true
    },
    {
      label: 'Capability Preview',
      to: '/capability-preview',
      icon: 'mdi-radar',
      visible: can('capability.preview.read').allowed
    },
    {
      label: t('nav.ops'),
      icon: 'mdi-compass-outline',
      visible:
        can('flight.read').allowed || masterDataVisible.value || routeMasterDataVisible.value,
      children: [
        {
          label: t('nav.overview'),
          to: '/ops',
          icon: 'mdi-view-dashboard-outline',
          visible: can('flight.read').allowed
        },
        {
          label: t('nav.following'),
          to: '/ops/flight-following',
          icon: 'mdi-radar',
          visible: can('flight.read').allowed
        },
        {
          label: t('nav.stations'),
          to: '/master-data/stations',
          icon: 'mdi-airport',
          visible: masterDataVisible.value
        },
        {
          label: t('nav.routes'),
          to: '/master-data/routes',
          icon: 'mdi-map-marker-path',
          visible: routeMasterDataVisible.value
        },
        {
          label: t('nav.scheduleTemplates'),
          to: '/master-data/flight-schedule-templates',
          icon: 'mdi-calendar-clock',
          visible: masterDataVisible.value
        },
        {
          label: t('nav.capacityProfiles'),
          to: '/master-data/flight-capacity-profiles',
          icon: 'mdi-seat-passenger',
          visible: masterDataVisible.value
        },
        {
          label: t('nav.personnel'),
          to: '/master-data/personnel',
          icon: 'mdi-account-group-outline',
          visible: masterDataVisible.value
        },
        {
          label: t('nav.flightReasons'),
          to: '/master-data/flight-reasons',
          icon: 'mdi-alert-circle-outline',
          visible: masterDataVisible.value
        }
      ].filter((child) => child.visible)
    },
    {
      label: t('nav.flightControl'),
      icon: 'mdi-airplane',
      visible: can('flight.read').allowed,
      children: [
        {
          label: t('nav.overview'),
          to: '/flights/dashboard',
          icon: 'mdi-view-dashboard-outline',
          visible: can('flight.read').allowed
        },
        {
          label: t('nav.flights'),
          to: '/flights',
          icon: 'mdi-airplane-marker',
          visible: can('flight.read').allowed
        },
        {
          label: t('nav.flightRequests'),
          to: '/flights/requests',
          icon: 'mdi-clipboard-plus-outline',
          visible: can('flight_request.read').allowed
        },
        {
          label: t('nav.planningReadiness'),
          to: '/flights/readiness',
          icon: 'mdi-clipboard-pulse-outline',
          visible: can('readiness.view').allowed
        },
        {
          label: t('nav.manifestControl'),
          to: '/flights/manifest',
          icon: 'mdi-account-box-multiple-outline',
          visible: can('flight.manifest.view').allowed
        },
        {
          label: t('nav.fuelControl'),
          to: '/flights/fuel',
          icon: 'mdi-fuel',
          visible: can('flight.read').allowed && can('flight.fuel.update').allowed
        },
        {
          label: t('nav.aircraft'),
          icon: 'mdi-airplane',
          to: '/master-data/aircraft',
          visible: masterDataVisible.value
        }
      ].filter((child) => child.visible)
    },
    {
      label: t('nav.stationOperations'),
      icon: 'mdi-airport',
      visible: can('station.task.view').allowed,
      children: [
        {
          label: 'Network Dashboard',
          to: '/flights/station-operations/network',
          icon: 'mdi-chart-box-outline',
          visible: can('station.network_dashboard.view').allowed
        },
        {
          label: t('nav.overview'),
          to: '/flights/station-operations',
          icon: 'mdi-view-dashboard-outline',
          visible: can('station.task.view').allowed
        },
        {
          label: t('nav.flights'),
          to: '/flights/station-operations/flights',
          icon: 'mdi-airplane-marker',
          visible: can('station.task.view').allowed
        },
        {
          label: t('nav.services'),
          to: '/flights/station-operations/services',
          icon: 'mdi-toolbox-outline',
          visible: can('station.task.view').allowed
        },
        {
          label: t('nav.verification'),
          to: '/flights/station-operations/verification',
          icon: 'mdi-clipboard-check-outline',
          visible: can('station.task.view').allowed
        },
        {
          label: t('nav.actualClosure'),
          to: '/flights/station-operations/actual-closure',
          icon: 'mdi-airplane-check',
          visible: can('station.task.view').allowed
        },
        {
          label: t('nav.technicalHandoff'),
          to: '/flights/station-operations/maintenance',
          icon: 'mdi-handshake-outline',
          visible: can('station.task.view').allowed
        },
        {
          label: t('nav.costs'),
          to: '/flights/station-operations/costs',
          icon: 'mdi-cash-multiple',
          visible: can('station.task.view').allowed
        },
        {
          label: t('nav.reports'),
          to: '/flights/station-operations/reports',
          icon: 'mdi-chart-box-outline',
          visible: can('station.task.view').allowed
        },
        {
          label: t('nav.auditTrail'),
          to: '/flights/station-operations/audit',
          icon: 'mdi-history',
          visible: can('station.task.view').allowed
        }
      ].filter((child) => child.visible)
    },
    {
      label: t('nav.commercial'),
      icon: 'mdi-handshake-outline',
      visible: commercialVisible.value,
      children: [
        {
          label: t('nav.customers'),
          to: '/master-data/customers',
          icon: 'mdi-domain',
          visible: masterDataVisible.value
        },
        {
          label: t('nav.agents'),
          to: '/master-data/agents',
          icon: 'mdi-storefront-outline',
          visible: masterDataVisible.value
        },
        {
          label: t('nav.rates'),
          to: '/master-data/rates',
          icon: 'mdi-cash-multiple',
          visible: masterDataVisible.value
        },
        {
          label: t('nav.contractsSubsidies'),
          to: '/marketing/contracts-subsidies',
          icon: 'mdi-file-sign',
          visible: can('commercial.contract.read').allowed || masterDataVisible.value
        }
      ].filter((child) => child.visible)
    },
    {
      label: t('nav.inventory'),
      icon: 'mdi-package-variant-closed',
      visible: can('inventory.read').allowed,
      children: [
        {
          label: t('nav.dashboard'),
          to: '/inventory',
          icon: 'mdi-view-dashboard-outline',
          visible: can('inventory.read').allowed
        },
        {
          label: t('nav.stock'),
          to: '/inventory/stock',
          icon: 'mdi-layers-triple-outline',
          visible: can('inventory.read').allowed
        },
        {
          label: t('nav.parts'),
          to: '/inventory/parts',
          icon: 'mdi-cog-outline',
          visible: can('inventory.read').allowed
        },
        {
          label: t('nav.warehousesBins'),
          to: '/inventory/warehouses',
          icon: 'mdi-warehouse',
          visible: can('inventory.read').allowed
        },
        {
          label: t('nav.purchaseRequests'),
          to: '/inventory/purchase-requests',
          icon: 'mdi-clipboard-text-outline',
          visible: can('inventory.read').allowed
        },
        {
          label: t('nav.purchaseOrders'),
          to: '/inventory/purchase-orders',
          icon: 'mdi-file-sign',
          visible: can('inventory.read').allowed
        },
        {
          label: t('nav.receipts'),
          to: '/inventory/receipts',
          icon: 'mdi-truck-check-outline',
          visible: can('inventory.read').allowed
        },
        {
          label: t('nav.movementsCounts'),
          to: '/inventory/movements',
          icon: 'mdi-swap-horizontal',
          visible: can('inventory.read').allowed
        },
        {
          label: t('nav.repairables'),
          to: '/inventory/repairables',
          icon: 'mdi-wrench-cog-outline',
          visible: can('inventory.read').allowed
        }
      ].filter((child) => child.visible)
    },
    {
      label: t('nav.corporateAssets'),
      icon: 'mdi-toolbox-outline',
      visible: excludedDemoModuleVisible,
      children: [
        {
          label: t('nav.overview'),
          to: '/asset-management/overview',
          icon: 'mdi-view-dashboard-outline',
          visible: excludedDemoModuleVisible
        },
        {
          label: t('nav.assetRegister'),
          to: '/asset-management/register',
          icon: 'mdi-clipboard-list-outline',
          visible: excludedDemoModuleVisible
        },
        {
          label: t('nav.assignments'),
          to: '/asset-management/assignment',
          icon: 'mdi-account-arrow-right-outline',
          visible: can('asset.read').allowed
        },
        {
          label: t('nav.movements'),
          to: '/asset-management/movement',
          icon: 'mdi-swap-horizontal',
          visible: can('asset.read').allowed
        },
        {
          label: t('nav.maintenanceQueue'),
          to: '/asset-management/maintenance',
          icon: 'mdi-wrench-outline',
          visible: can('asset.read').allowed
        },
        {
          label: t('nav.audits'),
          to: '/asset-management/audit',
          icon: 'mdi-clipboard-check-outline',
          visible: can('asset.read').allowed
        },
        {
          label: t('nav.finance'),
          to: '/asset-management/finance',
          icon: 'mdi-calculator-variant-outline',
          visible: can('asset.finance.read').allowed
        }
      ].filter((child) => child.visible)
    },
    {
      label: 'CRM & Marketing',
      icon: 'mdi-account-heart-outline',
      visible: excludedDemoModuleVisible,
      children: [
        {
          label: 'Overview',
          to: '/crm-marketing/dashboard-crm',
          icon: 'mdi-view-dashboard-outline',
          visible: excludedDemoModuleVisible
        },
        {
          label: 'Leads',
          to: '/crm-marketing/leads',
          icon: 'mdi-account-plus-outline',
          visible: excludedDemoModuleVisible
        },
        {
          label: 'Customers',
          to: '/crm-marketing/customers',
          icon: 'mdi-domain',
          visible: excludedDemoModuleVisible
        },
        {
          label: 'Tender',
          to: '/crm-marketing/tender',
          icon: 'mdi-gavel',
          visible: excludedDemoModuleVisible
        },
        {
          label: 'Promotion',
          to: '/crm-marketing/promotion',
          icon: 'mdi-bullhorn-outline',
          visible: excludedDemoModuleVisible
        },
        {
          label: 'Opportunities',
          to: '/crm-marketing/opportunities',
          icon: 'mdi-target',
          visible: excludedDemoModuleVisible
        },
        {
          label: 'Activities',
          to: '/crm-marketing/activities',
          icon: 'mdi-calendar-check-outline',
          visible: excludedDemoModuleVisible
        }
      ].filter((child) => child.visible)
    },
    {
      label: 'Safety (SMS)',
      icon: 'mdi-shield-account-variant-outline',
      visible: true,
      children: [
        {
          label: 'Safety Dashboard',
          to: '/sms/Dashboard', // ➔ Mengarah ke Dashboard.vue
          icon: 'mdi-view-dashboard-variant-outline',
          visible: true
        },
        {
          label: 'Hazard Reporting',
          to: '/sms/Reporting', // ➔ Mengarah ke Reporting.vue
          icon: 'mdi-file-document-edit-outline',
          visible: true
        },
        {
          label: 'Flight Risk (FRAT)',
          to: '/sms/Frat', // ➔ Mengarah ke Frat.vue
          icon: 'mdi-calculator-variant-outline',
          visible: true
        },
        {
          label: 'CAPA Management',
          to: '/sms/Capa', // ➔ Mengarah ke Capa.vue
          icon: 'mdi-clipboard-check-multiple-outline',
          visible: true
        },
        {
          label: 'Emergency & Response',
          to: '/sms/EmergencyResponse', // ➔ Mengarah ke EmergencyResponse.vue
          icon: 'mdi-ambulance',
          visible: true
        },
        {
          label: 'Safety Assurance',
          to: '/sms/SafetyAssurance', // ➔ Mengarah ke SafetyAssurance.vue
          icon: 'mdi-shield-check-outline',
          visible: true
        },
        {
          label: 'SPI & Analytics',
          to: '/sms/SpiAnalytics', // ➔ Kita akan buat file SpiAnalytics.vue
          icon: 'mdi-chart-box-outline',
          visible: true
        },
        {
          label: 'Safety Communication',
          to: '/sms/Communication', // ➔ Mengarah ke Communication.vue
          icon: 'mdi-message-alert-outline',
          visible: true
        }
      ].filter((child) => child.visible)
    },
    {
      label: t('nav.ticketing'),
      icon: 'mdi-ticket-confirmation-outline',
      visible: excludedDemoModuleVisible,
      children: [
        {
          label: t('nav.passengerSalesCheckIn'),
          to: '/ticketing/passenger',
          icon: 'mdi-account-multiple-outline',
          visible: excludedDemoModuleVisible
        },
        {
          label: t('nav.cargoTracking'),
          to: '/ticketing/cargo',
          icon: 'mdi-package-variant',
          visible: excludedDemoModuleVisible
        },
        {
          label: t('nav.salesManagement'),
          to: '/ticketing/management',
          icon: 'mdi-store-cog-outline',
          visible: masterDataVisible.value
        },
        {
          label: t('nav.operationalLedger'),
          to: '/ticketing/finance',
          icon: 'mdi-cash-register',
          visible: excludedDemoModuleVisible
        }
      ].filter((child) => child.visible)
    },
    {
      label: t('nav.finance'),
      icon: 'mdi-finance',
      visible: financeVisible.value,
      children: [
        {
          label: t('nav.overview'),
          to: '/finance/dashboard',
          icon: 'mdi-view-dashboard-outline',
          visible: can('finance.accounting.read').allowed
        },
        {
          label: t('nav.invoices'),
          to: '/invoices',
          icon: 'mdi-file-document-outline',
          visible: can('finance.invoice.read').allowed
        },
        {
          label: t('nav.financeHandoffs'),
          to: '/finance/handoffs',
          icon: 'mdi-inbox-arrow-down-outline',
          visible: can('finance.accounting.read').allowed
        },
        {
          label: t('nav.accountsReceivable'),
          to: '/finance/receivables',
          icon: 'mdi-account-cash-outline',
          visible: can('finance.accounting.read').allowed
        },
        {
          label: t('nav.accountsPayable'),
          to: '/finance/payables',
          icon: 'mdi-file-document-arrow-right-outline',
          visible: can('finance.accounting.read').allowed
        },
        {
          label: t('nav.cashBank'),
          to: '/finance/cash-bank',
          icon: 'mdi-bank-outline',
          visible: can('finance.accounting.read').allowed
        },
        {
          label: t('nav.bankReconciliation'),
          to: '/finance/reconciliation',
          icon: 'mdi-bank-check',
          visible: can('finance.accounting.read').allowed
        },
        {
          label: t('nav.accountingWorkbench'),
          to: '/finance/accounting',
          icon: 'mdi-book-open-page-variant-outline',
          visible: can('finance.accounting.read').allowed
        },
        {
          label: t('nav.trialBalance'),
          to: '/finance/trial-balance',
          icon: 'mdi-scale-balance',
          visible: can('finance.accounting.read').allowed
        },
        {
          label: t('nav.periodClosing'),
          to: '/finance/closing',
          icon: 'mdi-lock-clock',
          visible: can('finance.accounting.read').allowed
        },
        {
          label: t('nav.financialStatements'),
          to: '/finance/statements',
          icon: 'mdi-file-chart-outline',
          visible: can('finance.accounting.read').allowed
        },
        {
          label: t('nav.aviationProfitability'),
          to: '/finance/hpp',
          icon: 'mdi-chart-bar-stacked',
          visible: can('finance.accounting.read').allowed
        },
        {
          label: t('nav.financeAudit'),
          to: '/finance/audit',
          icon: 'mdi-shield-search',
          visible: can('finance.accounting.read').allowed
        }
      ].filter((child) => child.visible)
    },
    {
      label: t('nav.masterData'),
      icon: 'mdi-database-cog-outline',
      visible: masterDataVisible.value,
      children: [
        {
          label: t('nav.vendors'),
          to: '/master-data/vendors',
          icon: 'mdi-truck-outline',
          visible: masterDataVisible.value
        },
        {
          label: t('nav.fuelSuppliers'),
          to: '/master-data/fuel-suppliers',
          icon: 'mdi-fuel',
          visible: masterDataVisible.value
        },
        {
          label: t('nav.handlingParking'),
          to: '/master-data/handling-parking-suppliers',
          icon: 'mdi-warehouse',
          visible: masterDataVisible.value
        },
        {
          label: t('nav.costCategories'),
          to: '/master-data/cost-categories',
          icon: 'mdi-shape-outline',
          visible: masterDataVisible.value
        },
        {
          label: t('nav.chartOfAccounts'),
          to: '/master-data/chart-of-accounts',
          icon: 'mdi-file-tree-outline',
          visible: masterDataVisible.value
        },
        {
          label: t('nav.taxCodes'),
          to: '/master-data/tax-codes',
          icon: 'mdi-percent-outline',
          visible: masterDataVisible.value
        },
        {
          label: t('nav.paymentTerms'),
          to: '/master-data/payment-terms',
          icon: 'mdi-calendar-clock',
          visible: masterDataVisible.value
        },
        {
          label: t('nav.currencies'),
          to: '/master-data/currencies',
          icon: 'mdi-currency-usd',
          visible: masterDataVisible.value
        }
      ].filter((child) => child.visible)
    },
    {
      label: t('nav.cargo'),
      icon: 'mdi-package-variant',
      visible: masterDataVisible.value,
      children: [
        {
          label: t('nav.dgCategories'),
          to: '/master-data/dg-categories',
          icon: 'mdi-package-variant-closed',
          visible: masterDataVisible.value
        }
      ].filter((child) => child.visible)
    },
    {
      label: t('nav.hris'),
      icon: 'mdi-account-tie',
      visible: excludedDemoModuleVisible,
      children: [
        {
          label: t('nav.dashboard'),
          to: '/hris',
          icon: 'mdi-view-dashboard-outline',
          visible: can('hris.employee.read').allowed
        },
        {
          label: t('nav.hrisEmployees'),
          to: '/hris/employees',
          icon: 'mdi-account-group-outline',
          visible: can('hris.employee.read').allowed
        },
        {
          label: t('nav.organization'),
          to: '/hris/organization',
          icon: 'mdi-sitemap-outline',
          visible: can('hris.org.read').allowed
        },
        {
          label: t('nav.certifications'),
          to: '/hris/certifications',
          icon: 'mdi-certificate-outline',
          visible: can('hris.certification.read').allowed
        },
        {
          label: t('nav.attendance'),
          to: '/hris/attendance',
          icon: 'mdi-clock-check-outline',
          visible: can('hris.attendance.read').allowed
        },
        {
          label: t('nav.leave'),
          to: '/hris/leave',
          icon: 'mdi-calendar-account-outline',
          visible: can('hris.leave.read').allowed
        },
        {
          label: t('nav.overtime'),
          to: '/hris/overtime',
          icon: 'mdi-clock-plus-outline',
          visible: can('hris.leave.read').allowed
        },
        {
          label: t('nav.schedulesRoster'),
          to: '/hris/schedules',
          icon: 'mdi-calendar-clock',
          visible: can('hris.schedule.read').allowed
        },
        {
          label: t('nav.payroll'),
          to: '/hris/payroll',
          icon: 'mdi-cash-multiple',
          visible: can('hris.payroll.read').allowed
        },
        {
          label: t('nav.recruitment'),
          to: '/hris/recruitment',
          icon: 'mdi-account-plus-outline',
          visible: can('hris.recruitment.manage').allowed
        },
        {
          label: t('nav.careerPortal'),
          to: '/careers',
          icon: 'mdi-briefcase-search-outline',
          visible: excludedDemoModuleVisible
        },
        {
          label: t('nav.kpi'),
          to: '/hris/kpi',
          icon: 'mdi-chart-line',
          visible: can('hris.kpi.read').allowed
        },
        {
          label: t('nav.employeePortal'),
          to: '/hris/portal',
          icon: 'mdi-account-circle-outline',
          visible: can('hris.self_service.read').allowed
        }
      ].filter((child) => child.visible)
    },
    {
      label: 'Maintenance Pesawat',
      icon: 'mdi-airplane-cog',
      visible: can('maintenance.package.read').allowed,
      children: [
        {
          label: 'Ringkasan Maintenance',
          to: '/maintenance',
          icon: 'mdi-view-dashboard-outline',
          visible: can('maintenance.package.read').allowed
        },
        {
          label: 'Pekerjaan Saya',
          to: '/maintenance/my-work',
          icon: 'mdi-account-hard-hat',
          visible: can('maintenance.package.read').allowed
        },
        {
          label: 'Pesawat',
          to: '/maintenance/aircraft',
          icon: 'mdi-airplane-check',
          visible: can('maintenance.package.read').allowed
        },
        {
          label: 'Temuan',
          to: '/maintenance/defects',
          icon: 'mdi-alert-octagon-outline',
          visible: can('maintenance.package.read').allowed
        },
        {
          label: 'Paket Pekerjaan',
          to: '/maintenance/work-packages',
          icon: 'mdi-clipboard-list-outline',
          visible: can('maintenance.package.read').allowed
        },
        {
          label: t('nav.flightHandoffs'),
          to: '/maintenance/flight-handoffs',
          icon: 'mdi-handshake-outline',
          visible: can('maintenance.package.read').allowed
        },
        {
          label: 'Data Perawatan Terkendali',
          to: '/maintenance/approved-data',
          icon: 'mdi-file-certificate-outline',
          visible: can('maintenance.approved_data.read').allowed
        },
        {
          label: 'Jatuh Tempo Perawatan',
          to: '/maintenance/due-control',
          icon: 'mdi-calendar-alert',
          visible: can('maintenance.due.read').allowed
        },
        {
          label: 'Timeline Hangar',
          to: '/maintenance/facility-planning',
          icon: 'mdi-calendar-clock',
          visible: can('maintenance.package.read').allowed
        },
        {
          label: t('nav.facilityOperations'),
          to: '/maintenance/facility-operations',
          icon: 'mdi-garage-variant',
          visible: can('maintenance.package.read').allowed
        },
        {
          label: 'Simulasi Quality & Safety',
          to: '/maintenance/quality',
          icon: 'mdi-shield-check-outline',
          visible: can('maintenance.quality.read').allowed
        },
        {
          label: 'Rilis Teknis',
          to: '/maintenance/releases',
          icon: 'mdi-certificate-outline',
          visible: can('maintenance.package.read').allowed
        },
        {
          label: 'Riwayat Aktivitas',
          to: '/maintenance/records',
          icon: 'mdi-history',
          visible: can('maintenance.audit.read').allowed
        }
      ].filter((child) => child.visible)
    },
    {
      label: t('nav.uploads'),
      to: '/uploads',
      icon: 'mdi-file-upload-outline',
      visible: excludedDemoModuleVisible
    },
    {
      label: t('nav.access'),
      to: '/admin/access-demo',
      icon: 'mdi-shield-account-outline',
      visible: can('platform.module.manage').allowed
    }
  ].filter((item) => item.visible && (item.to || item.children?.length))
);

const isActiveTop = (to: string) => route.path === to || route.path.startsWith(`${to}/`);

const flightModulePaths = [
  '/flights/requests',
  '/flights/readiness',
  '/flights/manifest',
  '/flights/fuel',
  '/flights/station-operations',
  '/flights/actual-closure',
  '/flights/maintenance'
];

function isActiveChild(to: string) {
  if (to === '/maintenance') return route.path === '/maintenance';
  if (to !== '/flights') return isActiveTop(to);
  if (route.path === '/flights') return true;
  return route.path.startsWith('/flights/') && !flightModulePaths.some((path) => isActiveTop(path));
}

function groupKey(item: NavItem) {
  return `nav-${item.label.toLowerCase().replaceAll(' ', '-')}`;
}

function isActiveGroup(item: NavItem) {
  return item.children?.some((child) => isActiveChild(child.to)) ?? false;
}

function firstChildPath(item: NavItem) {
  return item.children?.[0]?.to ?? item.to ?? '/dashboard';
}

watch(
  () => route.path,
  () => {
    const nextGroups = new Set(openedGroups.value);
    for (const item of navItems.value) {
      if (!item.children?.length) continue;
      const key = groupKey(item);
      if (isActiveGroup(item)) {
        nextGroups.add(key);
      }
    }
    openedGroups.value = [...nextGroups];
  },
  { immediate: true }
);

function toggleRail() {
  rail.value = !rail.value;
}

function closeMobileOnNavigate() {
  if (!mdAndUp.value) {
    mobileDrawer.value = false;
  }
}
</script>

<template>
  <VNavigationDrawer
    v-model="drawerOpen"
    border
    class="bg-surface"
    color="surface"
    :permanent="mdAndUp"
    :rail="mdAndUp && rail"
    rail-width="72"
    :temporary="!mdAndUp"
    width="272"
  >
    <div class="flex flex-col">
      <div
        :class="
          rail
            ? 'flex min-h-23 flex-col items-center justify-center gap-1 px-2'
            : 'flex min-h-18 items-center gap-3 px-4'
        "
      >
        <NuxtLink
          :class="
            rail
              ? 'grid h-10 w-10 place-items-center text-decoration-none'
              : 'flex min-w-0 flex-1 items-center gap-3 text-decoration-none'
          "
          to="/dashboard"
          @click="closeMobileOnNavigate"
        >
          <div class="rounded-lg overflow-hidden">
            <VImg :width="68" cover src="https://amapapua.com/files/ama-pt-logo-shaded4.png" />
          </div>
          <div v-if="!rail" class="min-w-0">
            <div class="text-lg font-bold leading-5 text-brand-primary">AMA</div>
            <div class="text-xs font-semibold uppercase tracking-normal text-text-secondary">
              Ops Interface
            </div>
          </div>
        </NuxtLink>

        <VBtn
          v-if="mdAndUp"
          :aria-label="rail ? t('actions.expandNavigation') : t('actions.minimizeNavigation')"
          :icon="rail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
          density="comfortable"
          size="small"
          variant="tonal"
          @click="toggleRail"
        />
      </div>

      <VDivider />

      <VList v-model:opened="openedGroups" class="px-2 py-4 nav-list" density="comfortable" nav>
        <template v-for="item in navItems" :key="item.to ?? item.label">
          <!-- Item WITH children -->
          <VListGroup v-if="item.children?.length && !(mdAndUp && rail)" :value="groupKey(item)">
            <template #activator="{ props, isOpen }">
              <VListItem
                v-bind="props"
                class="nav-item mb-1"
                color="primary"
                :prepend-icon="item.icon"
                rounded="lg"
                :title="item.label"
              >
                <template #append>
                  <VIcon
                    class="transition-transform"
                    :class="{ 'rotate-180': isOpen }"
                    icon="mdi-chevron-down"
                    size="18"
                  />
                </template>
              </VListItem>
            </template>

            <VListItem
              v-for="child in item.children"
              :key="child.to"
              :active="isActiveChild(child.to)"
              class="nav-item nav-child mb-1"
              color="primary"
              :prepend-icon="child.icon"
              rounded="lg"
              :title="child.label"
              :to="child.to"
              @click="closeMobileOnNavigate"
            />
          </VListGroup>

          <!-- Item WITHOUT children (or collapsed rail: fall back to first child link) -->
          <VListItem
            v-else-if="item.to"
            :active="isActiveTop(item.to)"
            class="nav-item mb-1"
            color="primary"
            :prepend-icon="item.icon"
            rounded="lg"
            :title="item.label"
            :to="item.to"
            @click="closeMobileOnNavigate"
          />
          <VListItem
            v-else-if="item.children?.length"
            :active="isActiveGroup(item)"
            class="nav-item mb-1"
            color="primary"
            :prepend-icon="item.icon"
            rounded="lg"
            :title="item.label"
            :to="firstChildPath(item)"
            @click="closeMobileOnNavigate"
          />
        </template>
      </VList>

      <div class="mt-auto border-t border-border-default p-3">
        <VBtn
          :aria-label="rail ? 'Switch demo account' : undefined"
          block
          color="primary"
          :icon="rail ? 'mdi-logout-variant' : undefined"
          :prepend-icon="rail ? undefined : 'mdi-logout-variant'"
          variant="tonal"
          @click="useDemoSession().logout()"
        >
          <span v-if="!rail">Switch demo account</span>
        </VBtn>
      </div>
    </div>
  </VNavigationDrawer>
</template>

<style scoped>
.nav-item {
  transition: background-color 0.15s ease;
}

.nav-child {
  margin-left: 8px;
}

.rotate-180 {
  transform: rotate(180deg);
}

/* --- MODIFIKASI SCROLLBAR --- */

/* 1. Untuk Chrome, Safari, dan Edge (Webkit) */
:deep(.v-navigation-drawer__content::-webkit-scrollbar) {
  width: 6px;
}

:deep(.v-navigation-drawer__content::-webkit-scrollbar-track) {
  background: transparent;
}

:deep(.v-navigation-drawer__content::-webkit-scrollbar-thumb) {
  background-color: #607d8b;
  border-radius: 20px;
  border: 1px solid transparent;
}

:deep(.v-navigation-drawer__content::-webkit-scrollbar-thumb:hover) {
  background-color: #455a64;
}

/* 2. Untuk Firefox */
:deep(.v-navigation-drawer__content) {
  scrollbar-width: thin;
  scrollbar-color: #607d8b transparent;
}
</style>
