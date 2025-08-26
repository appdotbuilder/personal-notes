import { db } from '../db';
import { notesTable, tagsTable, noteTagsTable } from '../db/schema';
import { type NoteWithTags } from '../schema';
import { eq } from 'drizzle-orm';

export const getNoteById = async (id: number): Promise<NoteWithTags | null> => {
  try {
    // First, get the note by ID
    const notes = await db.select()
      .from(notesTable)
      .where(eq(notesTable.id, id))
      .execute();

    if (notes.length === 0) {
      return null;
    }

    const note = notes[0];

    // Get the associated tags for this note
    const noteTags = await db.select({
      id: tagsTable.id,
      name: tagsTable.name,
      color: tagsTable.color,
      created_at: tagsTable.created_at
    })
      .from(noteTagsTable)
      .innerJoin(tagsTable, eq(noteTagsTable.tag_id, tagsTable.id))
      .where(eq(noteTagsTable.note_id, id))
      .execute();

    // Return the note with its tags
    return {
      ...note,
      tags: noteTags
    };
  } catch (error) {
    console.error('Failed to get note by ID:', error);
    throw error;
  }
};