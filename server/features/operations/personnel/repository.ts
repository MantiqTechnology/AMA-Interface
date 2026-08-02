import { and, asc, desc, eq, like, or, sql, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import {
  crews,
  departments,
  personnelAuditLogs,
  personnelLicenses,
  personnelMedicalCertificates,
  personnelNotes,
  personnelQualifications,
  stations
} from '../../../db/schema';
import type {
  PersonnelDetailDto,
  PersonnelDto,
  PersonnelFlyingHoursDto,
  PersonnelInput,
  PersonnelLicenseDto,
  PersonnelLicenseInput,
  PersonnelListQuery,
  PersonnelMedicalCertificateDto,
  PersonnelMedicalCertificateInput,
  PersonnelQualificationInput,
  PersonnelOption
} from '../../../../shared/features/operations/personnel';

function toDto(row: typeof crews.$inferSelect): PersonnelDto {
  return {
    id: row.id,
    employeeCode: row.employeeCode,
    fullName: row.fullName,
    crewRole: row.crewRole,
    licenseType: row.licenseType,
    licenseNumber: row.licenseNumber,
    licenseExpiryDate: row.licenseExpiryDate,
    medicalExpiryDate: row.medicalExpiryDate,
    baseStationId: row.baseStationId,
    availabilityStatus: row.availabilityStatus,
    dutyStationId: row.dutyStationId,
    readinessNote: row.readinessNote,
    unit: row.unit,
    departmentId: row.departmentId,
    employmentStatus: row.employmentStatus,
    lifecycleStatus: row.lifecycleStatus,
    version: row.version,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function toLicenseDto(row: typeof personnelLicenses.$inferSelect): PersonnelLicenseDto {
  return {
    id: row.id,
    personnelId: row.personnelId,
    licenseType: row.licenseType,
    licenseNumber: row.licenseNumber,
    issuingAuthority: row.issuingAuthority,
    issueDate: row.issueDate,
    expiryDate: row.expiryDate,
    isPrimary: row.isPrimary,
    status: row.status as PersonnelLicenseDto['status'],
    documentId: row.documentId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function toMedicalDto(
  row: typeof personnelMedicalCertificates.$inferSelect
): PersonnelMedicalCertificateDto {
  return {
    id: row.id,
    personnelId: row.personnelId,
    certificateType: row.certificateType,
    certificateNumber: row.certificateNumber,
    issueDate: row.issueDate,
    expiryDate: row.expiryDate,
    status: row.status as PersonnelMedicalCertificateDto['status'],
    restrictions: row.restrictions,
    issuingAuthority: row.issuingAuthority,
    documentId: row.documentId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class PersonnelRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(query: PersonnelListQuery): Promise<PersonnelDto[]> {
    const conditions: SQL[] = [];
    if (query.active === 'active') conditions.push(eq(crews.isActive, true));
    if (query.active === 'inactive') conditions.push(eq(crews.isActive, false));
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          like(crews.employeeCode, term),
          like(crews.fullName, term),
          like(crews.licenseNumber, term),
          like(crews.unit, term),
          like(crews.readinessNote, term)
        ) as SQL
      );
    }
    const rows = await this.db
      .select()
      .from(crews)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(crews.employeeCode));
    return rows.map(toDto);
  }

  async getById(id: string): Promise<PersonnelDto | null> {
    const row = await this.db.select().from(crews).where(eq(crews.id, id)).get();
    return row ? toDto(row) : null;
  }

  async getActiveDepartmentById(id: string) {
    return await this.db
      .select({
        id: departments.id,
        departmentCode: departments.departmentCode,
        departmentName: departments.departmentName,
        isActive: departments.isActive
      })
      .from(departments)
      .where(and(eq(departments.id, id), eq(departments.isActive, true)))
      .get();
  }

  async getDetailById(id: string): Promise<PersonnelDetailDto | null> {
    const row = await this.db.select().from(crews).where(eq(crews.id, id)).get();
    if (!row) return null;
    const [
      baseStation,
      dutyStation,
      primaryLicense,
      currentMedicalCertificate,
      supervisor,
      department
    ] = await Promise.all([
      row.baseStationId ? this.stationSummary(row.baseStationId) : Promise.resolve(null),
      row.dutyStationId ? this.stationSummary(row.dutyStationId) : Promise.resolve(null),
      this.primaryLicense(id),
      this.currentMedicalCertificate(id),
      row.supervisorPersonnelId
        ? this.personnelSummary(row.supervisorPersonnelId)
        : Promise.resolve(null),
      row.departmentId ? this.departmentSummary(row.departmentId) : Promise.resolve(null)
    ]);
    const flyingHours = await this.flyingHours(id);
    const dto = toDto(row);
    return {
      ...dto,
      dateOfBirth: row.dateOfBirth,
      nationalityCode: row.nationalityCode,
      nationalityName: row.nationalityCode === 'ID' ? 'Indonesia' : row.nationalityCode,
      gender: row.gender,
      phone: row.phone,
      email: row.email,
      lifecycleStatus: row.lifecycleStatus,
      version: row.version,
      baseStation,
      dutyStation,
      unitSummary: department ?? (row.unit ? { id: row.unit, unitName: row.unit } : null),
      supervisor,
      primaryLicense,
      currentMedicalCertificate,
      flyingHoursSummary: { totalMinutes: flyingHours.totalMinutes, asOf: flyingHours.asOf },
      readiness: {
        personnelId: id,
        ready: true,
        blockers: [],
        evaluatedAt: flyingHours.asOf
      }
    };
  }

  async create(id: string, input: PersonnelInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .insert(crews)
      .values({
        id,
        ...values,
        lifecycleStatus: 'ACTIVE',
        version: 1,
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp
      })
      .returning()
      .get();
    return toDto(row);
  }

  async update(id: string, input: PersonnelInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .update(crews)
      .set({ ...values, version: sql`${crews.version} + 1`, updatedAt: timestamp })
      .where(eq(crews.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async updateWithVersion(
    id: string,
    input: Partial<PersonnelInput>,
    timestamp: string,
    version?: number
  ) {
    const conditions: SQL[] = [eq(crews.id, id)];
    if (version) conditions.push(eq(crews.version, version));
    const row = await this.db
      .update(crews)
      .set({ ...input, version: sql`${crews.version} + 1`, updatedAt: timestamp })
      .where(and(...conditions))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async setActive(id: string, isActive: boolean, timestamp: string) {
    const row = await this.db
      .update(crews)
      .set({
        isActive,
        lifecycleStatus: isActive ? 'ACTIVE' : 'INACTIVE',
        version: sql`${crews.version} + 1`,
        updatedAt: timestamp
      })
      .where(eq(crews.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async archive(id: string, timestamp: string) {
    const row = await this.db
      .update(crews)
      .set({
        isActive: false,
        lifecycleStatus: 'ARCHIVED',
        availabilityStatus: 'UNAVAILABLE',
        version: sql`${crews.version} + 1`,
        updatedAt: timestamp
      })
      .where(eq(crews.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async listLicenses(personnelId: string) {
    const rows = await this.db
      .select()
      .from(personnelLicenses)
      .where(eq(personnelLicenses.personnelId, personnelId))
      .orderBy(desc(personnelLicenses.isPrimary), desc(personnelLicenses.expiryDate));
    return rows.map(toLicenseDto);
  }

  async addLicense(
    id: string,
    personnelId: string,
    input: PersonnelLicenseInput,
    timestamp: string
  ) {
    if (input.isPrimary) await this.clearPrimaryLicense(personnelId, timestamp);
    const row = await this.db
      .insert(personnelLicenses)
      .values({ id, personnelId, ...input, createdAt: timestamp, updatedAt: timestamp })
      .returning()
      .get();
    if (row.isPrimary) await this.syncLegacyLicense(personnelId, toLicenseDto(row), timestamp);
    return toLicenseDto(row);
  }

  async updateLicense(
    id: string,
    personnelId: string,
    input: PersonnelLicenseInput,
    timestamp: string
  ) {
    if (input.isPrimary) await this.clearPrimaryLicense(personnelId, timestamp);
    const row = await this.db
      .update(personnelLicenses)
      .set({ ...input, updatedAt: timestamp })
      .where(and(eq(personnelLicenses.id, id), eq(personnelLicenses.personnelId, personnelId)))
      .returning()
      .get();
    if (row?.isPrimary) await this.syncLegacyLicense(personnelId, toLicenseDto(row), timestamp);
    return row ? toLicenseDto(row) : null;
  }

  async setPrimaryLicense(id: string, personnelId: string, timestamp: string) {
    await this.clearPrimaryLicense(personnelId, timestamp);
    const row = await this.db
      .update(personnelLicenses)
      .set({ isPrimary: true, updatedAt: timestamp })
      .where(and(eq(personnelLicenses.id, id), eq(personnelLicenses.personnelId, personnelId)))
      .returning()
      .get();
    if (row) await this.syncLegacyLicense(personnelId, toLicenseDto(row), timestamp);
    return row ? toLicenseDto(row) : null;
  }

  async setLicenseStatus(
    id: string,
    personnelId: string,
    status: PersonnelLicenseDto['status'],
    timestamp: string
  ) {
    const row = await this.db
      .update(personnelLicenses)
      .set({ status, isPrimary: false, updatedAt: timestamp })
      .where(and(eq(personnelLicenses.id, id), eq(personnelLicenses.personnelId, personnelId)))
      .returning()
      .get();
    return row ? toLicenseDto(row) : null;
  }

  async listMedicalCertificates(personnelId: string) {
    const rows = await this.db
      .select()
      .from(personnelMedicalCertificates)
      .where(eq(personnelMedicalCertificates.personnelId, personnelId))
      .orderBy(desc(personnelMedicalCertificates.expiryDate));
    return rows.map(toMedicalDto);
  }

  async addMedicalCertificate(
    id: string,
    personnelId: string,
    input: PersonnelMedicalCertificateInput,
    timestamp: string
  ) {
    await this.db
      .update(personnelMedicalCertificates)
      .set({ status: 'SUPERSEDED', updatedAt: timestamp })
      .where(
        and(
          eq(personnelMedicalCertificates.personnelId, personnelId),
          eq(personnelMedicalCertificates.certificateType, input.certificateType),
          eq(personnelMedicalCertificates.status, 'ACTIVE')
        )
      );
    const row = await this.db
      .insert(personnelMedicalCertificates)
      .values({ id, personnelId, ...input, createdAt: timestamp, updatedAt: timestamp })
      .returning()
      .get();
    await this.db
      .update(crews)
      .set({
        medicalExpiryDate: row.expiryDate,
        version: sql`${crews.version} + 1`,
        updatedAt: timestamp
      })
      .where(eq(crews.id, personnelId));
    return toMedicalDto(row);
  }

  async updateMedicalCertificate(
    id: string,
    personnelId: string,
    input: PersonnelMedicalCertificateInput,
    timestamp: string
  ) {
    const row = await this.db
      .update(personnelMedicalCertificates)
      .set({ ...input, updatedAt: timestamp })
      .where(
        and(
          eq(personnelMedicalCertificates.id, id),
          eq(personnelMedicalCertificates.personnelId, personnelId)
        )
      )
      .returning()
      .get();
    return row ? toMedicalDto(row) : null;
  }

  async listQualifications(personnelId: string) {
    return await this.db
      .select()
      .from(personnelQualifications)
      .where(eq(personnelQualifications.personnelId, personnelId))
      .orderBy(asc(personnelQualifications.qualificationType));
  }

  async addQualification(
    id: string,
    personnelId: string,
    input: PersonnelQualificationInput,
    timestamp: string
  ) {
    return await this.db
      .insert(personnelQualifications)
      .values({ id, personnelId, ...input, createdAt: timestamp, updatedAt: timestamp })
      .returning()
      .get();
  }

  async updateQualification(
    id: string,
    personnelId: string,
    input: PersonnelQualificationInput,
    timestamp: string
  ) {
    return await this.db
      .update(personnelQualifications)
      .set({ ...input, updatedAt: timestamp })
      .where(
        and(
          eq(personnelQualifications.id, id),
          eq(personnelQualifications.personnelId, personnelId)
        )
      )
      .returning()
      .get();
  }

  async listNotes(personnelId: string, includeRestricted: boolean) {
    const conditions: SQL[] = [eq(personnelNotes.personnelId, personnelId)];
    if (!includeRestricted) conditions.push(eq(personnelNotes.visibility, 'INTERNAL'));
    return await this.db
      .select()
      .from(personnelNotes)
      .where(and(...conditions))
      .orderBy(desc(personnelNotes.createdAt));
  }

  async listHistory(personnelId: string) {
    const rows = await this.db
      .select()
      .from(personnelAuditLogs)
      .where(eq(personnelAuditLogs.personnelId, personnelId))
      .orderBy(desc(personnelAuditLogs.occurredAt));
    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      actorName: row.actorName,
      changedFields: JSON.parse(row.changedFields || '[]') as string[],
      occurredAt: row.occurredAt,
      requestId: row.requestId
    }));
  }

  async audit(input: {
    id: string;
    personnelId: string;
    action: string;
    actorId: string | null;
    actorName: string | null;
    changedFields: string[];
    metadata?: unknown;
    requestId?: string | null;
    occurredAt: string;
  }) {
    await this.db.insert(personnelAuditLogs).values({
      id: input.id,
      personnelId: input.personnelId,
      action: input.action,
      actorId: input.actorId,
      actorName: input.actorName,
      changedFields: JSON.stringify(input.changedFields),
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      requestId: input.requestId ?? null,
      occurredAt: input.occurredAt
    });
  }

  async flyingHours(personnelId: string): Promise<PersonnelFlyingHoursDto> {
    const row = await this.db.get<{
      totalMinutes: number | null;
      captainMinutes: number | null;
      coPilotMinutes: number | null;
    }>(sql`
      SELECT
        SUM(CASE
          WHEN flight.actual_departure_at IS NOT NULL AND flight.actual_arrival_at IS NOT NULL
          THEN CAST((julianday(flight.actual_arrival_at) - julianday(flight.actual_departure_at)) * 1440 AS INTEGER)
          ELSE 0
        END) AS totalMinutes,
        SUM(CASE
          WHEN flight.pilot_in_command_id = ${personnelId}
          THEN CAST((julianday(flight.actual_arrival_at) - julianday(flight.actual_departure_at)) * 1440 AS INTEGER)
          ELSE 0
        END) AS captainMinutes,
        SUM(CASE
          WHEN flight.co_pilot_id = ${personnelId}
          THEN CAST((julianday(flight.actual_arrival_at) - julianday(flight.actual_departure_at)) * 1440 AS INTEGER)
          ELSE 0
        END) AS coPilotMinutes
      FROM flight_operations flight
      JOIN flight_operation_statuses status ON status.id = flight.current_status_id
      WHERE status.code = 'CLOSED'
        AND flight.actual_departure_at IS NOT NULL
        AND flight.actual_arrival_at IS NOT NULL
        AND (flight.pilot_in_command_id = ${personnelId} OR flight.co_pilot_id = ${personnelId})
    `);
    const captainMinutes = row?.captainMinutes ?? 0;
    const coPilotMinutes = row?.coPilotMinutes ?? 0;
    return {
      personnelId,
      totalMinutes: captainMinutes + coPilotMinutes,
      captainMinutes,
      coPilotMinutes,
      otherMinutes: 0,
      asOf: new Date().toISOString()
    };
  }

  private async stationSummary(id: string) {
    const row = await this.db
      .select({
        id: stations.id,
        stationCode: stations.stationCode,
        stationName: stations.stationName
      })
      .from(stations)
      .where(eq(stations.id, id))
      .get();
    return row ?? null;
  }

  private async personnelSummary(id: string) {
    const row = await this.db
      .select({
        id: crews.id,
        employeeCode: crews.employeeCode,
        fullName: crews.fullName,
        crewRole: crews.crewRole
      })
      .from(crews)
      .where(eq(crews.id, id))
      .get();
    return row ?? null;
  }

  private async departmentSummary(id: string) {
    const row = await this.db
      .select({
        id: departments.id,
        unitCode: departments.departmentCode,
        unitName: departments.departmentName
      })
      .from(departments)
      .where(eq(departments.id, id))
      .get();
    return row ?? null;
  }

  private async primaryLicense(personnelId: string) {
    const row = await this.db
      .select()
      .from(personnelLicenses)
      .where(
        and(eq(personnelLicenses.personnelId, personnelId), eq(personnelLicenses.isPrimary, true))
      )
      .orderBy(desc(personnelLicenses.updatedAt))
      .get();
    return row ? toLicenseDto(row) : null;
  }

  private async currentMedicalCertificate(personnelId: string) {
    const row = await this.db
      .select()
      .from(personnelMedicalCertificates)
      .where(
        and(
          eq(personnelMedicalCertificates.personnelId, personnelId),
          eq(personnelMedicalCertificates.status, 'ACTIVE')
        )
      )
      .orderBy(desc(personnelMedicalCertificates.expiryDate))
      .get();
    return row ? toMedicalDto(row) : null;
  }

  private async clearPrimaryLicense(personnelId: string, timestamp: string) {
    await this.db
      .update(personnelLicenses)
      .set({ isPrimary: false, updatedAt: timestamp })
      .where(eq(personnelLicenses.personnelId, personnelId));
  }

  private async syncLegacyLicense(
    personnelId: string,
    license: PersonnelLicenseDto,
    timestamp: string
  ) {
    await this.db
      .update(crews)
      .set({
        licenseType: license.licenseType,
        licenseNumber: license.licenseNumber,
        licenseExpiryDate: license.expiryDate,
        version: sql`${crews.version} + 1`,
        updatedAt: timestamp
      })
      .where(eq(crews.id, personnelId));
  }

  async options(): Promise<PersonnelOption[]> {
    return await this.db
      .select({
        id: crews.id,
        employeeCode: crews.employeeCode,
        fullName: crews.fullName,
        crewRole: crews.crewRole,
        licenseExpiryDate: crews.licenseExpiryDate,
        medicalExpiryDate: crews.medicalExpiryDate,
        baseStationId: crews.baseStationId,
        dutyStationId: crews.dutyStationId,
        availabilityStatus: crews.availabilityStatus,
        readinessNote: crews.readinessNote
      })
      .from(crews)
      .where(eq(crews.isActive, true))
      .orderBy(asc(crews.employeeCode));
  }
}
