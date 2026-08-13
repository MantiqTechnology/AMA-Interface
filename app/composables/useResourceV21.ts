// =============================================================================
// Demo-v2.1: Operational Resource Control — API Composable
// =============================================================================

import type {
  DeclareResourceInput,
  CreateMaterialRequirementInput,
  ReserveMaterialInput,
  IssueMaterialInput,
  ReleaseMaterialReservationInput,
  InstallMaterialInput,
  ConsumeMaterialInput,
  ReturnMaterialInput,
  CreateToolRequirementInput,
  AllocateToolInput,
  AssignToolCustodyInput,
  ReturnToolInput,
  CreatePersonnelRequirementInput,
  AssignPersonnelInput,
  MaintenanceResourceReadinessDto,
  MaintenanceMaterialRequirementDto,
  MaintenanceInventoryReservationDto,
  MaintenanceMaterialInstallationDto,
  MaintenanceMaterialTraceabilityDto,
  MaintenanceAtpResultDto,
  MaintenanceToolRequirementDto,
  MaintenanceToolAllocationV2Dto,
  MaintenanceToolCandidateDto,
  MaintenancePersonnelRequirementDto,
  MaintenancePersonnelAssignmentDto,
  MaintenancePersonnelCandidateDto,
  MaintenanceAmoOrganizationDto,
  MroEligibilityResult,
  MaintenanceResourceDeclarationDto,
  MaintenanceReservationEventDto,
  MaintenanceToolAllocationEventDto,
  MaintenancePersonnelEligibilityEventDto
} from '#shared/features/maintenance-v21';

// ----- Confirmation result types -----

export type ConfirmPersonnelAssignmentInput = {
  assignmentId: string;
  idempotencyKey: string;
};

export type ReleasePersonnelInput = {
  assignmentId: string;
  reason: string;
  idempotencyKey: string;
};

export type CancelMaterialRequirementInput = {
  requirementId: string;
  reason: string;
};

export type CancelToolRequirementInput = {
  requirementId: string;
  reason: string;
};

export type ReleaseToolAllocationInput = {
  allocationId: string;
  reason: string;
  idempotencyKey: string;
};

// ----- Helpers -----

