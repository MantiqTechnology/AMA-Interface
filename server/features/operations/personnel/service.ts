import { randomUUID } from 'node:crypto';
import type {
  PersonnelAvailabilityChange,
  PersonnelInput,
  PersonnelLicenseInput,
  PersonnelListQuery,
  PersonnelMedicalCertificateInput,
  PersonnelUpdateInput
} from '../../../../shared/features/operations/personnel';
import { DomainError, notFound } from '../../../utils/errors';
import { getApplicationNow } from '../../../utils/time';
import { StationsRepository } from '../stations/repository';
import { PersonnelRepository } from './repository';

const LICENSE_EXPIRY_WARNING_DAYS = 60;
const MEDICAL_EXPIRY_WARNING_DAYS = 30;

function daysUntil(date: string, nowIso = getApplicationNow()) {
  const now = new Date(nowIso);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const target = new Date(`${date}T00:00:00.000Z`);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

export class PersonnelService {
  constructor(
    private readonly repository: PersonnelRepository,
    private readonly stationsRepository: StationsRepository
  ) {}
  list(query: PersonnelListQuery) {
    return this.repository.list(query);
  }
  options() {
    return this.repository.options();
  }
  async get(id: string) {
    const row = await this.repository.getDetailById(id);
    if (!row) throw notFound('Personnel', id);
    row.readiness = this.evaluateReadiness(row);
    return row;
  }
  async create(input: PersonnelInput) {
    await this.validate(input);
    try {
      const timestamp = getApplicationNow();
      const created = await this.repository.create('crew-' + randomUUID(), input, timestamp);
      await this.audit(created.id, 'PERSONNEL_CREATED', Object.keys(input), timestamp);
      if (input.licenseType && input.licenseNumber) {
        await this.repository.addLicense(
          'plic-' + randomUUID(),
          created.id,
          {
            licenseType: input.licenseType,
            licenseNumber: input.licenseNumber,
            expiryDate: input.licenseExpiryDate,
            issueDate: null,
            issuingAuthority: null,
            documentId: null,
            isPrimary: true,
            status: this.expired(input.licenseExpiryDate) ? 'EXPIRED' : 'ACTIVE'
          },
          timestamp
        );
      }
      if (input.medicalExpiryDate) {
        await this.repository.addMedicalCertificate(
          'pmed-' + randomUUID(),
          created.id,
          {
            certificateType: 'Class 1 Medical',
            certificateNumber: null,
            issueDate: null,
            expiryDate: input.medicalExpiryDate,
            restrictions: null,
            issuingAuthority: null,
            documentId: null,
            status: this.expired(input.medicalExpiryDate) ? 'EXPIRED' : 'ACTIVE'
          },
          timestamp
        );
      }
      return created;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async update(id: string, input: PersonnelInput | PersonnelUpdateInput) {
    await this.get(id);
    await this.validate({ ...(await this.repository.getById(id)), ...input } as PersonnelInput, id);
    try {
      const { expectedVersion, ...values } = input as PersonnelUpdateInput;
      const timestamp = getApplicationNow();
      const row =
        expectedVersion === undefined
          ? await this.repository.update(id, values as PersonnelInput, timestamp)
          : await this.repository.updateWithVersion(
              id,
              values as Partial<PersonnelInput>,
              timestamp,
              expectedVersion
            );
      if (!row && expectedVersion !== undefined) {
        throw new DomainError(
          'PERSONNEL_VERSION_CONFLICT',
          'Personnel was updated by another request.',
          409
        );
      }
      if (!row) throw notFound('Personnel', id);
      await this.audit(id, 'PERSONNEL_UPDATED', Object.keys(values), timestamp);
      return row;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async setActive(id: string, isActive: boolean) {
    await this.get(id);
    const timestamp = getApplicationNow();
    const row = await this.repository.setActive(id, isActive, timestamp);
    if (!row) throw notFound('Personnel', id);
    await this.audit(
      id,
      isActive ? 'PERSONNEL_ACTIVATED' : 'PERSONNEL_DEACTIVATED',
      ['isActive'],
      timestamp
    );
    return row;
  }

  async archive(id: string) {
    await this.get(id);
    const timestamp = getApplicationNow();
    const row = await this.repository.archive(id, timestamp);
    if (!row) throw notFound('Personnel', id);
    await this.audit(id, 'PERSONNEL_ARCHIVED', ['lifecycleStatus', 'isActive'], timestamp);
    return row;
  }

  async changeAvailability(id: string, input: PersonnelAvailabilityChange) {
    const existing = await this.repository.getById(id);
    if (!existing) throw notFound('Personnel', id);
    if (existing.employmentStatus === 'INACTIVE' && input.availabilityStatus === 'AVAILABLE') {
      throw new DomainError(
        'PERSONNEL_INACTIVE_AVAILABLE_INVALID',
        'Inactive personnel cannot be marked available.',
        422
      );
    }
    return this.update(id, {
      availabilityStatus: input.availabilityStatus,
      readinessNote: input.note ?? existing.readinessNote
    });
  }

  async licenses(id: string) {
    await this.get(id);
    return this.repository.listLicenses(id);
  }

  async addLicense(id: string, input: PersonnelLicenseInput) {
    await this.get(id);
    this.validateLicense(input);
    const timestamp = getApplicationNow();
    const row = await this.repository.addLicense('plic-' + randomUUID(), id, input, timestamp);
    await this.audit(id, 'LICENSE_ADDED', Object.keys(input), timestamp);
    return row;
  }

  async updateLicense(id: string, licenseId: string, input: PersonnelLicenseInput) {
    await this.get(id);
    this.validateLicense(input);
    const timestamp = getApplicationNow();
    const row = await this.repository.updateLicense(licenseId, id, input, timestamp);
    if (!row) throw notFound('Personnel license', licenseId);
    await this.audit(id, 'LICENSE_UPDATED', Object.keys(input), timestamp);
    return row;
  }

  async setPrimaryLicense(id: string, licenseId: string) {
    const license = (await this.licenses(id)).find((item) => item.id === licenseId);
    if (!license) throw notFound('Personnel license', licenseId);
    if (license.status !== 'ACTIVE' || this.expired(license.expiryDate)) {
      throw new DomainError(
        'PERSONNEL_LICENSE_PRIMARY_INVALID',
        'Expired, suspended, or revoked licenses cannot become primary.',
        422
      );
    }
    const timestamp = getApplicationNow();
    const row = await this.repository.setPrimaryLicense(licenseId, id, timestamp);
    if (!row) throw notFound('Personnel license', licenseId);
    await this.audit(id, 'LICENSE_SET_PRIMARY', ['isPrimary'], timestamp);
    return row;
  }

  async setLicenseStatus(id: string, licenseId: string, status: 'SUSPENDED' | 'REVOKED') {
    await this.get(id);
    const timestamp = getApplicationNow();
    const row = await this.repository.setLicenseStatus(licenseId, id, status, timestamp);
    if (!row) throw notFound('Personnel license', licenseId);
    await this.audit(id, `LICENSE_${status}`, ['status'], timestamp);
    return row;
  }

  async medicalCertificates(id: string) {
    await this.get(id);
    return this.repository.listMedicalCertificates(id);
  }

  async addMedicalCertificate(id: string, input: PersonnelMedicalCertificateInput) {
    await this.get(id);
    const timestamp = getApplicationNow();
    const row = await this.repository.addMedicalCertificate(
      'pmed-' + randomUUID(),
      id,
      input,
      timestamp
    );
    await this.audit(id, 'MEDICAL_CERTIFICATE_ADDED', Object.keys(input), timestamp);
    return row;
  }

  async updateMedicalCertificate(
    id: string,
    certificateId: string,
    input: PersonnelMedicalCertificateInput
  ) {
    await this.get(id);
    const timestamp = getApplicationNow();
    const row = await this.repository.updateMedicalCertificate(certificateId, id, input, timestamp);
    if (!row) throw notFound('Medical certificate', certificateId);
    await this.audit(id, 'MEDICAL_CERTIFICATE_UPDATED', Object.keys(input), timestamp);
    return row;
  }

  async qualifications(id: string) {
    await this.get(id);
    return this.repository.listQualifications(id);
  }

  async notes(id: string, includeRestricted = false) {
    await this.get(id);
    return this.repository.listNotes(id, includeRestricted);
  }

  async history(id: string) {
    await this.get(id);
    return this.repository.listHistory(id);
  }

  async flyingHours(id: string) {
    await this.get(id);
    const row = await this.repository.flyingHours(id);
    return { ...row, asOf: getApplicationNow() };
  }

  private async validate(input: PersonnelInput, id?: string) {
    if (
      input.baseStationId &&
      !(await this.stationsRepository.getById(input.baseStationId))?.isActive
    )
      throw new DomainError(
        'CREW_BASE_STATION_ID_INVALID',
        'Base station must reference an active record.',
        422
      );
    if (
      input.dutyStationId &&
      !(await this.stationsRepository.getById(input.dutyStationId))?.isActive
    )
      throw new DomainError(
        'CREW_DUTY_STATION_ID_INVALID',
        'Duty station must reference an active record.',
        422
      );
    if (id && input.baseStationId && input.baseStationId === input.dutyStationId) {
      // Same station is valid operationally; keep this explicit to avoid hidden assumptions.
    }
    const anyInput = input as PersonnelInput & {
      supervisorPersonnelId?: string | null;
      email?: string | null;
    };
    if (anyInput.supervisorPersonnelId === id) {
      throw new DomainError(
        'PERSONNEL_SELF_SUPERVISOR_INVALID',
        'Personnel cannot supervise themselves.',
        422
      );
    }
    if (anyInput.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(anyInput.email)) {
      throw new DomainError('PERSONNEL_EMAIL_INVALID', 'Email address is invalid.', 422);
    }
    if (
      input.departmentId &&
      !(await this.repository.getActiveDepartmentById(input.departmentId))
    ) {
      throw new DomainError(
        'PERSONNEL_DEPARTMENT_INVALID',
        'Unit must reference an active department.',
        422
      );
    }
    if (
      (input.crewRole === 'PILOT_IN_COMMAND' || input.crewRole === 'CO_PILOT') &&
      (!input.licenseType ||
        !input.licenseNumber ||
        !input.licenseExpiryDate ||
        !input.medicalExpiryDate)
    )
      throw new DomainError(
        'CREW_LICENSE_REQUIRED',
        'Pilot and co-pilot records require license and medical expiry data.',
        422
      );
  }

  private validateLicense(input: PersonnelLicenseInput) {
    if (input.isPrimary && (input.status !== 'ACTIVE' || this.expired(input.expiryDate))) {
      throw new DomainError(
        'PERSONNEL_LICENSE_PRIMARY_INVALID',
        'Expired, suspended, or revoked licenses cannot become primary.',
        422
      );
    }
  }

  private expired(date: string | null | undefined) {
    return Boolean(date && daysUntil(date) < 0);
  }

  private evaluateReadiness(row: Awaited<ReturnType<PersonnelRepository['getDetailById']>>) {
    if (!row) throw new Error('Cannot evaluate missing personnel.');
    const blockers = [];
    if (!row.isActive || row.lifecycleStatus !== 'ACTIVE') {
      blockers.push({
        code: 'PERSONNEL_SUSPENDED',
        message: 'Personnel lifecycle is not active.',
        severity: 'CRITICAL' as const
      });
    }
    if (row.employmentStatus === 'INACTIVE') {
      blockers.push({
        code: 'EMPLOYMENT_INACTIVE',
        message: 'Employment status is inactive.',
        severity: 'CRITICAL' as const
      });
    }
    if (!['AVAILABLE', 'ON_DUTY'].includes(row.availabilityStatus)) {
      blockers.push({
        code: 'PERSONNEL_UNAVAILABLE',
        message: `Availability is ${row.availabilityStatus}.`,
        severity: 'WARNING' as const
      });
    }
    const license = row.primaryLicense;
    if (!license) {
      blockers.push({
        code: 'LICENSE_MISSING',
        message: 'Primary license is missing.',
        severity: 'CRITICAL' as const
      });
    } else if (license.status !== 'ACTIVE' || this.expired(license.expiryDate)) {
      blockers.push({
        code: 'LICENSE_EXPIRED',
        message: 'Primary license is expired or not active.',
        severity: 'CRITICAL' as const
      });
    } else if (license.expiryDate && daysUntil(license.expiryDate) <= LICENSE_EXPIRY_WARNING_DAYS) {
      blockers.push({
        code: 'LICENSE_EXPIRING_SOON',
        message: 'Primary license is expiring soon.',
        severity: 'WARNING' as const
      });
    }
    const medical = row.currentMedicalCertificate;
    if (!medical) {
      blockers.push({
        code: 'MEDICAL_MISSING',
        message: 'Current medical certificate is missing.',
        severity: 'CRITICAL' as const
      });
    } else if (medical.status !== 'ACTIVE' || this.expired(medical.expiryDate)) {
      blockers.push({
        code: 'MEDICAL_EXPIRED',
        message: 'Current medical certificate is expired or not active.',
        severity: 'CRITICAL' as const
      });
    } else if (daysUntil(medical.expiryDate) <= MEDICAL_EXPIRY_WARNING_DAYS) {
      blockers.push({
        code: 'MEDICAL_EXPIRING_SOON',
        message: 'Current medical certificate is expiring soon.',
        severity: 'WARNING' as const
      });
    }
    return {
      personnelId: row.id,
      ready: blockers.every((blocker) => blocker.severity !== 'CRITICAL'),
      blockers,
      evaluatedAt: getApplicationNow()
    };
  }

  private async audit(id: string, action: string, changedFields: string[], timestamp: string) {
    await this.repository.audit({
      id: 'paudit-' + randomUUID(),
      personnelId: id,
      action,
      actorId: 'USR-SYSTEM',
      actorName: 'AMA System',
      changedFields,
      occurredAt: timestamp
    });
  }
  private rethrowWriteError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed'))
      throw new DomainError(
        'CREW_DUPLICATE',
        'Personnel code or unique combination already exists.',
        409
      );
    if (message.includes('FOREIGN KEY constraint failed'))
      throw new DomainError('CREW_RELATION_INVALID', 'A related record is invalid.', 422);
    throw error;
  }
}
