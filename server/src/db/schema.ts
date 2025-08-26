import { serial, text, pgTable, timestamp, integer, boolean, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Folders table - hierarchical structure for organizing notes
export const foldersTable = pgTable('folders', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  parent_id: integer('parent_id'), // References folders.id, nullable for root folders
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Tags table - for labeling and categorizing notes
export const tagsTable = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(), // Tag names should be unique
  color: text('color'), // Hex color code for visual organization
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Notes table - main content storage with rich text support
export const notesTable = pgTable('notes', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(), // JSON string from Tiptap editor
  folder_id: integer('folder_id'), // References folders.id, nullable for notes not in folders
  is_favorite: boolean('is_favorite').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Junction table for many-to-many relationship between notes and tags
export const noteTagsTable = pgTable('note_tags', {
  note_id: integer('note_id').notNull(),
  tag_id: integer('tag_id').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.note_id, table.tag_id] })
}));

// Define relations for proper query building

// Folder relations
export const foldersRelations = relations(foldersTable, ({ one, many }) => ({
  parent: one(foldersTable, {
    fields: [foldersTable.parent_id],
    references: [foldersTable.id],
    relationName: 'folder_hierarchy'
  }),
  children: many(foldersTable, {
    relationName: 'folder_hierarchy'
  }),
  notes: many(notesTable),
}));

// Note relations
export const notesRelations = relations(notesTable, ({ one, many }) => ({
  folder: one(foldersTable, {
    fields: [notesTable.folder_id],
    references: [foldersTable.id],
  }),
  noteTags: many(noteTagsTable),
}));

// Tag relations
export const tagsRelations = relations(tagsTable, ({ many }) => ({
  noteTags: many(noteTagsTable),
}));

// Note-Tag junction relations
export const noteTagsRelations = relations(noteTagsTable, ({ one }) => ({
  note: one(notesTable, {
    fields: [noteTagsTable.note_id],
    references: [notesTable.id],
  }),
  tag: one(tagsTable, {
    fields: [noteTagsTable.tag_id],
    references: [tagsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type Folder = typeof foldersTable.$inferSelect;
export type NewFolder = typeof foldersTable.$inferInsert;

export type Tag = typeof tagsTable.$inferSelect;
export type NewTag = typeof tagsTable.$inferInsert;

export type Note = typeof notesTable.$inferSelect;
export type NewNote = typeof notesTable.$inferInsert;

export type NoteTag = typeof noteTagsTable.$inferSelect;
export type NewNoteTag = typeof noteTagsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = { 
  folders: foldersTable, 
  tags: tagsTable, 
  notes: notesTable, 
  noteTags: noteTagsTable 
};

export const tableRelations = {
  foldersRelations,
  notesRelations,
  tagsRelations,
  noteTagsRelations
};