function genIdempotencyKey(prefix: string): string {
  if (import.meta.client && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function unavailableInM1(action: string): never {
  throw new Error(`${action} belum tersedia pada M1 Resource Integrity.`);
}

// ----- Composable -----

export function useResourceV21(workPackageId: MaybeRefOrGetter<string>) {
  const base = () => `/api/maintenance/work-packages/${toValue(workPackageId)}`;

  // ---- Resource Readiness ----

  async function fetchResourceReadiness(): Promise<MaintenanceResourceReadinessDto> {
    return fetchApi<MaintenanceResourceReadinessDto>(`${base()}/resource-readiness`);
  }

  // ---- Resource Declarations ----

  async function declareResource(
    input: DeclareResourceInput
  ): Promise<MaintenanceResourceDeclarationDto> {
    return fetchApi<MaintenanceResourceDeclarationDto>(`${base()}/resource-declarations`, {
      method: 'POST',
      body: input
    });
  }

  async function fetchDeclarations(): Promise<MaintenanceResourceDeclarationDto[]> {
    return fetchApi<MaintenanceResourceDeclarationDto[]>(`${base()}/resource-declarations`);
  }

  // ---- Material Requirements ----

  async function fetchMaterialRequirements(): Promise<MaintenanceMaterialRequirementDto[]> {
    return fetchApi<MaintenanceMaterialRequirementDto[]>(`${base()}/material-requirements`);
  }

  async function createMaterialRequirement(
    input: CreateMaterialRequirementInput
  ): Promise<MaintenanceMaterialRequirementDto> {
    return fetchApi<MaintenanceMaterialRequirementDto>(`${base()}/material-requirements`, {
      method: 'POST',
      body: input
    });
  }

  async function cancelMaterialRequirement(input: CancelMaterialRequirementInput): Promise<void> {
    void input;
    unavailableInM1('Cancel material requirement');
  }

  // ---- Material Reservations ----

  async function fetchMaterialReservations(): Promise<MaintenanceInventoryReservationDto[]> {
    return fetchApi<MaintenanceInventoryReservationDto[]>(`${base()}/material-reservations`);
  }

  async function reserveMaterial(
    input: ReserveMaterialInput
  ): Promise<MaintenanceInventoryReservationDto> {
    return fetchApi<MaintenanceInventoryReservationDto>(`${base()}/material-reservations`, {
      method: 'POST',
      body: input
    });
  }

  async function issueMaterial(
    input: IssueMaterialInput
  ): Promise<MaintenanceInventoryReservationDto> {
    return fetchApi<MaintenanceInventoryReservationDto>(`${base()}/material-issue`, {
      method: 'POST',
      body: input
    });
  }

  async function releaseMaterialReservation(
    input: ReleaseMaterialReservationInput
  ): Promise<MaintenanceInventoryReservationDto> {
    return fetchApi<MaintenanceInventoryReservationDto>(`${base()}/material-reservation-release`, {
      method: 'POST',
      body: input
    });
  }

  async function installMaterial(
    input: InstallMaterialInput
  ): Promise<MaintenanceMaterialInstallationDto> {
    return fetchApi<MaintenanceMaterialInstallationDto>(`${base()}/material-install`, {
      method: 'POST',
      body: input
    });
  }

  async function fetchMaterialTraceability(
    materialRequirementId?: string
  ): Promise<MaintenanceMaterialTraceabilityDto[]> {
    return fetchApi<MaintenanceMaterialTraceabilityDto[]>(`${base()}/material-traceability`, {
      query: materialRequirementId ? { materialRequirementId } : undefined
    });
  }

  async function consumeMaterial(
    input: ConsumeMaterialInput
  ): Promise<MaintenanceInventoryReservationDto> {
    return fetchApi<MaintenanceInventoryReservationDto>(`${base()}/material-consume`, {
      method: 'POST',
      body: input
    });
  }

  async function returnMaterial(
    input: ReturnMaterialInput
  ): Promise<MaintenanceInventoryReservationDto> {
    return fetchApi<MaintenanceInventoryReservationDto>(`${base()}/material-return`, {
      method: 'POST',
      body: input
    });
  }

  async function fetchReservationEvents(
    reservationId: string
  ): Promise<MaintenanceReservationEventDto[]> {
    void reservationId;
    unavailableInM1('Material reservation event history');
  }

  // ---- ATP ----

  async function fetchAtp(partId: string, stationId: string): Promise<MaintenanceAtpResultDto> {
    return fetchApi<MaintenanceAtpResultDto>(`${base()}/material-atp`, {
      query: { partId, stationId }
    });
  }

  // ---- Tool Requirements ----

  async function fetchToolRequirements(): Promise<MaintenanceToolRequirementDto[]> {
    return fetchApi<MaintenanceToolRequirementDto[]>(`${base()}/tool-requirements`);
  }

  async function fetchToolCandidates(
    requirementId: string
  ): Promise<MaintenanceToolCandidateDto[]> {
    return fetchApi<MaintenanceToolCandidateDto[]>(
      `${base()}/tool-requirements/${requirementId}/candidates`
    );
  }

  async function createToolRequirement(
    input: CreateToolRequirementInput
  ): Promise<MaintenanceToolRequirementDto> {
    return fetchApi<MaintenanceToolRequirementDto>(`${base()}/tool-requirements`, {
      method: 'POST',
      body: input
    });
  }

  async function cancelToolRequirement(input: CancelToolRequirementInput): Promise<void> {
    void input;
    unavailableInM1('Cancel tool requirement');
  }

  // ---- Tool Allocations ----

  async function fetchToolAllocations(): Promise<MaintenanceToolAllocationV2Dto[]> {
    return fetchApi<MaintenanceToolAllocationV2Dto[]>(`${base()}/tool-allocations`);
  }

  async function allocateTool(input: AllocateToolInput): Promise<MaintenanceToolAllocationV2Dto> {
    return fetchApi<MaintenanceToolAllocationV2Dto>(`${base()}/tool-allocations`, {
      method: 'POST',
      body: input
    });
  }

  async function assignToolCustody(
    input: AssignToolCustodyInput
  ): Promise<MaintenanceToolAllocationV2Dto> {
    return fetchApi<MaintenanceToolAllocationV2Dto>(`${base()}/tool-custody`, {
      method: 'POST',
      body: {
        allocationId: input.allocationId,
        custodianPersonnelId: input.custodianPersonnelId
      }
    });
  }

  async function returnTool(input: ReturnToolInput): Promise<MaintenanceToolAllocationV2Dto> {
    return fetchApi<MaintenanceToolAllocationV2Dto>(`${base()}/tool-return`, {
      method: 'POST',
      body: {
        allocationId: input.allocationId,
        returnCondition: input.returnCondition,
        returnNote: input.returnNote,
        idempotencyKey: input.idempotencyKey
      }
    });
  }

  async function releaseToolAllocation(input: ReleaseToolAllocationInput): Promise<void> {
    void input;
    unavailableInM1('Release tool allocation');
  }

  async function fetchToolAllocationEvents(
    allocationId: string
  ): Promise<MaintenanceToolAllocationEventDto[]> {
    void allocationId;
    unavailableInM1('Tool allocation event history');
  }

  // ---- Personnel Requirements ----

  async function fetchPersonnelRequirements(): Promise<MaintenancePersonnelRequirementDto[]> {
    return fetchApi<MaintenancePersonnelRequirementDto[]>(`${base()}/personnel-requirements`);
  }

  async function fetchPersonnelCandidates(
    requirementId: string
  ): Promise<MaintenancePersonnelCandidateDto[]> {
    return fetchApi<MaintenancePersonnelCandidateDto[]>(
      `${base()}/personnel-requirements/${requirementId}/candidates`
    );
  }

  async function createPersonnelRequirement(
    input: CreatePersonnelRequirementInput
  ): Promise<MaintenancePersonnelRequirementDto> {
    return fetchApi<MaintenancePersonnelRequirementDto>(`${base()}/personnel-requirements`, {
      method: 'POST',
      body: input
    });
  }

  // ---- Personnel Assignments ----

  async function fetchPersonnelAssignments(): Promise<MaintenancePersonnelAssignmentDto[]> {
    return fetchApi<MaintenancePersonnelAssignmentDto[]>(`${base()}/personnel-assignments`);
  }

  async function assignPersonnel(
    input: AssignPersonnelInput
  ): Promise<MaintenancePersonnelAssignmentDto> {
    return fetchApi<MaintenancePersonnelAssignmentDto>(`${base()}/personnel-assignments`, {
      method: 'POST',
      body: input
    });
  }

  async function confirmPersonnelAssignment(
    input: ConfirmPersonnelAssignmentInput
  ): Promise<MaintenancePersonnelAssignmentDto> {
    return fetchApi<MaintenancePersonnelAssignmentDto>(`${base()}/personnel-confirm`, {
      method: 'POST',
      body: { assignmentId: input.assignmentId }
    });
  }

  async function releasePersonnel(
    input: ReleasePersonnelInput
  ): Promise<MaintenancePersonnelAssignmentDto> {
    return fetchApi<MaintenancePersonnelAssignmentDto>(`${base()}/personnel-release`, {
      method: 'POST',
      body: { assignmentId: input.assignmentId }
    });
  }

  async function fetchPersonnelEligibilityEvents(
    assignmentId: string
  ): Promise<MaintenancePersonnelEligibilityEventDto[]> {
    void assignmentId;
    unavailableInM1('Personnel eligibility event history');
  }

  // ---- AMO Organization ----

  async function fetchAmoOrganization(): Promise<MaintenanceAmoOrganizationDto | null> {
    try {
      return await fetchApi<MaintenanceAmoOrganizationDto>(`${base()}/amo-organization`);
    } catch {
      return null;
    }
  }

  // ---- MRO Eligibility ----

  async function fetchMroEligibility(): Promise<MroEligibilityResult> {
    return fetchApi<MroEligibilityResult>(`${base()}/mro-eligibility`);
  }

  // ---- Utility ----

  function newKey(prefix = 'mro-v21'): string {
    return genIdempotencyKey(prefix);
  }

  return {
    fetchResourceReadiness,
    declareResource,
    fetchDeclarations,
    fetchMaterialRequirements,
    createMaterialRequirement,
    cancelMaterialRequirement,
    fetchMaterialReservations,
    reserveMaterial,
    issueMaterial,
    releaseMaterialReservation,
    installMaterial,
    fetchMaterialTraceability,
    consumeMaterial,
    returnMaterial,
    fetchReservationEvents,
    fetchAtp,
    fetchToolRequirements,
    fetchToolCandidates,
    createToolRequirement,
    cancelToolRequirement,
    fetchToolAllocations,
    allocateTool,
    assignToolCustody,
    returnTool,
    releaseToolAllocation,
    fetchToolAllocationEvents,
    fetchPersonnelRequirements,
    fetchPersonnelCandidates,
    createPersonnelRequirement,
    fetchPersonnelAssignments,
    assignPersonnel,
    confirmPersonnelAssignment,
    releasePersonnel,
    fetchPersonnelEligibilityEvents,
    fetchAmoOrganization,
    fetchMroEligibility,
    newKey
  };
}
