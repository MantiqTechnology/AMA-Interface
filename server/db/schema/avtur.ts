import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// ── 1. Master Aset Hardware Avtur & Telemetri ─────────────────────────
export const avturAssets = sqliteTable('avtur_assets', {
  id: text('id').primaryKey(),
  assetCode: text('asset_code').notNull().unique(), // e.g., SKID-WMX-01, FM-BLE-01
  assetName: text('asset_name').notNull(),
  category: text('category', { 
    enum: ['SKID_ASSEMBLY', 'FLOWMETER_BLE', 'SOLENOID_VALVE', 'RFID_TAG', 'EFB_TABLET'] 
  }).notNull(),
  brandModel: text('brand_model'), // e.g., Endress+Hauser Promass F200
  serialNumberPhysical: text('serial_number_physical').notNull(),
  serialNumberCoc: text('serial_number_coc').notNull(),
  exRating: text('ex_rating'), // e.g., ATEX Zone 1 / Ex ia IIC T4 Ga
  stationId: text('station_id').notNull(),
  cocStatus: text('coc_status', { enum: ['PENDING', 'OK', 'REJECT'] }).default('PENDING').notNull(),
  operationalStatus: text('operational_status', { 
    enum: ['ACTIVE', 'INSPECTION_DUE', 'QUARANTINE', 'DECOMMISSIONED'] 
  }).default('ACTIVE').notNull(),
  installedAt: text('installed_at'),
  lastCalibratedAt: text('last_calibrated_at')
});

// ── 2. Audit Verifikasi Certificate of Conformity (CoC) ───────────────
export const avturCocVerifications = sqliteTable('avtur_coc_verifications', {
  id: text('id').primaryKey(),
  assetId: text('asset_id').notNull().references(() => avturAssets.id, { onDelete: 'cascade' }),
  verifiedBy: text('verified_by').notNull(), // User ID Inspector
  physicalSnInput: text('physical_sn_input').notNull(),
  cocDocumentSnInput: text('coc_document_sn_input').notNull(),
  verificationResult: text('verification_result', { enum: ['MATCH_OK', 'MISMATCH_REJECT'] }).notNull(),
  notes: text('notes'),
  verifiedAt: text('verified_at').notNull()
});

// ── 3. Transaksi Avtur (Termasuk Interlock & Telemetri Hardware) ───────
export const avturTransactions = sqliteTable('avtur_transactions', {
  id: text('id').primaryKey(),
  transactionNo: text('transaction_no').notNull().unique(),
  workflowType: text('workflow_type', {
    enum: ['DPPU_TO_AIRCRAFT', 'DPPU_TO_DRUM', 'DRUM_TRANSFER', 'DRUM_TO_AIRCRAFT', 'CONSOLIDATION']
  }).notNull(),
  sourceAssetId: text('source_asset_id').notNull().references(() => avturAssets.id),
  targetAssetId: text('target_asset_id').references(() => avturAssets.id),
  flightMissionId: text('flight_mission_id'),
  aircraftTailNo: text('aircraft_tail_no'),
  
  // Parameter Telemetri E+H BLE & Sensor
  flowmeterStartKg: real('flowmeter_start_kg').notNull(),
  flowmeterEndKg: real('flowmeter_end_kg').notNull(),
  totalVolumeLiters: real('total_volume_liters').notNull(),
  densityMeasured: real('density_measured').notNull(), // Density 15°C
  temperatureCelsius: real('temperature_celsius').notNull(),
  
  // Interlock & Safety Check Flags
  groundingVerified: integer('grounding_verified', { mode: 'boolean' }).notNull(),
  swdTestPassed: integer('swd_test_passed', { mode: 'boolean' }).notNull(),
  sealIntact: integer('seal_intact', { mode: 'boolean' }).notNull(),
  settlingTimePassed: integer('settling_time_passed', { mode: 'boolean' }).notNull(),
  solenoidCutoffTriggered: integer('solenoid_cutoff_triggered', { mode: 'boolean' }).default(false).notNull(),

  operatorId: text('operator_id').notNull(),
  syncedFromDevice: integer('synced_from_device', { mode: 'boolean' }).default(false).notNull(),
  createdTimestamp: text('created_timestamp').notNull()
});

// ── 4. Inventaris Drum Avtur ──────────────────────────────────────────
export const avturDrums = sqliteTable('avtur_drums', {
  id: text('id').primaryKey(),
  drumCode: text('drum_code').notNull().unique(),
  batchRef: text('batch_ref'),
  location: text('location').notNull(),
  volumeLiters: real('volume_liters').notNull(),
  status: text('status').default('Available').notNull()
});

// ── 5. Mutasi & Transfer Stok ─────────────────────────────────────────
export const avturTransfers = sqliteTable('avtur_transfers', {
  id: text('id').primaryKey(),
  transferNo: text('transfer_no').notNull().unique(),
  originStation: text('origin_station').notNull(),
  destinationStation: text('destination_station').notNull(),
  drumId: text('drum_id').references(() => avturDrums.id),
  status: text('status', {
    enum: ['PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']
  }).default('PENDING').notNull(),
  createdAt: text('created_at').notNull()
});

// ── 6. Serah Terima / Handover ────────────────────────────────────────
export const avturHandovers = sqliteTable('avtur_handovers', {
  id: text('id').primaryKey(),
  handoverNo: text('handover_no').notNull().unique(),
  transferId: text('transfer_id').references(() => avturTransfers.id),
  receivedBy: text('received_by').notNull(),
  digitalSignature: text('digital_signature'),
  notes: text('notes'),
  handedOverAt: text('handed_over_at').notNull()
});

// ── 7. Rekonsiliasi Jurnal ERP ────────────────────────────────────────
export const avturErpLogs = sqliteTable('avtur_erp_logs', {
  id: text('id').primaryKey(),
  journalNo: text('journal_no').notNull().unique(),
  transactionId: text('transaction_id').references(() => avturTransactions.id),
  syncStatus: text('sync_status', {
    enum: ['PENDING', 'SYNCED', 'FAILED', 'PENDING_RETRY']
  }).default('PENDING').notNull(),
  syncedAt: text('synced_at')
});