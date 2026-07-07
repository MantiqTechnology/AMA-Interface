import { z } from 'zod';
import {
  getMasterDataEntityConfig,
  type MasterDataEntityConfig,
  type MasterDataEntityKey,
  type MasterDataValue
} from '../../../shared/contracts/master-data';
import { SqliteMasterDataRepository } from '../../repositories/master-data.repository';
import { DomainError } from '../../utils/errors';

export type MasterDataInput = Record<string, MasterDataValue>;

function emptyStringToNull(value: unknown) {
  return value === '' ? null : value;
}

function enumSchema(options: readonly string[]) {
  return z.string().refine((value) => options.includes(value), {
    message: `Expected one of: ${options.join(', ')}`
  });
}

function numberSchema(min = 0) {
  return z.preprocess((value) => {
    if (value === null || value === '') return value;
    if (typeof value === 'number') return value;
    return Number(value);
  }, z.number().int().min(min));
}

function booleanSchema(defaultValue = false) {
  return z
    .union([z.boolean(), z.literal(0), z.literal(1)])
    .optional()
    .default(defaultValue)
    .transform(Boolean);
}

function fieldSchema(field: MasterDataEntityConfig['fields'][number]) {
  const base =
    field.type === 'number' || field.type === 'money'
      ? numberSchema(field.min ?? 0)
      : field.type === 'boolean'
        ? booleanSchema(Boolean(field.default))
        : field.type === 'email'
          ? z.string().trim().email()
          : field.type === 'select'
            ? enumSchema(field.options ?? [])
            : field.type === 'date'
              ? z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, 'Expected YYYY-MM-DD')
              : z.string().trim();

  if (field.type === 'relation') {
    const relationBase = z.string().trim().min(1);
    return field.nullable || !field.required
      ? z
          .preprocess(emptyStringToNull, relationBase.nullable().optional())
          .transform((value) => value ?? null)
      : relationBase;
  }

  if (field.type === 'boolean') return base;

  if (field.required) {
    return field.type === 'text' || field.type === 'textarea' || field.type === 'email'
      ? (base as z.ZodString).min(1)
      : base;
  }

  if (field.nullable || !field.required) {
    return z
      .preprocess(emptyStringToNull, base.nullable().optional())
      .transform((value) => value ?? null);
  }

  return base;
}

function buildInputSchema(config: MasterDataEntityConfig) {
  const shape: z.ZodRawShape = {};
  for (const field of config.fields) {
    shape[field.key] = fieldSchema(field);
  }
  return z.object(shape).strip();
}

export function normalizeInput(config: MasterDataEntityConfig, rawInput: unknown): MasterDataInput {
  const parsed = buildInputSchema(config).parse(rawInput);
  const input: MasterDataInput = {};
  for (const field of config.fields) {
    const value = parsed[field.key] as MasterDataValue;
    input[field.key] = field.uppercase && typeof value === 'string' ? value.toUpperCase() : value;
  }
  return input;
}

export function assertDateOrder(input: MasterDataInput, fromField: string, toField: string) {
  const from = input[fromField];
  const to = input[toField];
  if (typeof from === 'string' && typeof to === 'string' && to < from) {
    throw new DomainError(
      'INVALID_EFFECTIVE_DATE',
      'Effective end date cannot be before start date.',
      422
    );
  }
}

export function sqliteDomainError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('UNIQUE constraint failed')) {
    throw new DomainError(
      'MASTER_DATA_DUPLICATE',
      'Master data code or unique combination already exists.',
      409
    );
  }
  if (message.includes('FOREIGN KEY constraint failed')) {
    throw new DomainError(
      'MASTER_DATA_INVALID_RELATION',
      'One or more related records are invalid.',
      422
    );
  }
  if (message.includes('CHECK constraint failed')) {
    throw new DomainError('MASTER_DATA_RULE_FAILED', 'Master data rule failed.', 422, message);
  }
  throw error;
}

export function buildLookups(
  repository: SqliteMasterDataRepository,
  config: MasterDataEntityConfig
) {
  const lookups: Partial<Record<MasterDataEntityKey, ReturnType<typeof repository.options>>> = {};
  const relationKeys = new Set(
    config.fields
      .filter((f) => f.type === 'relation' && f.relation)
      .map((f) => f.relation as MasterDataEntityKey)
  );
  for (const relationKey of relationKeys) {
    const relationConfig = getMasterDataEntityConfig(relationKey);
    if (relationConfig) lookups[relationKey] = repository.options(relationConfig);
  }
  return lookups;
}

export function validateRelations(
  repository: SqliteMasterDataRepository,
  config: MasterDataEntityConfig,
  input: MasterDataInput
) {
  for (const field of config.fields) {
    if (field.type !== 'relation' || !field.relation) continue;

    const value = input[field.key];
    if (value === null) continue;

    const relationConfig = getMasterDataEntityConfig(field.relation);
    if (!relationConfig) continue;

    const relation = repository.getById(relationConfig, String(value));

    if (!relation) {
      throw new DomainError(
        'MASTER_DATA_INVALID_RELATION',
        `${field.label} references a record that does not exist.`,
        422
      );
    }
    if (!relation.is_active) {
      throw new DomainError(
        'MASTER_DATA_INACTIVE_RELATION',
        `${field.label} must reference an active record.`,
        422
      );
    }
  }
}
