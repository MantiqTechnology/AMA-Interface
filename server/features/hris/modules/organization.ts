import type Database from 'better-sqlite3';
import { num, str, type Row } from './types';

export class OrganizationModule {
  constructor(public readonly sqlite: Database.Database) {}

  getOrgTree() {
    try {
      this.sqlite.exec('ALTER TABLE departments ADD COLUMN head_employee_id TEXT');
    } catch {}
    const depts = this.sqlite
      .prepare(
        `SELECT d.*, head.full_name head_name, head.position_title head_position,
                (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id AND e.employment_status = 'ACTIVE') employee_count
         FROM departments d
         LEFT JOIN employees head ON head.id = d.head_employee_id
         WHERE d.is_active = 1
         ORDER BY d.sort_order ASC, d.department_name ASC`
      )
      .all() as Row[];

    type EmployeeNode = {
      id: string;
      employeeCode: string;
      fullName: string;
      positionTitle: string;
      employmentType: string;
      phone: string | null;
      email: string | null;
    };

    type PositionGroup = {
      positionTitle: string;
      count: number;
      members: EmployeeNode[];
    };

    type Node = {
      id: string;
      departmentCode: string;
      departmentName: string;
      departmentLevel: string;
      headName: string | null;
      headPosition: string | null;
      employeeCount: number;
      positionHierarchy: PositionGroup[];
      employees: EmployeeNode[];
      children: Node[];
    };

    const nodeMap = new Map<string, Node>();
    depts.forEach((d) => {
      const deptId = String(d.id);
      const employees = this.sqlite
        .prepare(
          `SELECT id, employee_code, full_name, position_title, employment_type, phone, email
           FROM employees
           WHERE department_id = ? AND employment_status = 'ACTIVE'
           ORDER BY
             CASE
               WHEN position_title LIKE '%Chief%' OR position_title LIKE '%Director%' OR position_title LIKE '%Head%' THEN 1
               WHEN position_title LIKE '%Manager%' OR position_title LIKE '%Superintendent%' THEN 2
               WHEN position_title LIKE '%Captain%' OR position_title LIKE '%Lead%' OR position_title LIKE '%Senior%' THEN 3
               WHEN position_title LIKE '%First Officer%' THEN 4
               ELSE 5
             END ASC, full_name ASC`
        )
        .all(deptId) as Row[];

      const positionGroupsMap = new Map<string, EmployeeNode[]>();
      employees.forEach((emp) => {
        const title = String(emp.position_title ?? 'Staff');
        if (!positionGroupsMap.has(title)) {
          positionGroupsMap.set(title, []);
        }
        positionGroupsMap.get(title)!.push({
          id: String(emp.id),
          employeeCode: String(emp.employee_code),
          fullName: String(emp.full_name),
          positionTitle: title,
          employmentType: String(emp.employment_type),
          phone: str(emp.phone),
          email: str(emp.email)
        });
      });

      const positionHierarchy: PositionGroup[] = Array.from(positionGroupsMap.entries()).map(
        ([positionTitle, members]) => ({
          positionTitle,
          count: members.length,
          members
        })
      );

      nodeMap.set(deptId, {
        id: deptId,
        departmentCode: String(d.department_code),
        departmentName: String(d.department_name),
        departmentLevel: String(d.department_level ?? 'UNIT'),
        headName: str(d.head_name),
        headPosition: str(d.head_position),
        employeeCount: num(d.employee_count),
        positionHierarchy,
        employees: employees.map((emp) => ({
          id: String(emp.id),
          employeeCode: String(emp.employee_code),
          fullName: String(emp.full_name),
          positionTitle: String(emp.position_title),
          employmentType: String(emp.employment_type),
          phone: str(emp.phone),
          email: str(emp.email)
        })),
        children: []
      });
    });

    const roots: Node[] = [];
    depts.forEach((d) => {
      const node = nodeMap.get(String(d.id))!;
      const parentId = str(d.parent_department_id);
      if (parentId && nodeMap.has(parentId)) {
        nodeMap.get(parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }
}
