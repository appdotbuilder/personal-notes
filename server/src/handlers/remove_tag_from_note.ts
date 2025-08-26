import { db } from '../db';
import { noteTagsTable } from '../db/schema';
import { type RemoveTagFromNoteInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export const removeTagFromNote = async (input: RemoveTagFromNoteInput): Promise<{ success: boolean }> => {
  try {
    // Remove the relationship from the junction table
    const result = await db.delete(noteTagsTable)
      .where(
        and(
          eq(noteTagsTable.note_id, input.note_id),
          eq(noteTagsTable.tag_id, input.tag_id)
        )
      )
      .execute();

    // Return success status - even if no rows were affected (relationship didn't exist)
    return { success: true };
  } catch (error) {
    console.error('Remove tag from note failed:', error);
    throw error;
  }
};