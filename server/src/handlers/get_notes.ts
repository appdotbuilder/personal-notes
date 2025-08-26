import { db } from '../db';
import { notesTable, noteTagsTable, tagsTable } from '../db/schema';
import { type NoteWithTags } from '../schema';
import { desc, eq } from 'drizzle-orm';

export const getNotes = async (): Promise<NoteWithTags[]> => {
  try {
    // First, get all notes ordered by updated_at DESC
    const notes = await db.select()
      .from(notesTable)
      .orderBy(desc(notesTable.updated_at))
      .execute();

    // Then, get all note-tag relationships with tag details
    const noteTagsWithDetails = await db.select({
      note_id: noteTagsTable.note_id,
      tag_id: tagsTable.id,
      tag_name: tagsTable.name,
      tag_color: tagsTable.color,
      tag_created_at: tagsTable.created_at
    })
      .from(noteTagsTable)
      .innerJoin(tagsTable, eq(noteTagsTable.tag_id, tagsTable.id))
      .execute();

    // Group tags by note_id for efficient mapping
    const tagsByNoteId = new Map<number, typeof noteTagsWithDetails>();
    noteTagsWithDetails.forEach(noteTag => {
      if (!tagsByNoteId.has(noteTag.note_id)) {
        tagsByNoteId.set(noteTag.note_id, []);
      }
      tagsByNoteId.get(noteTag.note_id)!.push(noteTag);
    });

    // Combine notes with their tags
    return notes.map(note => ({
      ...note,
      tags: (tagsByNoteId.get(note.id) || []).map(noteTag => ({
        id: noteTag.tag_id,
        name: noteTag.tag_name,
        color: noteTag.tag_color,
        created_at: noteTag.tag_created_at
      }))
    }));
  } catch (error) {
    console.error('Failed to get notes:', error);
    throw error;
  }
};