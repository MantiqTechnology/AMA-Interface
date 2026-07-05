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

export type SwitchRoleBody = z.infer<typeof switchRoleBodySchema>;
export type DemoSessionDto = z.infer<typeof demoSessionSchema>;
