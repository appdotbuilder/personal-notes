import { db } from '../db';
import { notesTable, noteTagsTable } from '../db/schema';
import { type DeleteNoteInput } from '../schema';
import { eq } from 'drizzle-orm';

export const deleteNote = async (input: DeleteNoteInput): Promise<{ success: boolean }> => {
  try {
    // First, delete all tag associations for this note
    await db.delete(noteTagsTable)
      .where(eq(noteTagsTable.note_id, input.id))
      .execute();

    // Then delete the note itself
    const result = await db.delete(notesTable)
      .where(eq(notesTable.id, input.id))
      .returning()
      .execute();

    // Return success based on whether a note was actually deleted
    return { success: result.length > 0 };
  } catch (error) {
    console.error('Note deletion failed:', error);
    throw error;
  }
};