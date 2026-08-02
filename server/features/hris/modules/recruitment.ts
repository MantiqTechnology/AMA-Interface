import type Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import type {
  ApplicantInput,
  ApplicantStageUpdate,
  JobPostingInput
} from '../../../../shared/features/hris';
import { notFound } from '../../../utils/errors';
import { generateNextNumber, now, num, str, type Row } from './types';

export class RecruitmentModule {
  constructor(public readonly sqlite: Database.Database) {}

  listJobPostings() {
    const rows = this.sqlite
      .prepare(
        `SELECT p.*, d.department_name, s.station_code,
                (SELECT COUNT(*) FROM hris_applicants a WHERE a.job_posting_id = p.id) applicant_count
         FROM hris_job_postings p
         JOIN departments d ON d.id = p.department_id
         LEFT JOIN stations s ON s.id = p.station_id
         ORDER BY p.created_at DESC`
      )
      .all() as Row[];

    return rows.map((r) => ({
      id: String(r.id),
      postingNumber: String(r.posting_number),
      positionTitle: String(r.position_title),
      departmentId: String(r.department_id),
      departmentName: String(r.department_name),
      stationId: str(r.station_id),
      stationCode: str(r.station_code),
      employmentType: String(r.employment_type),
      description: str(r.description),
      requirements: str(r.requirements),
      vacancies: num(r.vacancies),
      status: String(r.status),
      applicantCount: num(r.applicant_count),
      createdAt: String(r.created_at)
    }));
  }

  createJobPosting(
    input: Partial<JobPostingInput> & { positionTitle: string; departmentId: string },
    createdBy: string = 'usr-admin'
  ) {
    const timestamp = now();
    const postingNum = generateNextNumber(this.sqlite, 'JOB_POSTING', 'JOB');
    const id = `job-${nanoid(10)}`;

    this.sqlite
      .prepare(
        `INSERT INTO hris_job_postings
         (id, posting_number, position_title, department_id, station_id, employment_type, description, requirements, vacancies, status, posted_at, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?)`
      )
      .run(
        id,
        postingNum,
        input.positionTitle,
        input.departmentId,
        input.stationId ?? null,
        input.employmentType,
        input.description ?? null,
        input.requirements ?? null,
        input.vacancies,
        timestamp.slice(0, 10),
        createdBy,
        timestamp,
        timestamp
      );

    return this.listJobPostings().find((p) => p.id === id)!;
  }

  updateJobPosting(id: string, input: Partial<JobPostingInput>) {
    const timestamp = now();
    const existing = this.sqlite
      .prepare('SELECT id FROM hris_job_postings WHERE id = ?')
      .get(id) as Row | undefined;
    if (!existing) throw notFound('Job Posting', id);

    this.sqlite
      .prepare(
        `UPDATE hris_job_postings SET
          position_title = COALESCE(?, position_title),
          department_id = COALESCE(?, department_id),
          station_id = COALESCE(?, station_id),
          employment_type = COALESCE(?, employment_type),
          description = COALESCE(?, description),
          requirements = COALESCE(?, requirements),
          vacancies = COALESCE(?, vacancies),
          status = COALESCE(?, status),
          updated_at = ?
         WHERE id = ?`
      )
      .run(
        input.positionTitle ?? null,
        input.departmentId ?? null,
        input.stationId ?? null,
        input.employmentType ?? null,
        input.description ?? null,
        input.requirements ?? null,
        input.vacancies ?? null,
        input.status ?? null,
        timestamp,
        id
      );

    return this.listJobPostings().find((p) => p.id === id)!;
  }

  deleteJobPosting(id: string) {
    this.sqlite.prepare("UPDATE hris_job_postings SET status = 'CLOSED' WHERE id = ?").run(id);
    return { success: true };
  }

