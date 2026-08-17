import { z } from 'zod';
import { stationMaintenanceRequestInputSchema } from '#shared/contracts/station-maintenance';
import { defineApiEventHandler } from '#server/utils/api-response';
import {
  getDemoActorContext,
  getDemoActorId,
  getDemoRole,
  requireDemoPermission
} from '#server/utils/auth';
import { DomainError } from '#server/utils/errors';
import { getServices } from '#server/utils/services';
import { parseBody, parseParams } from '#server/utils/validation';

const paramsSchema = z.object({ id: z.string().trim().min(1) });

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'station.maintenance_request.create');
  const { id } = parseParams(event, paramsSchema);
  const input = await parseBody(event, stationMaintenanceRequestInputSchema);
  const services = getServices();
  const actor = getDemoActorContext(event);
  const [flight] = await services.flightOperations.getStationOperations({ flightId: id }, actor);

  if (!flight) {
    throw new DomainError(
      'FLIGHT_STATION_FORBIDDEN',
      'Flight tidak ditemukan atau berada di luar station scope.',
      404
    );
  }
  if (!flight.aircraftId) {
    throw new DomainError(
      'FLIGHT_AIRCRAFT_REQUIRED',
      'Flight harus memiliki aircraft sebelum maintenance request dibuat.',
      422
    );
  }

  const stationId = actor.stationCodes.includes(flight.originStationCode)
    ? flight.originStationId
    : flight.destinationStationId;
  const sourceReference = `STATION-FLIGHT:${flight.flightId}`;

  const detail = services.aircraftAirworthiness.reportDefect(
    flight.aircraftId,
    {
      title: input.title,
      description: input.description,
      detectedAt: input.detectedAt,
      reporterObservation: input.reporterObservation,
      initialSeverity: input.initialSeverity,
      operationalImpact: input.operationalImpact,
      flightPhase: input.flightPhase,
      stationId,
      sourceReference,
      evidenceReferences: input.evidenceReferences,
      expectedVersion: input.expectedAircraftVersion
    },
    { userId: getDemoActorId(event), role: getDemoRole(event) }
  );

  const defect = detail.defects.find((item) => item.sourceReference === sourceReference);
  if (!defect) {
    throw new DomainError(
      'MAINTENANCE_REQUEST_NOT_FOUND',
      'Maintenance request berhasil disimpan tetapi proyeksi defect tidak ditemukan.',
      500
    );
  }

  await services.flightOperations.recordMaintenanceRequestHandoff({
    flightId: flight.flightId,
    stationId,
    defectId: defect.id,
    defectNumber: defect.defectNumber,
    actor
  });

  return {
    id: defect.id,
    defectNumber: defect.defectNumber,
    flightId: flight.flightId,
    aircraftId: flight.aircraftId,
    title: defect.title,
    status: defect.status,
    assessmentDecision: null,
    workPackageId: null,
    workPackageNumber: null,
    workPackageStatus: null,
    materialStatus: null,
    releaseNumber: null,
    owner: 'MRO' as const,
    nextAction: 'Menunggu assessment MRO',
    updatedAt: defect.detectedAt
  };
});
