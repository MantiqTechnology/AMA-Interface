import type { MasterDataEntityConfig } from './common';

export const aircraftMasterDataConfig = {
  key: 'aircraft',
  domain: 'operations',
  slug: 'aircraft',
  title: 'Aircraft',
  shortTitle: 'Aircraft',
  description: 'Aircraft reference used for Flight Control assignment and readiness checks.',
  tableName: 'ref_aircraft',
  routePath: '/master-data/aircraft',
  apiPath: '/api/master-data/aircraft',
  codeField: 'registration_number',
  labelField: 'registration_number',
  searchFields: ['registration_number', 'aircraft_type', 'manufacturer', 'model'],
  optionLabelFields: ['registration_number', 'model'],
  fields: [
    {
      key: 'registration_number',
      label: 'Registration number',
      type: 'text',
      required: true,
      uppercase: true
    },
    { key: 'aircraft_type', label: 'Aircraft type', type: 'text', required: true },
    { key: 'manufacturer', label: 'Manufacturer', type: 'text', required: true },
    { key: 'model', label: 'Model', type: 'text', required: true },
    {
      key: 'passenger_capacity',
      label: 'Passenger capacity',
      type: 'number',
      required: true,
      min: 0
    },
    {
      key: 'cargo_capacity_kg',
      label: 'Cargo capacity kg',
      type: 'number',
      required: true,
      min: 0
    },
    {
      key: 'fuel_type',
      label: 'Fuel type',
      type: 'select',
      required: true,
      options: ['AVTUR', 'AVGAS']
    },
    {
      key: 'serviceability_status',
      label: 'Serviceability',
      type: 'select',
      required: true,
      options: ['SERVICEABLE', 'MAINTENANCE_DUE', 'UNSERVICEABLE']
    },
    {
      key: 'base_station_id',
      label: 'Base station',
      type: 'relation',
      relation: 'stations',
      nullable: true
    }
  ],
  displayColumns: [
    'registration_number',
    'aircraft_type',
    'passenger_capacity',
    'cargo_capacity_kg',
    'fuel_type',
    { key: 'serviceability_status', label: 'Serviceability', type: 'status' },
    { key: 'base_station_id', label: 'Base station', type: 'relation', relation: 'stations' }
  ]
} as const satisfies MasterDataEntityConfig;

export const stationsMasterDataConfig = {
  key: 'stations',
  domain: 'operations',
  slug: 'stations',
  title: 'Stations & Airports',
  shortTitle: 'Stations',
  description: 'Airports, airstrips, and stations served by operations.',
  tableName: 'ref_stations',
  routePath: '/master-data/stations',
  apiPath: '/api/master-data/stations',
  codeField: 'station_code',
  labelField: 'station_name',
  searchFields: ['station_code', 'station_name', 'city_or_region', 'province'],
  optionLabelFields: ['station_code', 'station_name'],
  fields: [
    { key: 'station_code', label: 'Station code', type: 'text', required: true, uppercase: true },
    { key: 'station_name', label: 'Station name', type: 'text', required: true },
    { key: 'city_or_region', label: 'City or region', type: 'text', required: true },
    { key: 'province', label: 'Province', type: 'text', required: true },
    {
      key: 'airport_type',
      label: 'Airport type',
      type: 'select',
      required: true,
      options: ['AIRPORT', 'AIRSTRIP', 'STOL_AIRFIELD']
    },
    { key: 'has_fuel_service', label: 'Fuel service', type: 'boolean', default: false },
    { key: 'has_handling_service', label: 'Handling service', type: 'boolean', default: false },
    { key: 'has_parking_service', label: 'Parking service', type: 'boolean', default: false }
  ],
  displayColumns: [
    'station_code',
    'station_name',
    'city_or_region',
    'province',
    'airport_type',
    { key: 'facilities', label: 'Facilities', type: 'facilities' }
  ]
} as const satisfies MasterDataEntityConfig;

