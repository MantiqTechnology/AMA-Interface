import type { SectionTabItem } from '../types/section-tabs';

export const assetManagementTabs: SectionTabItem[] = [
  {
    label: 'Overview',
    to: '/asset-management/overview',
    icon: 'mdi-view-dashboard-outline'
  },
  {
    label: 'Asset Register',
    to: '/asset-management/register',
    icon: 'mdi-clipboard-list-outline'
  },
  {
    label: 'Asset Assignment',
    to: '/asset-management/assignment',
    icon: 'mdi-account-arrow-right-outline'
  },
  {
    label: 'Asset Maintenance',
    to: '/asset-management/maintenance',
    icon: 'mdi-wrench-outline'
  },
  {
    label: 'Asset Movement',
    to: '/asset-management/movement',
    icon: 'mdi-swap-horizontal'
  },
  {
    label: 'Asset Finance',
    to: '/asset-management/finance',
    icon: 'mdi-cash-multiple'
  },
  {
    label: 'Asset Audit',
    to: '/asset-management/audit',
    icon: 'mdi-clipboard-check-outline'
  }
];
