import type Database from 'better-sqlite3';
import { getDbClient, type AppDatabase } from '../client';
import type { DemoSeedContext } from './context';

export async function seedSmsData(db: AppDatabase, ctx: DemoSeedContext) {
  const sqlite = (db as unknown as { $client: Database.Database }).$client ?? getDbClient().sqlite;
  const now = ctx.now;

  const seed = sqlite.transaction(() => {
    sqlite.prepare('PRAGMA foreign_keys = OFF').run();
    // ============================================================================
    // 1. SAFETY COMMUNICATIONS & AWARENESS (Bulletins, Flash, Lessons Learned)
    // ============================================================================
    const communications = [
      {
        id: 'scomm-001',
        comm_type: 'FLASH',
        urgency: 'URGENT',
        title: 'Safety Flash: Cuaca Ekstrem Jalur Pegunungan Tengah',
        content:
          'Peringatan downdraft parah di area approach WMX dan Dekai. Seluruh PIC wajib mengevaluasi ulang margin bahan bakar dan skor FRAT.',
        status: 'PUBLISHED',
        document_id: null,
        author_user_id: 'emp-001',
        published_at: ctx.date(-3),
        created_at: ctx.at(-3, '08:00'),
        updated_at: ctx.at(-3, '08:00')
      },
      {
        id: 'scomm-002',
        comm_type: 'BULLETIN',
        urgency: 'NORMAL',
        title: 'Safety Bulletin: Prosedur Ground Handling Avtur',
        content:
          'Penerapan wajib uji kadar air (SWD Test) sebelum penuangan drum 200L ke pesawat perintis di stasiun pedalaman.',
        status: 'PUBLISHED',
        document_id: null,
        author_user_id: 'emp-003',
        published_at: ctx.date(-10),
        created_at: ctx.at(-10, '09:00'),
        updated_at: ctx.at(-10, '09:00')
      },
      {
        id: 'scomm-003',
        comm_type: 'LESSONS_LEARNED',
        urgency: 'NORMAL',
        title: 'Lessons Learned: Evaluasi Runway Excursion Q2',
        content:
          'Analisis insiden permukaan landasan licin di Oksibil. Peningkatan koordinasi antara Station Admin dan Flight Crew.',
        status: 'PUBLISHED',
        document_id: null,
        author_user_id: 'emp-002',
        published_at: ctx.date(-25),
        created_at: ctx.at(-25, '10:00'),
        updated_at: ctx.at(-25, '10:00')
      }
    ];

    for (const comm of communications) {
      sqlite
        .prepare(
          `INSERT OR REPLACE INTO safety_communications (id, comm_type, urgency, title, content, status, document_id, author_user_id, published_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          comm.id,
          comm.comm_type,
          comm.urgency,
          comm.title,
          comm.content,
          comm.status,
          comm.document_id,
          comm.author_user_id,
          comm.published_at,
          comm.created_at,
          comm.updated_at
        );
    }

    // ============================================================================
    // 2. SAFETY REPORTS (Hazard, Incident, Occurrence, Technical Finding)
    // ============================================================================
    const reports = [
      {
        id: 'srep-001',
        report_number: 'HAZ-2026-081',
        report_category: 'HAZARD',
        station_id: 'st-djj',
        aircraft_id: null,
        flight_operation_id: null,
        description:
          'Ditemukan kawanan burung yang bermigrasi di dekat ujung landasan pacu 30 Sentani saat pagi hari.',
        is_anonymous: 0,
        reported_by_user_id: 'emp-010',
        evidence_ids_json: '["ev-djj-bird-01"]',
        status: 'CAPA_ISSUED',
        created_at: ctx.at(-5, '07:30'),
        updated_at: ctx.at(-4, '09:00')
      },
      {
        id: 'srep-002',
        report_number: 'OCC-2026-102',
        report_category: 'OCCURRENCE',
        station_id: 'st-wmx',
        aircraft_id: 'ac-pk-mra',
        flight_operation_id: null,
        description:
          'Hard landing akibat windshear mendadak di Wamena. Pesawat mendarat aman namun butuh inspeksi struktural.',
        is_anonymous: 1,
        reported_by_user_id: null,
        evidence_ids_json: '["ev-wmx-hardland-01"]',
        status: 'UNDER_INVESTIGATION',
        created_at: ctx.at(-2, '14:20'),
        updated_at: ctx.at(-1, '10:00')
      },
      {
        id: 'srep-003',
        report_number: 'INC-2026-045',
        report_category: 'INCIDENT',
        station_id: 'st-dex',
        aircraft_id: null,
        flight_operation_id: null,
        description: 'Indikasi bahan bakar tidak stabil pada drum penyimpan stasiun Dekai.',
        is_anonymous: 0,
        reported_by_user_id: 'emp-050',
        evidence_ids_json: '[]',
        status: 'SUBMITTED',
        created_at: ctx.at(-1, '08:15'),
        updated_at: ctx.at(-1, '08:15')
      },
      {
        id: 'srep-004',
        report_number: 'TEC-2026-012',
        report_category: 'TECHNICAL_FINDING',
        station_id: 'st-nab',
        aircraft_id: 'ac-pk-mrb',
        flight_operation_id: null,
        description: 'Repetitive defect pada sistem komunikasi VHF-2 di Nabire.',
        is_anonymous: 0,
        reported_by_user_id: 'emp-031',
        evidence_ids_json: '[]',
        status: 'CAPA_ISSUED',
        created_at: ctx.at(-7, '11:00'),
        updated_at: ctx.at(-6, '14:00')
      }
    ];

    for (const rep of reports) {
      sqlite
        .prepare(
          `INSERT OR REPLACE INTO safety_reports (id, report_number, report_category, station_id, aircraft_id, flight_operation_id, description, is_anonymous, reported_by_user_id, evidence_ids_json, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          rep.id,
          rep.report_number,
          rep.report_category,
          rep.station_id,
          rep.aircraft_id,
          rep.flight_operation_id,
          rep.description,
          rep.is_anonymous,
          rep.reported_by_user_id,
          rep.evidence_ids_json,
          rep.status,
          rep.created_at,
          rep.updated_at
        );
    }

    // ============================================================================
    // 3. CAPA TICKETS (Corrective & Preventive Actions)
    // ============================================================================
    const capas = [
      {
        id: 'capa-001',
        ticket_number: 'CAPA-2026-042',
        source_report_id: 'srep-001',
        subject: 'Mitigasi Habitat Burung Airstrip DJJ',
        description:
          'Koordinasi dengan otoritas bandara untuk pembersihan semak di area perimeter landasan pacu.',
        status: 'ACTION',
        priority: 'HIGH',
        assigned_to_user_id: 'emp-007',
        due_date: ctx.date(-1),
        is_overdue_escalated: 1,
        escalated_to_user_id: 'emp-001',
        resolved_at: null,
        created_at: ctx.at(-4, '09:00'),
        updated_at: now
      },
      {
        id: 'capa-002',
        ticket_number: 'CAPA-2026-043',
        source_report_id: 'srep-002',
        subject: 'Inspeksi Khusus Hard Landing PK-MRA',
        description:
          'Melaksanakan inspeksi sesuai manual MRO paska laporan hard landing di Wamena.',
        status: 'VERIFIED',
        priority: 'CRITICAL',
        assigned_to_user_id: 'crew-maintenance-manager',
        due_date: ctx.date(2),
        is_overdue_escalated: 0,
        escalated_to_user_id: null,
        resolved_at: ctx.at(-1, '16:00'),
        created_at: ctx.at(-1, '10:30'),
        updated_at: ctx.at(-1, '16:30')
      },
      {
        id: 'capa-003',
        ticket_number: 'CAPA-2026-044',
        source_report_id: 'srep-004',
        subject: 'Penggantian Unit VHF Transceiver Nabire',
        description:
          'Melakukan pergantian modul radio komunikasi VHF-2 yang mengalami repetitive fault.',
        status: 'NEW',
        priority: 'MEDIUM',
        assigned_to_user_id: 'emp-031',
        due_date: ctx.date(5),
        is_overdue_escalated: 0,
        escalated_to_user_id: null,
        resolved_at: null,
        created_at: ctx.at(-6, '15:00'),
        updated_at: ctx.at(-6, '15:00')
      }
    ];

    for (const capa of capas) {
      sqlite
        .prepare(
          `INSERT OR REPLACE INTO capa_tickets (id, ticket_number, source_report_id, subject, description, status, priority, assigned_to_user_id, due_date, is_overdue_escalated, escalated_to_user_id, resolved_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          capa.id,
          capa.ticket_number,
          capa.source_report_id,
          capa.subject,
          capa.description,
          capa.status,
          capa.priority,
          capa.assigned_to_user_id,
          capa.due_date,
          capa.is_overdue_escalated,
          capa.escalated_to_user_id,
          capa.resolved_at,
          capa.created_at,
          capa.updated_at
        );
    }

    // ============================================================================
    // 4. FRAT ASSESSMENTS (Pre-Flight Risk Assessments)
    // ============================================================================
    const existingFlights = sqlite
      .prepare(
        `SELECT id, pilot_in_command_id FROM flight_operations WHERE pilot_in_command_id IS NOT NULL LIMIT 5`
      )
      .all() as Array<{ id: string; pilot_in_command_id: string }>;

    if (existingFlights.length > 0) {
      if (existingFlights[0]) {
        sqlite
          .prepare(
            `INSERT OR REPLACE INTO frat_assessments (id, flight_operation_id, pic_employee_id, crew_fatigue_score, weather_risk_score, airstrip_rating_score, total_risk_score, risk_zone, is_hard_locked, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            'frat-001',
            existingFlights[0].id,
            existingFlights[0].pilot_in_command_id,
            15,
            5,
            10,
            30,
            'GREEN',
            0,
            'CLEARED',
            now,
            now
          );
      }
      if (existingFlights[1]) {
        sqlite
          .prepare(
            `INSERT OR REPLACE INTO frat_assessments (id, flight_operation_id, pic_employee_id, crew_fatigue_score, weather_risk_score, airstrip_rating_score, total_risk_score, risk_zone, is_hard_locked, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            'frat-002',
            existingFlights[1].id,
            existingFlights[1].pilot_in_command_id,
            30,
            25,
            15,
            70,
            'YELLOW',
            0,
            'CLEARED',
            now,
            now
          );
      }
      if (existingFlights[2]) {
        sqlite
          .prepare(
            `INSERT OR REPLACE INTO frat_assessments (id, flight_operation_id, pic_employee_id, crew_fatigue_score, weather_risk_score, airstrip_rating_score, total_risk_score, risk_zone, is_hard_locked, override_signoff_by_user_id, override_reason, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            'frat-003',
            existingFlights[2].id,
            existingFlights[2].pilot_in_command_id,
            80,
            30,
            30,
            140,
            'RED',
            1,
            'emp-001',
            'Payload dikurangi 20% sebagai mitigasi darurat logistik rintis.',
            'OVERRIDDEN',
            now,
            now
          );
        sqlite
          .prepare(
            `INSERT OR REPLACE INTO sms_audit_logs (id, entity_type, entity_id, action, actor_user_id, actor_role, reason, occurred_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            'saudit-001',
            'FRAT',
            'frat-003',
            'OVERRIDE_HARD_LOCK',
            'emp-001',
            'Chief of Pilot',
            'Override Hard-Lock rintis logistik',
            now,
            now
          );
      }
    }

    // ============================================================================
    // 5. SAFETY MEETINGS (SRB & SAG)
    // ============================================================================
    sqlite
      .prepare(
        `INSERT OR REPLACE INTO safety_meetings (id, meeting_type, title, scheduled_at, location, status, created_by_user_id, created_at, updated_at)
       VALUES ('smeet-001', 'SRB', 'Safety Review Board - Bulanan Q3', ?, 'HQ Sentani Boardroom', 'CONDUCTED', 'emp-001', ?, ?)`
      )
      .run(ctx.date(-10), ctx.at(-12, '09:00'), ctx.at(-10, '12:00'));

    const attendees = [
      { id: 'att-01', meeting_id: 'smeet-001', employee_id: 'emp-001', status: 'ATTENDED' },
      { id: 'att-02', meeting_id: 'smeet-001', employee_id: 'emp-003', status: 'ATTENDED' },
      { id: 'att-03', meeting_id: 'smeet-001', employee_id: 'emp-004', status: 'ATTENDED' }
    ];
    for (const att of attendees) {
      sqlite
        .prepare(
          `INSERT OR REPLACE INTO safety_meeting_attendees (id, meeting_id, employee_id, attendance_status) VALUES (?, ?, ?, ?)`
        )
        .run(att.id, att.meeting_id, att.employee_id, att.status);
    }

    // ============================================================================
    // 6. EMERGENCY RESPONSE PLAN (ERP) ACTIVATIONS (ICAO Standard)
    // ============================================================================
    sqlite
      .prepare(
        `INSERT OR REPLACE INTO emergency_activations (
        id, activation_number, flight_operation_id, aircraft_id, station_id,
        icao_phase, nature_of_emergency, pob, endurance, lkp,
        declared_by_user_id, declared_at, broadcast_status_json, status,
        closed_at, closure_reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        'erp-001',
        'SAR-AMA-2026-001A',
        null,
        'ac-pk-mra',
        'st-wmx',
        'ALERFA',
        'Weather Emergency (Severe Windshear)',
        12,
        '02 Hrs 30 Mins',
        "04°05'S 138°56'E",
        'emp-007',
        ctx.at(-2, '14:25'),
        JSON.stringify({
          basarnas_api: 'ACKNOWLEDGED',
          whatsapp: 'SENT',
          sms: 'SENT',
          email: 'SENT'
        }),
        'CLOSED',
        ctx.at(-2, '16:00'),
        'Situasi terkendali, pesawat telah mendarat dan diinspeksi tim MRO.',
        ctx.at(-2, '14:25')
      );

    // ============================================================================
    // 7. SAFETY AUDITS & INSPECTIONS (NEW)
    // ============================================================================
    const audits = [
      {
        id: 'aud-001',
        audit_number: 'AUD-26-045',
        subject: 'DGCA AOC Renewal Audit (Base)',
        auditor_name: 'External (DKUPPU)',
        audit_type: 'EXTERNAL',
        scheduled_from: ctx.date(-7),
        scheduled_to: ctx.date(-4),
        findings_count: 2,
        status: 'COMPLETED',
        created_at: now,
        updated_at: now
      },
      {
        id: 'aud-002',
        audit_number: 'AUD-26-044',
        subject: 'Line Operations Safety Audit (LOSA)',
        auditor_name: 'Internal Safety Dept',
        audit_type: 'INTERNAL',
        scheduled_from: ctx.date(-20),
        scheduled_to: ctx.date(-10),
        findings_count: 5,
        status: 'ACTION_REQUIRED',
        created_at: now,
        updated_at: now
      },
      {
        id: 'aud-003',
        audit_number: 'AUD-26-046',
        subject: 'Annual ISO 9001 Surveillance',
        auditor_name: 'External (SGS)',
        audit_type: 'EXTERNAL',
        scheduled_from: ctx.date(15),
        scheduled_to: ctx.date(19),
        findings_count: 0,
        status: 'SCHEDULED',
        created_at: now,
        updated_at: now
      }
    ];
    for (const a of audits) {
      sqlite
        .prepare(
          `INSERT OR REPLACE INTO safety_audits (id, audit_number, subject, auditor_name, audit_type, scheduled_from, scheduled_to, findings_count, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          a.id,
          a.audit_number,
          a.subject,
          a.auditor_name,
          a.audit_type,
          a.scheduled_from,
          a.scheduled_to,
          a.findings_count,
          a.status,
          a.created_at,
          a.updated_at
        );
    }

    // ============================================================================
    // 8. MANAGEMENT OF CHANGE / MOC (NEW)
    // ============================================================================
    const mocs = [
      {
        id: 'moc-001',
        moc_number: 'MOC-26-012',
        title: 'Operasional Rute Baru: Oksibil (OKS) - Borme (BME)',
        sponsor_department: 'Commercial Dept',
        progress_percentage: 40,
        status: 'RISK_ASSESSMENT',
        created_at: now,
        updated_at: now
      },
      {
        id: 'moc-002',
        moc_number: 'MOC-26-011',
        title: 'Transisi Vendor Avtur Utama di Dekai (DKI)',
        sponsor_department: 'Procurement',
        progress_percentage: 85,
        status: 'IMPLEMENTATION',
        created_at: now,
        updated_at: now
      },
      {
        id: 'moc-003',
        moc_number: 'MOC-26-010',
        title: 'Pergantian Posisi Chief of Pilot',
        sponsor_department: 'HR & Flight Ops',
        progress_percentage: 100,
        status: 'CLOSED',
        created_at: now,
        updated_at: now
      }
    ];
    for (const m of mocs) {
      sqlite
        .prepare(
          `INSERT OR REPLACE INTO safety_mocs (id, moc_number, title, sponsor_department, progress_percentage, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          m.id,
          m.moc_number,
          m.title,
          m.sponsor_department,
          m.progress_percentage,
          m.status,
          m.created_at,
          m.updated_at
        );
    }

    // ============================================================================
    // 9. REGULATORY COMPLIANCE REPORTS (MOR)
    // ============================================================================
    sqlite
      .prepare(
        `INSERT OR REPLACE INTO regulatory_compliance_reports (id, reference_number, source_report_id, report_type, target_authority, generated_by_user_id, generated_at, submitted_at, authority_receipt_number, status, created_at, updated_at)
       VALUES ('reg-001', 'MOR-2026-001', 'srep-002', 'MOR', 'DKUPPU', 'emp-001', ?, ?, 'DGCA-REC-88412', 'SUBMITTED', ?, ?)`
      )
      .run(ctx.at(-1, '09:00'), ctx.at(-1, '11:00'), ctx.at(-1, '09:00'), ctx.at(-1, '11:00'));
  });

  seed.immediate();
}
