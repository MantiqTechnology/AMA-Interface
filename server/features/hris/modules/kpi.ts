import type Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import type {
  KpiAssessmentUpdate,
  KpiAssignMultiInput,
  KpiPeriodInput,
  KpiTemplateInput
} from '../../../../shared/features/hris';
import { DomainError, notFound } from '../../../utils/errors';
import { bool, now, num, str, type Row } from './types';

export class KpiModule {
  constructor(public readonly sqlite: Database.Database) {}

  listKpiPeriods() {
    const rows = this.sqlite
      .prepare('SELECT * FROM hris_kpi_periods ORDER BY start_date DESC')
      .all() as Row[];

    return rows.map((r) => ({
      id: String(r.id),
      periodName: String(r.period_name),
      startDate: String(r.start_date),
      endDate: String(r.end_date),
      status: String(r.status)
    }));
  }

  createKpiPeriod(input: KpiPeriodInput) {
    const timestamp = now();
    const id = `kpip-${nanoid(10)}`;

    this.sqlite
      .prepare(
        'INSERT INTO hris_kpi_periods (id, period_name, start_date, end_date, status, created_at, updated_at) VALUES (?, ?, ?, ?, "ACTIVE", ?, ?)'
      )
      .run(id, input.periodName, input.startDate, input.endDate, timestamp, timestamp);

    return this.listKpiPeriods().find((p) => p.id === id)!;
  }

  listKpiTemplates(departmentId?: string) {
    const where = ['t.is_active = 1'];
    const params: unknown[] = [];

    if (departmentId && departmentId !== 'ALL') {
      where.push('(t.department_id = ? OR t.department_id IS NULL)');
      params.push(departmentId);
    }

    const templates = this.sqlite
      .prepare(
        `SELECT t.*, d.department_name
         FROM hris_kpi_templates t
         LEFT JOIN departments d ON d.id = t.department_id
         WHERE ${where.join(' AND ')}
         ORDER BY t.template_name ASC`
      )
      .all(...params) as Row[];

    return templates.map((t) => {
      const indicators = this.sqlite
        .prepare(
          'SELECT * FROM hris_kpi_indicators WHERE template_id = ? ORDER BY sort_order ASC, created_at ASC'
        )
        .all(t.id) as Row[];

      return {
        id: String(t.id),
        templateName: String(t.template_name),
        departmentId: str(t.department_id),
        departmentName: str(t.department_name),
        isActive: bool(t.is_active),
        indicators: indicators.map((ind) => ({
          id: String(ind.id),
          indicatorName: String(ind.indicator_name),
          weight: num(ind.weight),
          targetValue: str(ind.target_value),
          unit: str(ind.unit)
        }))
      };
    });
  }

