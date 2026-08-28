import { z } from 'zod';
import { demoRoles } from '../types/roles';

export const demoRoleSchema = z.enum(demoRoles);

export const switchRoleBodySchema = z.object({
  role: demoRoleSchema
});

export const demoLoginBodySchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(64)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128)
});

export const demoSessionSchema = z.object({
  authenticated: z.literal(true),
  userId: z.string().min(1),
  username: z.string().min(1),
  role: demoRoleSchema,
  displayName: z.string().min(1),
  personaLabel: z.string().min(1),
  stationScopes: z.array(z.string().min(1)),
  expiresAt: z.string().datetime(),
  demoMode: z.boolean()
});

export const demoAccountHelperSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  role: demoRoleSchema,
  displayName: z.string().min(1),
  personaLabel: z.string().min(1),
  stationScopes: z.array(z.string().min(1))
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
export type DemoLoginBody = z.infer<typeof demoLoginBodySchema>;
export type DemoSessionDto = z.infer<typeof demoSessionSchema>;
export type DemoAccountHelperDto = z.infer<typeof demoAccountHelperSchema>;
export type EmployeeLoginBody = z.infer<typeof employeeLoginBodySchema>;
export type EmployeeSessionDto = z.infer<typeof employeeSessionSchema>;
