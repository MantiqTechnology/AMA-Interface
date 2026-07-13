export const cargoMasterDataStatements = [
  `CREATE TABLE IF NOT EXISTS dg_categories (
    id TEXT PRIMARY KEY,
    dg_code TEXT NOT NULL UNIQUE,
    dg_class TEXT NOT NULL,
    description TEXT NOT NULL,
    handling_instruction TEXT NOT NULL,
    requires_special_approval INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`
];

export const cargoMasterDataDropStatements = ['DROP TABLE IF EXISTS dg_categories'];
