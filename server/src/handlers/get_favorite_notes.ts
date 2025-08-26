import { db } from '../db';
import { notesTable, tagsTable, noteTagsTable } from '../db/schema';
import { type NoteWithTags } from '../schema';
import { eq, desc, inArray } from 'drizzle-orm';

export const getFavoriteNotes = async (): Promise<NoteWithTags[]> => {
  try {
    // First get all favorite notes ordered by updated_at DESC
    const favoriteNotes = await db.select()
      .from(notesTable)
      .where(eq(notesTable.is_favorite, true))
      .orderBy(desc(notesTable.updated_at))
      .execute();

    // If no favorite notes found, return empty array
    if (favoriteNotes.length === 0) {
      return [];
    }

    // Get all note IDs to fetch their tags
    const noteIds = favoriteNotes.map(note => note.id);

    // Fetch all tags for these notes using a single query with inArray
    const allNoteTags = await db.select({
      note_id: noteTagsTable.note_id,
      tag_id: tagsTable.id,
      tag_name: tagsTable.name,
      tag_color: tagsTable.color,
      tag_created_at: tagsTable.created_at
    })
      .from(noteTagsTable)
      .innerJoin(tagsTable, eq(noteTagsTable.tag_id, tagsTable.id))
      .where(inArray(noteTagsTable.note_id, noteIds))
      .execute();

    // Group tags by note_id for easy lookup
    const tagsByNoteId = new Map<number, any[]>();
    allNoteTags.forEach(noteTag => {
      if (!tagsByNoteId.has(noteTag.note_id)) {
        tagsByNoteId.set(noteTag.note_id, []);
      }
      tagsByNoteId.get(noteTag.note_id)!.push({
        id: noteTag.tag_id,
        name: noteTag.tag_name,
        color: noteTag.tag_color,
        created_at: noteTag.tag_created_at
      });
    });

    // Map notes to include their tags
    return favoriteNotes.map(note => ({
      ...note,
      tags: tagsByNoteId.get(note.id) || []
    }));
  } catch (error) {
    console.error('Failed to fetch favorite notes:', error);
    throw error;
  }
};