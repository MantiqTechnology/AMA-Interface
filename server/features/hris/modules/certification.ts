import type Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import type { CertificationInput, CertificationListQuery } from '../../../../shared/features/hris';
import { notFound } from '../../../utils/errors';
import { now, str, type Row } from './types';

export class CertificationModule {
  constructor(public readonly sqlite: Database.Database) {}

  mapCertification(r: Row) {
    return {
      id: String(r.id),
      employeeId: String(r.employee_id),
      employeeCode: str(r.employee_code),
      employeeName: str(r.employee_name),
      positionTitle: str(r.position_title),
      departmentName: str(r.department_name),
      certificationType: String(r.certification_type),
      certificateNumber: String(r.certificate_number),
      issuingAuthority: String(r.issuing_authority),
      issuedDate: String(r.issued_date),
      expiryDate: str(r.expiry_date),
      status: String(r.status),
      remarks: str(r.remarks),
      documentUrl: str(r.document_url),
      createdAt: String(r.created_at)
    };
  }

  listCertifications(query?: CertificationListQuery) {
    const where: string[] = ['1=1'];
    const params: unknown[] = [];

    if (query?.employeeId) {
      where.push('c.employee_id = ?');
      params.push(query.employeeId);
    }
    if (query?.certificationType) {
      where.push('c.certification_type = ?');
      params.push(query.certificationType);
    }
    if (query?.status) {
      where.push('c.status = ?');
      params.push(query.status);
    }

    const rows = this.sqlite
      .prepare(
        `SELECT c.*, e.employee_code, e.full_name employee_name, e.position_title, d.department_name
         FROM employee_certifications c
         JOIN employees e ON e.id = c.employee_id
         LEFT JOIN departments d ON d.id = e.department_id
         WHERE ${where.join(' AND ')}
         ORDER BY c.expiry_date ASC`
      )
      .all(...params) as Row[];

    return rows.map((r) => this.mapCertification(r));
  }

  createCertification(
    input: Partial<CertificationInput> & {
      employeeId: string;
      certificationType: string;
      certificateNumber: string;
      issuingAuthority: string;
      issuedDate: string;
      documentUrl?: string | null;
    }
  ) {
    try {
      this.sqlite.exec('ALTER TABLE employee_certifications ADD COLUMN document_url TEXT');
    } catch {}
    const timestamp = now();
    const id = `cert-${nanoid(10)}`;

    this.sqlite
      .prepare(
        `INSERT INTO employee_certifications
         (id, employee_id, certification_type, certificate_number, issuing_authority, issued_date, expiry_date, status, remarks, document_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.employeeId,
        input.certificationType,
        input.certificateNumber,
        input.issuingAuthority,
        input.issuedDate,
        input.expiryDate ?? null,
        input.status ?? 'ACTIVE',
        input.remarks ?? null,
        input.documentUrl ?? null,
        timestamp,
        timestamp
      );

    return this.listCertifications({ employeeId: input.employeeId }).find((c) => c.id === id)!;
  }

  updateCertification(
    id: string,
    input: Partial<CertificationInput> & { documentUrl?: string | null }
  ) {
    const timestamp = now();
    const existing = this.sqlite
      .prepare('SELECT id FROM employee_certifications WHERE id = ?')
      .get(id) as Row | undefined;
    if (!existing) throw notFound('Certification', id);

    this.sqlite
      .prepare(
        `UPDATE employee_certifications SET
          certification_type = COALESCE(?, certification_type),
          certificate_number = COALESCE(?, certificate_number),
          issuing_authority = COALESCE(?, issuing_authority),
          issued_date = COALESCE(?, issued_date),
          expiry_date = COALESCE(?, expiry_date),
          status = COALESCE(?, status),
          remarks = COALESCE(?, remarks),
          document_url = COALESCE(?, document_url),
          updated_at = ?
         WHERE id = ?`
      )
      .run(
        input.certificationType ?? null,
        input.certificateNumber ?? null,
        input.issuingAuthority ?? null,
        input.issuedDate ?? null,
        input.expiryDate ?? null,
        input.status ?? null,
        input.remarks ?? null,
        input.documentUrl ?? null,
        timestamp,
        id
      );

    return this.listCertifications({}).find((c) => c.id === id)!;
  }

  deleteCertification(id: string) {
    this.sqlite.prepare('DELETE FROM employee_certifications WHERE id = ?').run(id);
    return { success: true };
  }

  notifyEmployeeCertification(id: string) {
    const cert = this.listCertifications({}).find((c) => c.id === id);
    if (!cert) throw notFound('Certification', id);

    return {
      success: true,
      message: `Notifikasi pengingat perpanjangan sertifikat ${cert.certificationType} (${cert.certificateNumber}) telah dikirimkan ke ${cert.employeeName}.`
    };
  }

  getCertificationAlerts() {
    const today = now().slice(0, 10);
    const in90Days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const rows = this.sqlite
      .prepare(
        `SELECT c.*, e.employee_code, e.full_name employee_name, e.position_title, d.department_name
         FROM employee_certifications c
         JOIN employees e ON e.id = c.employee_id
         LEFT JOIN departments d ON d.id = e.department_id
         WHERE c.expiry_date IS NOT NULL AND c.expiry_date <= ? AND c.status = 'ACTIVE'
         ORDER BY c.expiry_date ASC`
      )
      .all(in90Days) as Row[];

    return rows.map((r) => {
      const exp = String(r.expiry_date);
      let alertLevel: 'EXPIRED' | 'CRITICAL_30' | 'WARNING_60' | 'WARNING_90' = 'WARNING_90';
      if (exp < today) alertLevel = 'EXPIRED';
      else {
        const diffDays = Math.ceil(
          (new Date(exp).getTime() - new Date(today).getTime()) / (1000 * 3600 * 24)
        );
        if (diffDays <= 30) alertLevel = 'CRITICAL_30';
        else if (diffDays <= 60) alertLevel = 'WARNING_60';
      }

      return {
        ...this.mapCertification(r),
        alertLevel
      };
    });
  }
}
