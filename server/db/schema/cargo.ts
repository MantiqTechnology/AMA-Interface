import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const dgCategories = sqliteTable('dg_categories', {
  id: text('id').primaryKey(),
  dgCode: text('dg_code').notNull().unique(),
  dgClass: text('dg_class').notNull(),
  description: text('description').notNull(),
  handlingInstruction: text('handling_instruction').notNull(),
  requiresSpecialApproval: integer('requires_special_approval', { mode: 'boolean' })
    .notNull()
    .default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});
