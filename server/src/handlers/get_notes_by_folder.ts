import { db } from '../db';
import { notesTable, tagsTable, noteTagsTable } from '../db/schema';
import { type NoteWithTags } from '../schema';
import { eq, isNull, desc } from 'drizzle-orm';

export const getNotesByFolder = async (folderId: number | null): Promise<NoteWithTags[]> => {
  try {
    // Build the complete query with proper conditional where clause
    const baseQuery = db.select({
      id: notesTable.id,
      title: notesTable.title,
      content: notesTable.content,
      folder_id: notesTable.folder_id,
      is_favorite: notesTable.is_favorite,
      created_at: notesTable.created_at,
      updated_at: notesTable.updated_at,
      tag_id: tagsTable.id,
      tag_name: tagsTable.name,
      tag_color: tagsTable.color,
      tag_created_at: tagsTable.created_at
    })
    .from(notesTable)
    .leftJoin(noteTagsTable, eq(notesTable.id, noteTagsTable.note_id))
    .leftJoin(tagsTable, eq(noteTagsTable.tag_id, tagsTable.id));

    // Apply folder filter and ordering in one go
    const results = folderId === null
      ? await baseQuery
          .where(isNull(notesTable.folder_id))
          .orderBy(desc(notesTable.updated_at))
          .execute()
      : await baseQuery
          .where(eq(notesTable.folder_id, folderId))
          .orderBy(desc(notesTable.updated_at))
          .execute();

    // Group results by note ID and aggregate tags
    const notesMap = new Map<number, NoteWithTags>();

    results.forEach(row => {
      const noteId = row.id;
      
      if (!notesMap.has(noteId)) {
        // Create new note entry
        notesMap.set(noteId, {
          id: row.id,
          title: row.title,
          content: row.content,
          folder_id: row.folder_id,
          is_favorite: row.is_favorite,
          created_at: row.created_at,
          updated_at: row.updated_at,
          tags: []
        });
      }

      // Add tag if it exists (from the join)
      if (row.tag_id && row.tag_name && row.tag_created_at) {
        const note = notesMap.get(noteId)!;
        note.tags.push({
          id: row.tag_id,
          name: row.tag_name,
          color: row.tag_color,
          created_at: row.tag_created_at
        });
      }
    });

    return Array.from(notesMap.values());
  } catch (error) {
    console.error('Failed to get notes by folder:', error);
    throw error;
  }
};