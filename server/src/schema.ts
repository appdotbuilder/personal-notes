import { z } from 'zod';

// Folder schema
export const folderSchema = z.object({
  id: z.number(),
  name: z.string(),
  parent_id: z.number().nullable(), // Nullable for root folders
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Folder = z.infer<typeof folderSchema>;

// Input schema for creating folders
export const createFolderInputSchema = z.object({
  name: z.string().min(1, 'Folder name is required'),
  parent_id: z.number().nullable() // Can be null for root folders
});

export type CreateFolderInput = z.infer<typeof createFolderInputSchema>;

// Input schema for updating folders
export const updateFolderInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1, 'Folder name is required').optional(),
  parent_id: z.number().nullable().optional()
});

export type UpdateFolderInput = z.infer<typeof updateFolderInputSchema>;

// Tag schema
export const tagSchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string().nullable(), // Color code for visual organization
  created_at: z.coerce.date()
});

export type Tag = z.infer<typeof tagSchema>;

// Input schema for creating tags
export const createTagInputSchema = z.object({
  name: z.string().min(1, 'Tag name is required'),
  color: z.string().nullable()
});

export type CreateTagInput = z.infer<typeof createTagInputSchema>;

// Input schema for updating tags
export const updateTagInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1, 'Tag name is required').optional(),
  color: z.string().nullable().optional()
});

export type UpdateTagInput = z.infer<typeof updateTagInputSchema>;

// Note schema with rich text content
export const noteSchema = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string(), // JSON string from Tiptap editor
  folder_id: z.number().nullable(), // Can be null for notes not in folders
  is_favorite: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Note = z.infer<typeof noteSchema>;

// Input schema for creating notes
export const createNoteInputSchema = z.object({
  title: z.string().min(1, 'Note title is required'),
  content: z.string(), // JSON string from Tiptap
  folder_id: z.number().nullable(),
  is_favorite: z.boolean().default(false)
});

export type CreateNoteInput = z.infer<typeof createNoteInputSchema>;

// Input schema for updating notes
export const updateNoteInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1, 'Note title is required').optional(),
  content: z.string().optional(),
  folder_id: z.number().nullable().optional(),
  is_favorite: z.boolean().optional()
});

export type UpdateNoteInput = z.infer<typeof updateNoteInputSchema>;

// Note-Tag junction table schema (many-to-many relationship)
export const noteTagSchema = z.object({
  note_id: z.number(),
  tag_id: z.number(),
  created_at: z.coerce.date()
});

export type NoteTag = z.infer<typeof noteTagSchema>;

// Input schema for adding tags to notes
export const addTagToNoteInputSchema = z.object({
  note_id: z.number(),
  tag_id: z.number()
});

export type AddTagToNoteInput = z.infer<typeof addTagToNoteInputSchema>;

// Input schema for removing tags from notes
export const removeTagFromNoteInputSchema = z.object({
  note_id: z.number(),
  tag_id: z.number()
});

export type RemoveTagFromNoteInput = z.infer<typeof removeTagFromNoteInputSchema>;

// Extended note schema with tags for display purposes
export const noteWithTagsSchema = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string(),
  folder_id: z.number().nullable(),
  is_favorite: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  tags: z.array(tagSchema)
});

export type NoteWithTags = z.infer<typeof noteWithTagsSchema>;

// Extended folder schema with nested structure for display
export const folderWithChildrenSchema: z.ZodType<{
  id: number;
  name: string;
  parent_id: number | null;
  created_at: Date;
  updated_at: Date;
  children?: {
    id: number;
    name: string;
    parent_id: number | null;
    created_at: Date;
    updated_at: Date;
    children?: any[];
    notes_count?: number;
  }[];
  notes_count?: number;
}> = z.object({
  id: z.number(),
  name: z.string(),
  parent_id: z.number().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  children: z.array(z.lazy(() => folderWithChildrenSchema)).optional(),
  notes_count: z.number().optional()
});

export type FolderWithChildren = z.infer<typeof folderWithChildrenSchema>;

// Search input schema
export const searchNotesInputSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  folder_id: z.number().nullable().optional(),
  tag_ids: z.array(z.number()).optional(),
  favorites_only: z.boolean().default(false)
});

export type SearchNotesInput = z.infer<typeof searchNotesInputSchema>;

// Delete input schemas
export const deleteNoteInputSchema = z.object({
  id: z.number()
});

export type DeleteNoteInput = z.infer<typeof deleteNoteInputSchema>;

export const deleteFolderInputSchema = z.object({
  id: z.number()
});

export type DeleteFolderInput = z.infer<typeof deleteFolderInputSchema>;

export const deleteTagInputSchema = z.object({
  id: z.number()
});

export type DeleteTagInput = z.infer<typeof deleteTagInputSchema>;