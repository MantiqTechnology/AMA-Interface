import type Database from 'better-sqlite3';
import type {
  MasterDataEntityConfig,
  MasterDataOption,
  MasterDataRecord,
  MasterDataValue
} from '../../shared/contracts/master-data';

type SqlitePrimitive = string | number | null;
type SqliteRow = Record<string, SqlitePrimitive>;

export type MasterDataFilters = {
  active: 'active' | 'inactive' | 'all';
  search: string;
};

function quoteIdentifier(identifier: string) {
  if (!/^[a-z0-9_]+$/u.test(identifier)) {
    throw new Error(`Unsafe SQLite identifier: ${identifier}`);
  }

  return `"${identifier}"`;
}

function toSqliteValue(value: MasterDataValue): SqlitePrimitive {
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  return value;
}

function fromSqliteValue(config: MasterDataEntityConfig, key: string, value: SqlitePrimitive) {
  const field = config.fields.find((item) => item.key === key);

  if (key === 'is_active' || field?.type === 'boolean') {
    return Boolean(value);
  }

  return value;
}

function recordColumns(config: MasterDataEntityConfig) {
  return [
    'id',
    ...config.fields.map((field) => field.key),
    'is_active',
    'created_at',
    'updated_at'
  ];
}

function normalizeRow(config: MasterDataEntityConfig, row: SqliteRow): MasterDataRecord {
  const record: Record<string, MasterDataValue> = {};

  for (const column of recordColumns(config)) {
    record[column] = fromSqliteValue(config, column, row[column] ?? null) as MasterDataValue;
  }

  return {
    ...record,
    id: String(record.id),
    is_active: Boolean(record.is_active),
    created_at: String(record.created_at),
    updated_at: String(record.updated_at)
  };
}

export class SqliteMasterDataRepository {
  constructor(private readonly sqlite: Database.Database) {}

  list(config: MasterDataEntityConfig, filters: MasterDataFilters) {
    const params: SqlitePrimitive[] = [];
    const where: string[] = [];

    if (filters.active === 'active') {
      where.push(`${quoteIdentifier('is_active')} = 1`);
    }

    if (filters.active === 'inactive') {
      where.push(`${quoteIdentifier('is_active')} = 0`);
    }

    if (filters.search) {
      const searchClauses = config.searchFields.map(
        (field) => `${quoteIdentifier(field)} LIKE ? COLLATE NOCASE`
      );
      where.push(`(${searchClauses.join(' OR ')})`);
      params.push(...config.searchFields.map(() => `%${filters.search}%`));
    }

    const columns = recordColumns(config).map(quoteIdentifier).join(', ');
    const whereSql = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '';
    const orderSql = ` ORDER BY ${quoteIdentifier(config.codeField)} COLLATE NOCASE`;
    const sql = `SELECT ${columns} FROM ${quoteIdentifier(config.tableName)}${whereSql}${orderSql}`;

    return this.sqlite
      .prepare(sql)
      .all(...params)
      .map((row) => normalizeRow(config, row as SqliteRow));
  }

  getById(config: MasterDataEntityConfig, id: string) {
    const columns = recordColumns(config).map(quoteIdentifier).join(', ');
    const row = this.sqlite
      .prepare(`SELECT ${columns} FROM ${quoteIdentifier(config.tableName)} WHERE id = ?`)
      .get(id) as SqliteRow | undefined;

    return row ? normalizeRow(config, row) : null;
  }

  countActive(config: MasterDataEntityConfig) {
    const row = this.sqlite
      .prepare(
        `SELECT COUNT(*) AS count FROM ${quoteIdentifier(config.tableName)} WHERE is_active = 1`
      )
      .get() as { count: number } | undefined;

    return Number(row?.count ?? 0);
  }

  options(config: MasterDataEntityConfig): MasterDataOption[] {
    const rows = this.list(config, { active: 'all', search: '' });

    return rows.map((row) => {
      const title = config.optionLabelFields
        .map((field) => row[field])
        .filter((value) => value !== null && value !== '')
        .join(' - ');

      return {
        value: row.id,
        title: title || row.id,
        subtitle: row.is_active ? undefined : 'Inactive',
        isActive: row.is_active
      };
    });
  }

  create(
    config: MasterDataEntityConfig,
    id: string,
    values: Record<string, MasterDataValue>,
    timestamp: string
  ) {
    const insertValues: Record<string, MasterDataValue> = {
      id,
      ...values,
      is_active: true,
      created_at: timestamp,
      updated_at: timestamp
    };
    const columns = Object.keys(insertValues);
    const placeholders = columns.map(() => '?').join(', ');
    const params = columns.map((column) => toSqliteValue(insertValues[column]));
    const sql = `INSERT INTO ${quoteIdentifier(config.tableName)} (${columns
      .map(quoteIdentifier)
      .join(', ')}) VALUES (${placeholders})`;

    this.sqlite.prepare(sql).run(...params);
    return this.getById(config, id);
  }

  update(
    config: MasterDataEntityConfig,
    id: string,
    values: Record<string, MasterDataValue>,
    timestamp: string
  ) {
    const updateValues: Record<string, MasterDataValue> = {
      ...values,
      updated_at: timestamp
    };
    const columns = Object.keys(updateValues);
    const assignments = columns.map((column) => `${quoteIdentifier(column)} = ?`).join(', ');
    const params = columns.map((column) => toSqliteValue(updateValues[column]));
    const sql = `UPDATE ${quoteIdentifier(config.tableName)} SET ${assignments} WHERE id = ?`;

    this.sqlite.prepare(sql).run(...params, id);
    return this.getById(config, id);
  }

  setActive(config: MasterDataEntityConfig, id: string, isActive: boolean, timestamp: string) {
    this.sqlite
      .prepare(
        `UPDATE ${quoteIdentifier(config.tableName)} SET is_active = ?, updated_at = ? WHERE id = ?`
      )
      .run(isActive ? 1 : 0, timestamp, id);

    return this.getById(config, id);
  }

  findOneByFields(
    config: MasterDataEntityConfig,
    fields: Record<string, MasterDataValue>,
    excludeId?: string
  ) {
    const entries = Object.entries(fields);
    const where = entries.map(([field]) => `${quoteIdentifier(field)} = ?`);
    const params = entries.map(([, value]) => toSqliteValue(value));

    if (excludeId) {
      where.push('id <> ?');
      params.push(excludeId);
    }

    const columns = recordColumns(config).map(quoteIdentifier).join(', ');
    const sql = `SELECT ${columns} FROM ${quoteIdentifier(config.tableName)} WHERE ${where.join(
      ' AND '
    )} LIMIT 1`;
    const row = this.sqlite.prepare(sql).get(...params) as SqliteRow | undefined;

    return row ? normalizeRow(config, row) : null;
  }
}
