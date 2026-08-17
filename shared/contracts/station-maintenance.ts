import { z } from 'zod';

export const stationMaintenanceRequestInputSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(3000),
  detectedAt: z.string().datetime(),
  reporterObservation: z
    .enum([
      'NO_SIGNIFICANT_IMPACT_OBSERVED',
      'MAY_AFFECT_OPERATION',
      'ATTENTION_BEFORE_NEXT_FLIGHT',
      'APPEARS_CRITICAL',
      'UNKNOWN'
    ])
    .default('UNKNOWN'),
  initialSeverity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNKNOWN']).default('UNKNOWN'),
  operationalImpact: z.string().trim().max(1000).nullable().default(null),
  flightPhase: z.string().trim().max(80).nullable().default(null),
  evidenceReferences: z.array(z.string().trim().min(1).max(240)).max(12).default([]),
  expectedAircraftVersion: z.coerce.number().int().positive()
});

export type StationMaintenanceRequestInput = z.infer<typeof stationMaintenanceRequestInputSchema>;

export type StationMaintenanceRequestDto = {
  id: string;
  defectNumber: string;
  flightId: string;
  aircraftId: string;
  title: string;
  status: string;
  assessmentDecision: string | null;
  workPackageId: string | null;
  workPackageNumber: string | null;
  workPackageStatus: string | null;
  materialStatus: string | null;
  releaseNumber: string | null;
  owner: 'MRO' | 'INVENTORY';
  nextAction: string;
  updatedAt: string;
};

export type StationTechnicalReadinessDto = {
  status: 'READY' | 'AT_RISK' | 'NOT_READY';
  blockerCode: string | null;
  blockerLabel: string | null;
  owner: 'STATION' | 'MRO' | 'INVENTORY' | null;
  nextAction: string | null;
  evaluatedAt: string;
};