export const routesMasterDataConfig = {
  key: 'routes',
  domain: 'operations',
  slug: 'routes',
  title: 'Routes',
  shortTitle: 'Routes',
  description: 'Station-to-station route references for future flight requests.',
  tableName: 'ref_routes',
  routePath: '/master-data/routes',
  apiPath: '/api/master-data/routes',
  codeField: 'route_code',
  labelField: 'route_code',
  searchFields: ['route_code'],
  optionLabelFields: ['route_code'],
  fields: [
    { key: 'route_code', label: 'Route code', type: 'text', required: true, uppercase: true },
    {
      key: 'origin_station_id',
      label: 'Origin',
      type: 'relation',
      relation: 'stations',
      required: true
    },
    {
      key: 'destination_station_id',
      label: 'Destination',
      type: 'relation',
      relation: 'stations',
      required: true
    },
    {
      key: 'estimated_duration_minutes',
      label: 'Duration minutes',
      type: 'number',
      required: true,
      min: 0
    },
    { key: 'distance_km', label: 'Distance km', type: 'number', required: true, min: 0 }
  ],
  displayColumns: [
    { key: 'route', label: 'Route', type: 'route' },
    'route_code',
    'estimated_duration_minutes',
    'distance_km'
  ]
} as const satisfies MasterDataEntityConfig;

export const crewMasterDataConfig = {
  key: 'crew',
  domain: 'operations',
  slug: 'personnel',
  title: 'Pilot & Crew',
  shortTitle: 'Pilot & Crew',
  description: 'Operational crew, license, and medical readiness reference.',
  tableName: 'ref_crews',
  routePath: '/master-data/personnel',
  apiPath: '/api/master-data/personnel',
  codeField: 'employee_code',
  labelField: 'full_name',
  searchFields: ['employee_code', 'full_name', 'license_number', 'unit'],
  optionLabelFields: ['employee_code', 'full_name'],
  fields: [
    { key: 'employee_code', label: 'Employee code', type: 'text', required: true, uppercase: true },
    { key: 'full_name', label: 'Full name', type: 'text', required: true },
    {
      key: 'crew_role',
      label: 'Crew role',
      type: 'select',
      required: true,
      options: ['PILOT_IN_COMMAND', 'CO_PILOT', 'CABIN_CREW', 'FLIGHT_OPERATIONS', 'GROUND_CREW']
    },
    { key: 'license_type', label: 'License type', type: 'text', nullable: true },
    { key: 'license_number', label: 'License number', type: 'text', nullable: true },
    { key: 'license_expiry_date', label: 'License expiry', type: 'date', nullable: true },
    { key: 'medical_expiry_date', label: 'Medical expiry', type: 'date', nullable: true },
    {
      key: 'base_station_id',
      label: 'Base station',
      type: 'relation',
      relation: 'stations',
      nullable: true
    },
    { key: 'unit', label: 'Unit', type: 'text', required: true },
    {
      key: 'employment_status',
      label: 'Employment status',
      type: 'select',
      required: true,
      options: ['PERMANENT', 'CONTRACT', 'ON_LEAVE', 'INACTIVE']
    }
  ],
  displayColumns: [
    'employee_code',
    'full_name',
    'crew_role',
    { key: 'base_station_id', label: 'Base station', type: 'relation', relation: 'stations' },
    { key: 'license_expiry_date', label: 'License', type: 'expiry' },
    { key: 'medical_expiry_date', label: 'Medical', type: 'expiry' }
  ]
} as const satisfies MasterDataEntityConfig;

export const flightReasonsMasterDataConfig = {
  key: 'flight_reasons',
  domain: 'operations',
  slug: 'flight-reasons',
  title: 'Flight Reasons',
  shortTitle: 'Flight Reasons',
  description: 'Standard reasons for delay, cancellation, diversion, and correction reopening.',
  tableName: 'ref_flight_reasons',
  routePath: '/master-data/flight-reasons',
  apiPath: '/api/master-data/flight-reasons',
  codeField: 'reason_code',
  labelField: 'description',
  searchFields: ['reason_code', 'reason_type', 'category', 'description'],
  optionLabelFields: ['reason_code', 'description'],
  fields: [
    { key: 'reason_code', label: 'Reason code', type: 'text', required: true, uppercase: true },
    {
      key: 'reason_type',
      label: 'Reason type',
      type: 'select',
      required: true,
      options: ['DELAY', 'CANCELLED', 'DIVERTED', 'REOPENED_FOR_CORRECTION']
    },
    { key: 'category', label: 'Category', type: 'text', required: true },
    {
      key: 'description',
      label: 'Description',
      type: 'textarea',
      required: true,
      formWidth: 'full'
    },
    { key: 'requires_note', label: 'Requires note', type: 'boolean', default: false }
  ],
  displayColumns: ['reason_code', 'reason_type', 'category', 'description', 'requires_note']
} as const satisfies MasterDataEntityConfig;

export const operationsMasterDataEntities = [
  aircraftMasterDataConfig,
  stationsMasterDataConfig,
  routesMasterDataConfig,
  crewMasterDataConfig,
  flightReasonsMasterDataConfig
] as const satisfies readonly MasterDataEntityConfig[];