  createKpiTemplate(input: KpiTemplateInput) {
    const timestamp = now();
    const templateId = `kpit-${nanoid(10)}`;

    this.sqlite.transaction(() => {
      this.sqlite
        .prepare(
          `INSERT INTO hris_kpi_templates (id, template_name, department_id, is_active, created_at, updated_at)
           VALUES (?, ?, ?, 1, ?, ?)`
        )
        .run(templateId, input.templateName, input.departmentId ?? null, timestamp, timestamp);

      if (input.indicators && input.indicators.length > 0) {
        let sort = 1;
        for (const ind of input.indicators) {
          const indId = `kpii-${nanoid(10)}`;
          this.sqlite
            .prepare(
              `INSERT INTO hris_kpi_indicators (id, template_id, indicator_name, weight, target_value, unit, sort_order, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              indId,
              templateId,
              ind.indicatorName,
              ind.weight,
              ind.targetValue ?? null,
              ind.unit ?? null,
              sort++,
              timestamp
            );
        }
      }
    })();

    return this.listKpiTemplates().find((t) => t.id === templateId)!;
  }

  updateKpiTemplate(id: string, input: Partial<KpiTemplateInput>) {
    const timestamp = now();
    const existing = this.sqlite
      .prepare('SELECT id FROM hris_kpi_templates WHERE id = ?')
      .get(id) as Row | undefined;
    if (!existing) throw notFound('KPI Template', id);

    this.sqlite.transaction(() => {
      this.sqlite
        .prepare(
          `UPDATE hris_kpi_templates SET
            template_name = COALESCE(?, template_name),
            department_id = COALESCE(?, department_id),
            updated_at = ?
           WHERE id = ?`
        )
        .run(input.templateName ?? null, input.departmentId ?? null, timestamp, id);

      if (input.indicators) {
        this.sqlite.prepare('DELETE FROM hris_kpi_indicators WHERE template_id = ?').run(id);
        let sort = 1;
        for (const ind of input.indicators) {
          const indId = `kpii-${nanoid(10)}`;
          this.sqlite
            .prepare(
              `INSERT INTO hris_kpi_indicators (id, template_id, indicator_name, weight, target_value, unit, sort_order, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              indId,
              id,
              ind.indicatorName,
              ind.weight,
              ind.targetValue ?? null,
              ind.unit ?? null,
              sort++,
              timestamp
            );
        }
      }
    })();

    return this.listKpiTemplates().find((t) => t.id === id)!;
  }

  deleteKpiTemplate(id: string) {
    this.sqlite.prepare('UPDATE hris_kpi_templates SET is_active = 0 WHERE id = ?').run(id);
    return { success: true };
  }

  deleteKpiAssessment(id: string) {
    this.sqlite.transaction(() => {
      this.sqlite.prepare('DELETE FROM hris_kpi_scores WHERE assessment_id = ?').run(id);
      this.sqlite.prepare('DELETE FROM hris_kpi_assessments WHERE id = ?').run(id);
    })();
    return { success: true };
  }

  listKpiAssessments(periodId?: string, employeeId?: string, departmentId?: string) {
    const where = ['1=1'];
    const params: unknown[] = [];

    if (periodId) {
      where.push('a.period_id = ?');
      params.push(periodId);
    }
    if (employeeId) {
      where.push('a.employee_id = ?');
      params.push(employeeId);
    }
    if (departmentId && departmentId !== 'ALL') {
      where.push('e.department_id = ?');
      params.push(departmentId);
    }

    const rows = this.sqlite
      .prepare(
        `SELECT a.*, e.employee_code, e.full_name employee_name, e.position_title, e.department_id, d.department_name,
                t.template_name, p.period_name, assessor.full_name assessor_name
         FROM hris_kpi_assessments a
         JOIN employees e ON e.id = a.employee_id
         LEFT JOIN departments d ON d.id = e.department_id
         JOIN hris_kpi_templates t ON t.id = a.template_id
         JOIN hris_kpi_periods p ON p.id = a.period_id
         LEFT JOIN employees assessor ON assessor.id = a.assessor_id
         WHERE ${where.join(' AND ')}
         ORDER BY a.created_at DESC`
      )
      .all(...params) as Row[];

    return rows.map((r) => ({
      id: String(r.id),
      periodId: String(r.period_id),
      periodName: String(r.period_name),
      employeeId: String(r.employee_id),
      employeeCode: String(r.employee_code),
      employeeName: String(r.employee_name),
      positionTitle: String(r.position_title),
      departmentId: str(r.department_id),
      departmentName: str(r.department_name),
      templateId: String(r.template_id),
      templateName: String(r.template_name),
      assessorId: str(r.assessor_id),
      assessorName: str(r.assessor_name),
      overallScore: num(r.overall_score) || null,
      overallGrade: str(r.overall_grade),
      status: String(r.status),
      notes: str(r.notes)
    }));
  }

  createKpiAssessment(input: KpiAssignMultiInput) {
    const timestamp = now();
    const targetEmpIds =
      input.employeeIds && input.employeeIds.length > 0
        ? input.employeeIds
        : input.employeeId
          ? [input.employeeId]
          : [];

    if (targetEmpIds.length === 0) {
      throw new DomainError(
        'VALIDATION_ERROR',
        'Please select at least 1 employee for KPI assignment.',
        400
      );
    }

    this.sqlite.transaction(() => {
      for (const empId of targetEmpIds) {
        const existing = this.sqlite
          .prepare('SELECT id FROM hris_kpi_assessments WHERE period_id = ? AND employee_id = ?')
          .get(input.periodId, empId) as Row | undefined;

        if (existing) {
          this.sqlite
            .prepare(
              `UPDATE hris_kpi_assessments SET
                template_id = ?, assessor_id = COALESCE(?, assessor_id), notes = COALESCE(?, notes), updated_at = ?
               WHERE id = ?`
            )
            .run(
              input.templateId,
              input.assessorId ?? null,
              input.notes ?? null,
              timestamp,
              existing.id
            );
        } else {
          const id = `kpia-${nanoid(10)}`;
          this.sqlite
            .prepare(
              `INSERT INTO hris_kpi_assessments
               (id, period_id, employee_id, assessor_id, template_id, status, notes, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?)`
            )
            .run(
              id,
              input.periodId,
              empId,
              input.assessorId ?? null,
              input.templateId,
              input.notes ?? null,
              timestamp,
              timestamp
            );
        }
      }
    })();

    return this.listKpiAssessments(input.periodId);
  }

  updateKpiAssessment(id: string, input: KpiAssessmentUpdate) {
    const timestamp = now();
    const existing = this.sqlite
      .prepare('SELECT * FROM hris_kpi_assessments WHERE id = ?')
      .get(id) as Row | undefined;

    if (!existing) throw notFound('KPI Assessment', id);

    const score =
      input.overallScore ?? (existing.overall_score !== null ? num(existing.overall_score) : null);
    let grade = input.overallGrade ?? str(existing.overall_grade);

    if (score !== null && !input.overallGrade) {
      if (score >= 90) grade = 'A';
      else if (score >= 80) grade = 'B';
      else if (score >= 70) grade = 'C';
      else if (score >= 60) grade = 'D';
      else grade = 'E';
    }

    this.sqlite
      .prepare(
        `UPDATE hris_kpi_assessments SET
          overall_score = ?, overall_grade = ?, status = COALESCE(?, status),
          notes = COALESCE(?, notes), updated_at = ?
         WHERE id = ?`
      )
      .run(score, grade, input.status ?? null, input.notes ?? null, timestamp, id);

    return this.listKpiAssessments().find((a) => a.id === id)!;
  }
}
