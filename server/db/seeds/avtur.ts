import type Database from 'better-sqlite3';
import { getDbClient, type AppDatabase } from '../client';
import type { DemoSeedContext } from './context';

export async function seedAvturData(db: AppDatabase, ctx: DemoSeedContext) {
  const sqlite = (db as unknown as { $client: Database.Database }).$client ?? getDbClient().sqlite;
  const now = ctx.now;

  const seed = sqlite.transaction(() => {
    sqlite.prepare('PRAGMA foreign_keys = OFF').run();

    // ============================================================================
    // 1. MASTER ASET HARDWARE AVTUR & TELEMETRI (avtur_assets)
    // ============================================================================
    const assets = [
      {
        id: 'asset-skid-wmx-01',
        asset_code: 'SKID-WMX-01',
        asset_name: 'Skid Dispenser Modular Wamena Main',
        category: 'SKID_ASSEMBLY',
        brand_model: 'Faudi Aviation / Liquid Controls M-7',
        serial_number_physical: 'SN-SKID-2024-0019',
        serial_number_coc: 'COC-FAUDI-WMX-8812',
        ex_rating: 'ATEX Zone 1 / Ex d IIB T4 Gb',
        station_id: 'st-wmx',
        coc_status: 'OK',
        operational_status: 'ACTIVE',
        installed_at: ctx.date(-180),
        last_calibrated_at: ctx.date(-30)
      },
      {
        id: 'asset-fm-ble-01',
        asset_code: 'FM-BLE-WMX-01',
        asset_name: 'Digital Flowmeter Massic E+H Promass',
        category: 'FLOWMETER_BLE',
        brand_model: 'Endress+Hauser Promass F 200',
        serial_number_physical: 'SN-EH-FM-992110',
        serial_number_coc: 'COC-EH-2025-992110',
        ex_rating: 'ATEX Zone 0 / Ex ia IIC T4 Ga',
        station_id: 'st-wmx',
        coc_status: 'OK',
        operational_status: 'ACTIVE',
        installed_at: ctx.date(-120),
        last_calibrated_at: ctx.date(-15)
      },
      {
        id: 'asset-sol-wmx-01',
        asset_code: 'SOL-CUTOFF-WMX-01',
        asset_name: 'Ex-Proof Automatic Solenoid Cutoff Valve',
        category: 'SOLENOID_VALVE',
        brand_model: 'ASCO RedHat II Ex-Proof',
        serial_number_physical: 'SN-ASCO-88371',
        serial_number_coc: 'COC-ASCO-2025-001',
        ex_rating: 'ATEX Zone 1 / Ex d IIC T5 Gb',
        station_id: 'st-wmx',
        coc_status: 'OK',
        operational_status: 'ACTIVE',
        installed_at: ctx.date(-120),
        last_calibrated_at: ctx.date(-15)
      },
      {
        id: 'asset-rfid-dss-01',
        asset_code: 'RFID-DRUM-WMX-099',
        asset_name: 'Avtur Sealed Drum RFID Tag #099',
        category: 'RFID_TAG',
        brand_model: 'HID Global Rugged Metal Tag Ex',
        serial_number_physical: 'RF-TAG-8827-099',
        serial_number_coc: 'COC-HID-RF-099',
        ex_rating: 'ATEX Zone 0 / Ex ia IIC T6 Ga',
        station_id: 'st-wmx',
        coc_status: 'OK',
        operational_status: 'ACTIVE',
        installed_at: ctx.date(-10),
        last_calibrated_at: null
      },
      {
        id: 'asset-efb-tab-01',
        asset_code: 'EFB-TAB-DEX-01',
        asset_name: 'Intrinsically Safe EFB Fueling Tablet',
        category: 'EFB_TABLET',
        brand_model: 'i.safe MOBILE IS530.1 Ex-Tablet',
        serial_number_physical: 'SN-ISAFE-530-9921',
        serial_number_coc: 'COC-ISAFE-2025-771',
        ex_rating: 'ATEX Zone 1/21 Ex ib IIC T4 Gb',
        station_id: 'st-dex',
        coc_status: 'PENDING',
        operational_status: 'INSPECTION_DUE',
        installed_at: ctx.date(-45),
        last_calibrated_at: null
      }
    ];

    for (const a of assets) {
      sqlite
        .prepare(
          `INSERT OR REPLACE INTO avtur_assets (
            id, asset_code, asset_name, category, brand_model, 
            serial_number_physical, serial_number_coc, ex_rating, 
            station_id, coc_status, operational_status, installed_at, last_calibrated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          a.id,
          a.asset_code,
          a.asset_name,
          a.category,
          a.brand_model,
          a.serial_number_physical,
          a.serial_number_coc,
          a.ex_rating,
          a.station_id,
          a.coc_status,
          a.operational_status,
          a.installed_at,
          a.last_calibrated_at
        );
    }

    // ============================================================================
    // 2. AUDIT VERIFIKASI CERTIFICATE OF CONFORMITY (avtur_coc_verifications)
    // ============================================================================
    const cocVerifications = [
      {
        id: 'cocv-001',
        asset_id: 'asset-skid-wmx-01',
        verified_by: 'emp-003',
        physical_sn_input: 'SN-SKID-2024-0019',
        coc_document_sn_input: 'COC-FAUDI-WMX-8812',
        verification_result: 'MATCH_OK',
        notes: 'CoC fisik dan nomor seri di plat sertifikasi ATEX sesuai 100%.',
        verified_at: ctx.at(-30, '09:30')
      },
      {
        id: 'cocv-002',
        asset_id: 'asset-fm-ble-01',
        verified_by: 'emp-003',
        physical_sn_input: 'SN-EH-FM-992110',
        coc_document_sn_input: 'COC-EH-2025-992110',
        verification_result: 'MATCH_OK',
        notes: 'Kalibrasi pabrik E+H tersertifikasi valid sampai tahun depan.',
        verified_at: ctx.at(-15, '11:00')
      },
      {
        id: 'cocv-003',
        asset_id: 'asset-efb-tab-01',
        verified_by: 'emp-050',
        physical_sn_input: 'SN-ISAFE-530-9921',
        coc_document_sn_input: 'COC-ISAFE-MISMATCH-990',
        verification_result: 'MISMATCH_REJECT',
        notes: 'Dokumen CoC yang dilampirkan tidak sesuai dengan SN unit fisik tablet.',
        verified_at: ctx.at(-2, '14:15')
      }
    ];

    for (const v of cocVerifications) {
      sqlite
        .prepare(
          `INSERT OR REPLACE INTO avtur_coc_verifications (
            id, asset_id, verified_by, physical_sn_input, 
            coc_document_sn_input, verification_result, notes, verified_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          v.id,
          v.asset_id,
          v.verified_by,
          v.physical_sn_input,
          v.coc_document_sn_input,
          v.verification_result,
          v.notes,
          v.verified_at
        );
    }

    // ============================================================================
    // 3. TRANSAKSI AVTUR & HARDWARE TELEMETRY INTERLOCK (avtur_transactions)
    // ============================================================================
    const transactions = [
      {
        id: 'atx-2026-001',
        transaction_no: 'AVT-TX-2026-08001',
        workflow_type: 'DPPU_TO_AIRCRAFT',
        source_asset_id: 'asset-skid-wmx-01',
        target_asset_id: null,
        flight_mission_id: 'flt-wmx-djj-001',
        aircraft_tail_no: 'PK-MRA',
        flowmeter_start_kg: 10450.0,
        flowmeter_end_kg: 11250.0,
        total_volume_liters: 1000.0,
        density_measured: 0.800, // Kg/L pada 15°C
        temperature_celsius: 26.5,
        grounding_verified: 1,
        swd_test_passed: 1,
        seal_intact: 1,
        settling_time_passed: 1,
        solenoid_cutoff_triggered: 0,
        operator_id: 'emp-003',
        synced_from_device: 1,
        created_timestamp: ctx.at(-2, '07:45')
      },
      {
        id: 'atx-2026-002',
        transaction_no: 'AVT-TX-2026-08002',
        workflow_type: 'DPPU_TO_DRUM',
        source_asset_id: 'asset-skid-wmx-01',
        target_asset_id: 'asset-rfid-dss-01',
        flight_mission_id: null,
        aircraft_tail_no: null,
        flowmeter_start_kg: 11250.0,
        flowmeter_end_kg: 11410.0,
        total_volume_liters: 200.0,
        density_measured: 0.801,
        temperature_celsius: 25.0,
        grounding_verified: 1,
        swd_test_passed: 1,
        seal_intact: 1,
        settling_time_passed: 1,
        solenoid_cutoff_triggered: 0,
        operator_id: 'emp-003',
        synced_from_device: 1,
        created_timestamp: ctx.at(-1, '10:00')
      },
      {
        id: 'atx-2026-003',
        transaction_no: 'AVT-TX-2026-08003',
        workflow_type: 'DRUM_TO_AIRCRAFT',
        source_asset_id: 'asset-rfid-dss-01',
        target_asset_id: null,
        flight_mission_id: 'flt-dex-oks-004',
        aircraft_tail_no: 'PK-MRB',
        flowmeter_start_kg: 0.0,
        flowmeter_end_kg: 160.0,
        total_volume_liters: 200.0,
        density_measured: 0.798,
        temperature_celsius: 28.0,
        grounding_verified: 1,
        swd_test_passed: 0, // Water detection triggered cutoff!
        seal_intact: 1,
        settling_time_passed: 1,
        solenoid_cutoff_triggered: 1, // Cutoff triggered
        operator_id: 'emp-050',
        synced_from_device: 0,
        created_timestamp: ctx.at(0, '06:15')
      }
    ];

    for (const tx of transactions) {
      sqlite
        .prepare(
          `INSERT OR REPLACE INTO avtur_transactions (
            id, transaction_no, workflow_type, source_asset_id, target_asset_id,
            flight_mission_id, aircraft_tail_no, flowmeter_start_kg, flowmeter_end_kg,
            total_volume_liters, density_measured, temperature_celsius,
            grounding_verified, swd_test_passed, seal_intact, settling_time_passed,
            solenoid_cutoff_triggered, operator_id, synced_from_device, created_timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          tx.id,
          tx.transaction_no,
          tx.workflow_type,
          tx.source_asset_id,
          tx.target_asset_id,
          tx.flight_mission_id,
          tx.aircraft_tail_no,
          tx.flowmeter_start_kg,
          tx.flowmeter_end_kg,
          tx.total_volume_liters,
          tx.density_measured,
          tx.temperature_celsius,
          tx.grounding_verified,
          tx.swd_test_passed,
          tx.seal_intact,
          tx.settling_time_passed,
          tx.solenoid_cutoff_triggered,
          tx.operator_id,
          tx.synced_from_device,
          tx.created_timestamp
        );
    }

  });

  seed.immediate();
}