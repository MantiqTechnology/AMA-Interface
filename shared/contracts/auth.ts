import { z } from 'zod';
import { demoRoles } from '../types/roles';

export const demoRoleSchema = z.enum(demoRoles);

export const switchRoleBodySchema = z.object({
  role: demoRoleSchema
});

export const demoSessionSchema = z.object({
  role: demoRoleSchema,
  demoMode: z.boolean()
});

export const employeeLoginBodySchema = z.object({
  employeeCode: z.string().trim().min(2).max(30),
  pin: z.string().trim().length(6)
});

export const employeeSessionSchema = z.object({
  employeeId: z.string(),
  employeeCode: z.string(),
  fullName: z.string(),
  positionTitle: z.string(),
  departmentName: z.string().nullable(),
  stationCode: z.string().nullable(),
  avatarUrl: z.string().nullable()
});

export type SwitchRoleBody = z.infer<typeof switchRoleBodySchema>;
export type DemoSessionDto = z.infer<typeof demoSessionSchema>;
export type EmployeeLoginBody = z.infer<typeof employeeLoginBodySchema>;
export type EmployeeSessionDto = z.infer<typeof employeeSessionSchema>;
