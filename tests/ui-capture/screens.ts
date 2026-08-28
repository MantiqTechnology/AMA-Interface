import type { Page } from '@playwright/test';

export type UiCaptureRole =
  | 'Certifying Staff'
  | 'Demo Admin'
  | 'Director'
  | 'Finance Reviewer'
  | 'Inventory Controller'
  | 'Maintenance Manager'
  | 'OCC'
  | 'Station Admin';

export interface UiScreenDefinition {
  id: string;
  path: string;
  ready: {
    heading: string | RegExp;
    level?: number;
  };
  roles?: UiCaptureRole[];
  prepare?: (page: Page) => Promise<void>;
}

const seedDate = process.env.DEMO_SEED_DATE ?? '2026-07-17';

export const uiScreens: UiScreenDefinition[] = [
  {
    id: 'operations-dashboard',
    path: '/dashboard',
    ready: { heading: 'PT AMA Aviation Dashboard', level: 1 },
    roles: ['Demo Admin']
  },
  {
    id: 'ops-overview-dashboard',
    path: `/ops?period=TODAY&anchorDate=${seedDate}`,
    ready: { heading: 'Ops Overview', level: 1 },
    roles: ['OCC']
  },
  {
    id: 'flight-control-overview-dashboard',
    path: `/flights/dashboard?period=TODAY&anchorDate=${seedDate}`,
    ready: { heading: 'Flight Control Overview', level: 1 },
    roles: ['OCC']
  },
  {
    id: 'demo-access-personas',
    path: '/admin/access-demo',
    ready: { heading: 'Access Demo', level: 1 },
    roles: ['Demo Admin']
  },
  {
    id: 'station-operations-board',
    path: `/flights/station-operations?stationCode=WMX&date=${seedDate}`,
    ready: { heading: 'Station Operations' },
    roles: ['Station Admin']
  },
  {
    id: 'station-operations-verification',
    path: `/flights/station-operations/verification?stationCode=WMX&date=${seedDate}`,
    ready: { heading: 'Verifikasi operasional', level: 2 },
    roles: ['Station Admin']
  },
  {
    id: 'station-operations-actual-closure',
    path: `/flights/station-operations/actual-closure?stationCode=WMX&date=${seedDate}`,
    ready: { heading: 'Actual & Closure Station', level: 2 },
    roles: ['Station Admin']
  },
  {
    id: 'station-operations-technical-handoff',
    path: `/flights/station-operations/maintenance?stationCode=WMX&date=${seedDate}`,
    ready: { heading: 'Temuan Teknis & Handoff MRO', level: 2 },
    roles: ['Station Admin']
  },
  {
    id: 'accounting-workbench-posting-queue',
    path: '/finance/accounting',
    ready: { heading: 'Accounting Workbench', level: 1 },
    roles: ['Finance Reviewer']
  },
  {
    id: 'accounting-workbench-policies',
    path: '/finance/accounting?tab=policies',
    ready: { heading: 'Accounting Workbench', level: 1 },
    roles: ['Finance Reviewer'],
    prepare: async (page) => {
      await page.getByRole('tab', { name: 'Policies' }).click();
      await page.getByRole('heading', { name: 'Accounting Policies' }).waitFor();
    }
  },
  {
    id: 'corporate-assets-overview',
    path: '/asset-management/overview',
    ready: { heading: 'Asset Control Overview', level: 1 },
    roles: ['Demo Admin']
  },
  {
    id: 'corporate-assets-register',
    path: '/asset-management/register',
    ready: { heading: 'Asset Register', level: 1 },
    roles: ['Demo Admin', 'Station Admin']
  },
  {
    id: 'corporate-asset-detail-overview',
    path: '/asset-management/assets/asset-gse-gpu-01',
    ready: { heading: 'Ground Power Unit GPU-01', level: 1 },
    roles: ['Demo Admin', 'Maintenance Manager']
  },
  {
    id: 'corporate-asset-detail-maintenance',
    path: '/asset-management/assets/asset-gse-gpu-01',
    ready: { heading: 'Ground Power Unit GPU-01', level: 1 },
    roles: ['Maintenance Manager'],
    prepare: async (page) => {
      await page.getByRole('tab', { name: 'Maintenance' }).click();
      await page.getByRole('button', { name: 'Request parts' }).first().waitFor();
    }
  },
  {
    id: 'inventory-control-center',
    path: '/inventory',
    ready: { heading: 'Pusat Kendali Inventory', level: 1 },
    roles: ['Demo Admin']
  },
  {
    id: 'inventory-maintenance-demand',
    path: '/inventory/maintenance-demand',
    ready: { heading: 'Kebutuhan Material MRO', level: 1 },
    roles: ['Inventory Controller']
  },
  {
    id: 'inventory-stock-availability',
    path: '/inventory/stock',
    ready: { heading: 'Stock Availability', level: 1 },
    roles: ['Demo Admin', 'Maintenance Manager']
  },
  {
    id: 'mro-command-center',
    path: '/maintenance',
    ready: { heading: 'Pusat Kendali MRO', level: 1 },
    roles: ['Maintenance Manager']
  },
  {
    id: 'mro-flight-handoffs',
    path: '/maintenance/flight-handoffs',
    ready: { heading: 'Flight Handoffs', level: 1 },
    roles: ['Maintenance Manager']
  },
  {
    id: 'mro-aircraft-technical-status',
    path: '/maintenance/aircraft',
    ready: { heading: 'Aircraft Technical Status', level: 1 },
    roles: ['Maintenance Manager', 'Certifying Staff']
  },
  {
    id: 'mro-defect-queue',
    path: '/maintenance/defects',
    ready: { heading: 'Defects', level: 1 },
    roles: ['Maintenance Manager']
  },
  {
    id: 'mro-work-packages-register',
    path: '/maintenance/work-packages',
    ready: { heading: 'Work Packages', level: 1 },
    roles: ['Maintenance Manager', 'Certifying Staff']
  },
  {
    id: 'mro-valid-work-package-creation-review',
    path: '/maintenance?defect=DEF-MROV1-MRB-001',
    ready: { heading: 'Pusat Kendali MRO', level: 1 },
    roles: ['Maintenance Manager'],
    prepare: async (page) => {
      await page.getByRole('heading', { name: 'Assign Work Package' }).waitFor();
      await page.getByRole('tab', { name: 'Material' }).click();
      await page.getByLabel('Approved maintenance data reference').fill('AMM C208B 32-40-00');
      await page.getByRole('tab', { name: 'Catatan' }).click();
      await page
        .getByLabel('Bukti atau alasan perencanaan')
        .fill('Technical-log assessment and brake inspection planning evidence reviewed.');
    }
  },
  {
    id: 'mro-work-package-detail',
    path: '/maintenance/work-packages/mwp-mrov1-release-ready',
    ready: { heading: 'Starter-generator indication rectification', level: 1 },
    roles: ['Maintenance Manager', 'Certifying Staff']
  },
  {
    id: 'mro-technical-release-confirmation',
    path: '/maintenance/work-packages/mwp-mrov1-release-ready',
    ready: { heading: 'Starter-generator indication rectification', level: 1 },
    roles: ['Certifying Staff'],
    prepare: async (page) => {
      await page.getByRole('button', { name: 'Issue technical release' }).click();
      await page.getByRole('heading', { name: 'Technical release confirmation' }).waitFor();
    }
  },
  {
    id: 'mro-technical-release-result',
    path: '/maintenance/work-packages/mwp-mrov1-release-ready',
    ready: { heading: 'Starter-generator indication rectification', level: 1 },
    roles: ['Certifying Staff'],
    prepare: async (page) => {
      await page.getByRole('button', { name: 'Issue technical release' }).click();
      await page.getByRole('heading', { name: 'Technical release confirmation' }).waitFor();
      await page.getByRole('button', { name: 'Issue technical release' }).last().click();
      await page.getByText('Technical release completed').waitFor();
    }
  },
  {
    id: 'mro-technical-releases-register',
    path: '/maintenance/releases',
    ready: { heading: 'Technical Releases', level: 1 },
    roles: ['Certifying Staff']
  },
  {
    id: 'mro-records-audit-filtered',
    path: '/maintenance/records?package=MWP-MROV1-RTS',
    ready: { heading: 'Records & Audit', level: 1 },
    roles: ['Certifying Staff', 'Maintenance Manager']
  },
  {
    id: 'ticketing-passenger-manifest',
    path: '/ticketing/passenger',
    ready: { heading: 'Passenger Manifest', level: 1 },
    roles: ['Demo Admin']
  },
  {
    id: 'invoices-register',
    path: '/invoices',
    ready: { heading: 'Invoices', level: 1 },
    roles: ['Demo Admin', 'Finance Reviewer']
  },
  {
    id: 'invoice-detail',
    path: '/invoices/inv-closed-djj-wmx',
    ready: { heading: 'AMA-INV-20260707-001', level: 1 },
    roles: ['Demo Admin', 'Finance Reviewer']
  }
];
