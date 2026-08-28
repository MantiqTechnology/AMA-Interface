import type { DemoCapabilityResponse } from '../../shared/contracts/demo-capabilities';
import { defineApiEventHandler } from '../utils/api-response';
import { requireDemoPermission } from '../utils/auth';

export default defineApiEventHandler((event): DemoCapabilityResponse => {
  requireDemoPermission(event, 'capability.preview.read');
  return {
    mode: 'CONCEPT_PREVIEW',
    source: 'SYNTHETIC_FIXTURE',
    nonOperational: true,
    generatedAt: new Date().toISOString(),
    sections: [
      {
        id: 'offline-sync',
        title: 'Offline & Sync',
        subtitle: 'Planned station continuity with a safety-first synchronization boundary.',
        implementationStatus: 'NOT_IMPLEMENTED',
        items: [
          {
            id: 'SYNC-001',
            label: 'WMX station evidence draft',
            status: 'QUEUED',
            owner: 'Station Admin WMX',
            summary: 'Synthetic checklist evidence is waiting for connectivity.',
            detail: 'Concept flow: LOCAL_DRAFT → QUEUED → SYNCING → SERVER_ACCEPTED.'
          },
          {
            id: 'SYNC-002',
            label: 'Manifest revision conflict',
            status: 'CONFLICT',
            owner: 'OCC',
            summary: 'Server revision changed while the station draft was pending.',
            detail:
              'The future workflow requires an explicit compare-and-resolve decision; it never silently overwrites the server record.'
          },
          {
            id: 'SYNC-GATE',
            label: 'Safety-critical actions',
            status: 'BLOCKED',
            owner: 'System',
            summary:
              'Departure, closure, approval, posting and technical release remain online-only.',
            detail: 'This is a proposed safety boundary, not an implemented offline capability.'
          }
        ]
      },
      {
        id: 'sms',
        title: 'Safety Management System',
        subtitle: 'Hazard and occurrence lifecycle from initial report to effectiveness review.',
        implementationStatus: 'NOT_IMPLEMENTED',
        items: [
          {
            id: 'SMS-HZR-2026-014',
            label: 'Unstable approach trend at remote strip',
            status: 'REVIEW',
            owner: 'Safety Manager',
            summary: 'Synthetic occurrence awaiting risk triage.',
            detail:
              'Proposed lifecycle: Report → Triage → Risk assessment → Mitigation/CAPA → Effectiveness review → Closure.'
          },
          {
            id: 'SMS-CAPA-2026-008',
            label: 'Remote-strip briefing reinforcement',
            status: 'PLANNED',
            owner: 'Flight Operations',
            summary: 'Illustrative corrective action connected to the synthetic hazard.',
            detail: 'No report, risk score, approval or CAPA is persisted by this preview.'
          }
        ]
      },
      {
        id: 'avsec',
        title: 'Aviation Security',
        subtitle: 'Need-to-know incident handling and evidence custody at a high level.',
        implementationStatus: 'NOT_IMPLEMENTED',
        items: [
          {
            id: 'AVSEC-2026-006',
            label: 'Restricted-area access anomaly',
            status: 'REVIEW',
            owner: 'AVSEC Duty Officer',
            summary: 'Synthetic incident classified for need-to-know review.',
            detail:
              'Concept only: classify → restrict access → record evidence handoff → preserve custody → authorized closure.'
          },
          {
            id: 'AVSEC-EVD-006-A',
            label: 'Evidence custody handoff',
            status: 'PLANNED',
            owner: 'Authorized investigator',
            summary:
              'Illustrates identity, time and custody acknowledgement without exposing sensitive procedures.',
            detail:
              'The preview does not contain real evidence, security instructions, or a compliance assertion.'
          }
        ]
      }
    ]
  };
});
