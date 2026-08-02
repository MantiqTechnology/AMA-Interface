export const CREW_QUALIFICATION_TYPES = {
  aircraftType: 'AIRCRAFT_TYPE',
  crm: 'CRM',
  dangerousGoods: 'DANGEROUS_GOODS',
  medevac: 'MEDEVAC'
} as const;

export type CrewQualificationRequirement = {
  qualificationType: string;
  referenceType: string | null;
  referenceId: string | null;
  label: string;
};

export function normalizeQualificationCode(value: string | null | undefined) {
  return (value ?? '').toUpperCase().replaceAll(/[^A-Z0-9]/gu, '');
}

export function aircraftQualificationCode(aircraftType: string) {
  const normalized = normalizeQualificationCode(aircraftType);
  if (normalized.includes('PILATUSPC6') || normalized === 'PC6') return 'PC6';
  if (normalized.includes('CESSNACARAVAN208B') || normalized.includes('C208B')) return 'C208B';
  if (normalized.includes('PAC750XL')) return 'PAC750XL';
  return normalized;
}

export function qualificationTypeMatches(actual: string, required: string) {
  const normalized = normalizeQualificationCode(actual);
  const expected = normalizeQualificationCode(required);
  if (expected === 'AIRCRAFTTYPE') {
    return ['AIRCRAFTTYPE', 'AIRCRAFTTYPERATING', 'TYPERATING', 'FLEETQUALIFICATION'].includes(
      normalized
    );
  }
  return normalized === expected;
}

export function crewQualificationRequirements(input: {
  aircraftType: string;
  serviceTypeCode: string;
  hasDangerousGoods: boolean;
}) {
  const aircraftCode = aircraftQualificationCode(input.aircraftType);
  const requirements: CrewQualificationRequirement[] = [
    {
      qualificationType: CREW_QUALIFICATION_TYPES.crm,
      referenceType: 'TRAINING',
      referenceId: null,
      label: 'Crew Resource Management (CRM)'
    },
    {
      qualificationType: CREW_QUALIFICATION_TYPES.aircraftType,
      referenceType: 'AIRCRAFT_TYPE',
      referenceId: aircraftCode,
      label: `${aircraftCode} fleet qualification`
    }
  ];

  if (input.hasDangerousGoods) {
    requirements.push({
      qualificationType: CREW_QUALIFICATION_TYPES.dangerousGoods,
      referenceType: 'OPERATION',
      referenceId: null,
      label: 'Dangerous goods crew training'
    });
  }
  if (input.serviceTypeCode === 'MEDEVAC') {
    requirements.push({
      qualificationType: CREW_QUALIFICATION_TYPES.medevac,
      referenceType: 'OPERATION',
      referenceId: null,
      label: 'Medevac operational qualification'
    });
  }

  return requirements;
}
