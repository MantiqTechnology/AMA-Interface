import type { DocumentOwnerType } from '../contracts/documents';

export type DocumentTypeConfig = {
  value: string;
  label: string;
  ownerTypes: readonly DocumentOwnerType[];
  mandatory?: boolean;
  restricted?: boolean;
};

export const documentTypes: readonly DocumentTypeConfig[] = [
  {
    value: 'AIRCRAFT_CERTIFICATE_OF_REGISTRATION',
    label: 'Certificate of Registration',
    ownerTypes: ['aircraft'],
    mandatory: true
  },
  {
    value: 'AIRCRAFT_CERTIFICATE_OF_AIRWORTHINESS',
    label: 'Certificate of Airworthiness',
    ownerTypes: ['aircraft'],
    mandatory: true
  },
  {
    value: 'AIRCRAFT_INSURANCE_CERTIFICATE',
    label: 'Insurance Certificate',
    ownerTypes: ['aircraft'],
    mandatory: true
  },
  {
    value: 'AIRCRAFT_WEIGHT_AND_BALANCE',
    label: 'Weight & Balance',
    ownerTypes: ['aircraft'],
    mandatory: true
  },
  { value: 'AIRCRAFT_FLIGHT_MANUAL', label: 'Aircraft Flight Manual', ownerTypes: ['aircraft'] },
  { value: 'AIRCRAFT_LEASE_OR_OWNERSHIP', label: 'Lease / Ownership', ownerTypes: ['aircraft'] },
  { value: 'PILOT_LICENSE', label: 'Pilot Licence', ownerTypes: ['personnel'], mandatory: true },
  { value: 'PILOT_TYPE_RATING', label: 'Type Rating', ownerTypes: ['personnel'] },
  {
    value: 'PILOT_MEDICAL_CERTIFICATE',
    label: 'Medical Certificate',
    ownerTypes: ['personnel'],
    mandatory: true,
    restricted: true
  },
  {
    value: 'PILOT_RECURRENCY_TRAINING',
    label: 'Recurrency Training',
    ownerTypes: ['personnel'],
    mandatory: true
  },
  { value: 'PILOT_PROFICIENCY_CHECK', label: 'Proficiency Check', ownerTypes: ['personnel'] },
  {
    value: 'DANGEROUS_GOODS_TRAINING',
    label: 'Dangerous Goods Training',
    ownerTypes: ['personnel']
  },
  { value: 'PERSONNEL_ASSIGNMENT_LETTER', label: 'Assignment Letter', ownerTypes: ['personnel'] },
  {
    value: 'STATION_INFORMATION_SHEET',
    label: 'Station Information Sheet',
    ownerTypes: ['station'],
    mandatory: true
  },
  { value: 'STATION_LOCAL_SOP', label: 'Local SOP', ownerTypes: ['station'], mandatory: true },
  { value: 'STATION_HANDLING_AGREEMENT', label: 'Handling Agreement', ownerTypes: ['station'] },
  { value: 'STATION_HANDLING_RATE_CARD', label: 'Handling Rate Card', ownerTypes: ['station'] },
  { value: 'STATION_PARKING_RATE_CARD', label: 'Parking Rate Card', ownerTypes: ['station'] },
  {
    value: 'AIRPORT_OPERATIONAL_BRIEFING',
    label: 'Airport Operational Briefing',
    ownerTypes: ['station']
  },
  {
    value: 'ROUTE_RISK_ASSESSMENT',
    label: 'Route Risk Assessment',
    ownerTypes: ['route'],
    mandatory: true
  },
  { value: 'FUEL_SUPPLY_AGREEMENT', label: 'Fuel Supply Agreement', ownerTypes: ['vendor'] },
  { value: 'FUEL_RATE_CARD', label: 'Fuel Rate Card', ownerTypes: ['vendor'] },
  {
    value: 'HANDLING_SERVICE_AGREEMENT',
    label: 'Handling Service Agreement',
    ownerTypes: ['vendor']
  },
  {
    value: 'VENDOR_LEGAL_DOCUMENT',
    label: 'Vendor Legal Document',
    ownerTypes: ['vendor'],
    mandatory: true
  },
  { value: 'VENDOR_TAX_DOCUMENT', label: 'Vendor Tax Document', ownerTypes: ['vendor'] },
  {
    value: 'VENDOR_BANK_VERIFICATION',
    label: 'Bank Verification',
    ownerTypes: ['vendor'],
    mandatory: true,
    restricted: true
  },
  {
    value: 'MAINTENANCE_VENDOR_CAPABILITY_LIST',
    label: 'Maintenance Capability List',
    ownerTypes: ['vendor']
  },
  {
    value: 'CHARTER_AGREEMENT',
    label: 'Charter Agreement',
    ownerTypes: ['customer'],
    mandatory: true
  },
  { value: 'CUSTOMER_RATE_CARD', label: 'Customer Rate Card', ownerTypes: ['customer'] },
  { value: 'CUSTOMER_TAX_DOCUMENT', label: 'Customer Tax Document', ownerTypes: ['customer'] },
  { value: 'CUSTOMER_CREDIT_APPROVAL', label: 'Customer Credit Approval', ownerTypes: ['customer'] }
];

export function getDocumentTypeConfig(value: string) {
  return documentTypes.find((item) => item.value === value);
}

export function documentTypesForOwner(ownerType: DocumentOwnerType) {
  return documentTypes.filter((item) => item.ownerTypes.includes(ownerType));
}