  listApplicants(jobPostingId?: string) {
    try {
      this.sqlite.exec(
        'ALTER TABLE hris_applicants ADD COLUMN interviewer_employee_id TEXT REFERENCES employees(id)'
      );
    } catch {}
    try {
      this.sqlite.exec('ALTER TABLE hris_applicants ADD COLUMN interview_scheduled_at TEXT');
    } catch {}

    const where = ['1=1'];
    const params: unknown[] = [];

    if (jobPostingId) {
      where.push('a.job_posting_id = ?');
      params.push(jobPostingId);
    }

    const rows = this.sqlite
      .prepare(
        `SELECT a.*, p.position_title, p.posting_number,
                interviewer.full_name interviewer_name, interviewer.position_title interviewer_position
         FROM hris_applicants a
         JOIN hris_job_postings p ON p.id = a.job_posting_id
         LEFT JOIN employees interviewer ON interviewer.id = a.interviewer_employee_id
         WHERE ${where.join(' AND ')}
         ORDER BY a.created_at DESC`
      )
      .all(...params) as Row[];

    return rows.map((r) => ({
      id: String(r.id),
      applicantNumber: String(r.applicant_number),
      jobPostingId: String(r.job_posting_id),
      postingNumber: String(r.posting_number),
      positionTitle: String(r.position_title),
      fullName: String(r.full_name),
      email: str(r.email),
      phone: str(r.phone),
      resumeReference: str(r.resume_reference),
      stage: String(r.stage),
      interviewerEmployeeId: str(r.interviewer_employee_id),
      interviewerName: str(r.interviewer_name),
      interviewerPosition: str(r.interviewer_position),
      interviewScheduledAt: str(r.interview_scheduled_at),
      notes: str(r.notes),
      convertedEmployeeId: str(r.converted_employee_id),
      createdAt: String(r.created_at)
    }));
  }

  createApplicant(input: ApplicantInput) {
    const timestamp = now();
    const appNum = generateNextNumber(this.sqlite, 'APPLICANT', 'APP');
    const id = `app-${nanoid(10)}`;

    this.sqlite
      .prepare(
        `INSERT INTO hris_applicants
         (id, applicant_number, job_posting_id, full_name, email, phone, resume_reference, stage, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'APPLIED', ?, ?, ?)`
      )
      .run(
        id,
        appNum,
        input.jobPostingId,
        input.fullName,
        input.email ?? null,
        input.phone ?? null,
        input.resumeReference ?? null,
        input.notes ?? null,
        timestamp,
        timestamp
      );

    return this.listApplicants(input.jobPostingId).find((a) => a.id === id)!;
  }

  updateApplicantStage(id: string, input: ApplicantStageUpdate) {
    const timestamp = now();

    const app = this.sqlite.prepare('SELECT * FROM hris_applicants WHERE id = ?').get(id) as
      Row | undefined;

    if (!app) throw notFound('Applicant', id);

    let convertedEmployeeId: string | null = str(app.converted_employee_id);

    if (input.stage === 'ACCEPTED' && !convertedEmployeeId) {
      const job = this.sqlite
        .prepare('SELECT position_title, department_id FROM hris_job_postings WHERE id = ?')
        .get(app.job_posting_id) as Row | undefined;

      const empId = `emp-${nanoid(10)}`;
      const empCode = generateNextNumber(this.sqlite, 'EMPLOYEE', 'EMP');

      this.sqlite
        .prepare(
          `INSERT INTO employees
           (id, employee_code, full_name, position_title, department_id, phone, email, employment_status, employment_type, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'PROBATION', ?, ?)`
        )
        .run(
          empId,
          empCode,
          app.full_name,
          job?.position_title ?? 'New Employee',
          job?.department_id ?? null,
          app.phone,
          app.email,
          timestamp,
          timestamp
        );

      convertedEmployeeId = empId;
    }

    this.sqlite
      .prepare(
        `UPDATE hris_applicants SET
          stage = ?, interviewer_employee_id = COALESCE(?, interviewer_employee_id),
          interview_scheduled_at = COALESCE(?, interview_scheduled_at),
          notes = COALESCE(?, notes), converted_employee_id = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        input.stage,
        input.interviewerEmployeeId ?? null,
        input.interviewScheduledAt ?? null,
        input.notes ?? null,
        convertedEmployeeId,
        timestamp,
        id
      );

    return this.listApplicants().find((a) => a.id === id)!;
  }
}
