import { scryptSync, timingSafeEqual } from 'node:crypto';
import type { DemoAccountHelperDto } from '../../shared/contracts/auth';
import { demoRoleActorIds, demoRoleStationScopes, type DemoRole } from '../../shared/types/roles';

export type DemoAccount = DemoAccountHelperDto & {
  userId: string;
};

const accountDefinitions: Array<
  Omit<DemoAccount, 'userId' | 'stationScopes'> & { role: DemoRole }
> = [
  {
    username: 'director.demo',
    password: 'AMA-Director-2026!',
    role: 'Director',
    displayName: 'AMA Operations Director',
    personaLabel: 'Executive approver'
  },
  {
    username: 'occ.demo',
    password: 'AMA-OCC-2026!',
    role: 'OCC',
    displayName: 'AMA OCC Controller',
    personaLabel: 'Operations control'
  },
  {
    username: 'occ.checker',
    password: 'AMA-Checker-2026!',
    role: 'OCC Checker',
    displayName: 'AMA OCC Readiness Checker',
    personaLabel: 'Independent readiness checker'
  },
  {
    username: 'station.wmx',
    password: 'AMA-WMX-2026!',
    role: 'Station Admin',
    displayName: 'Wamena Station Admin',
    personaLabel: 'Destination station operations'
  },
  {
    username: 'station.djj',
    password: 'AMA-DJJ-2026!',
    role: 'Station Admin Origin',
    displayName: 'Jayapura Station Admin',
    personaLabel: 'Origin station operations'
  },
  {
    username: 'finance.demo',
    password: 'AMA-Finance-2026!',
    role: 'Finance Reviewer',
    displayName: 'AMA Finance Reviewer',
    personaLabel: 'Invoice and finance review'
  },
  {
    username: 'mro.manager',
    password: 'AMA-MRO-Manager-2026!',
    role: 'Maintenance Manager',
    displayName: 'AMA Maintenance Manager',
    personaLabel: 'Maintenance review'
  },
  {
    username: 'mro.technician',
    password: 'AMA-MRO-Tech-2026!',
    role: 'Maintenance Technician',
    displayName: 'AMA Maintenance Technician',
    personaLabel: 'Mechanic sign-off'
  },
  {
    username: 'certifying.demo',
    password: 'AMA-RTS-2026!',
    role: 'Certifying Staff',
    displayName: 'AMA Certifying Staff',
    personaLabel: 'Technical release'
  },
  {
    username: 'inventory.demo',
    password: 'AMA-Inventory-2026!',
    role: 'Inventory Controller',
    displayName: 'AMA Inventory Controller',
    personaLabel: 'Inventory and procurement control'
  }
];

export const demoAccounts: DemoAccount[] = accountDefinitions.map((account) => ({
  ...account,
  userId: demoRoleActorIds[account.role],
  stationScopes: [...demoRoleStationScopes[account.role]]
}));

const PASSWORD_SALT = 'ama-controlled-local-demo-v1';

function derivePassword(password: string) {
  return scryptSync(password, PASSWORD_SALT, 32);
}

export function authenticateDemoAccount(username: string, password: string) {
  const account = demoAccounts.find((candidate) => candidate.username === username.toLowerCase());
  const suppliedHash = derivePassword(password);
  const expectedHash = derivePassword(account?.password ?? 'invalid-demo-password-placeholder');
  return account && timingSafeEqual(suppliedHash, expectedHash) ? account : null;
}

export function demoAccountByRole(role: DemoRole) {
  return demoAccounts.find((account) => account.role === role) ?? null;
}

export function listDemoAccountHelpers(): DemoAccountHelperDto[] {
  return demoAccounts.map((account) => ({
    username: account.username,
    password: account.password,
    role: account.role,
    displayName: account.displayName,
    personaLabel: account.personaLabel,
    stationScopes: account.stationScopes
  }));
}
