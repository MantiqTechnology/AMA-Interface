import { z } from 'zod';

export const capabilityPreviewItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: z.enum(['PLANNED', 'ALLOWED_DRAFT', 'BLOCKED', 'QUEUED', 'CONFLICT', 'REVIEW']),
  owner: z.string(),
  summary: z.string(),
  detail: z.string()
});

export const capabilityPreviewSectionSchema = z.object({
  id: z.enum(['offline-sync', 'sms', 'avsec']),
  title: z.string(),
  subtitle: z.string(),
  implementationStatus: z.literal('NOT_IMPLEMENTED'),
  items: z.array(capabilityPreviewItemSchema)
});

export const demoCapabilityResponseSchema = z.object({
  mode: z.literal('CONCEPT_PREVIEW'),
  source: z.literal('SYNTHETIC_FIXTURE'),
  nonOperational: z.literal(true),
  generatedAt: z.string().datetime(),
  sections: z.array(capabilityPreviewSectionSchema)
});

export type CapabilityPreviewItem = z.infer<typeof capabilityPreviewItemSchema>;
export type CapabilityPreviewSection = z.infer<typeof capabilityPreviewSectionSchema>;
export type DemoCapabilityResponse = z.infer<typeof demoCapabilityResponseSchema>;
