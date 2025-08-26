import { db } from '../db';
import { noteTagsTable, notesTable, tagsTable } from '../db/schema';
import { type AddTagToNoteInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export const addTagToNote = async (input: AddTagToNoteInput): Promise<{ success: boolean }> => {
  try {
    // Verify that the note exists
    const noteExists = await db.select({ id: notesTable.id })
      .from(notesTable)
      .where(eq(notesTable.id, input.note_id))
      .execute();

    if (noteExists.length === 0) {
      throw new Error(`Note with id ${input.note_id} not found`);
    }

    // Verify that the tag exists
    const tagExists = await db.select({ id: tagsTable.id })
      .from(tagsTable)
      .where(eq(tagsTable.id, input.tag_id))
      .execute();

    if (tagExists.length === 0) {
      throw new Error(`Tag with id ${input.tag_id} not found`);
    }

    // Check if the association already exists
    const existingAssociation = await db.select()
      .from(noteTagsTable)
      .where(
        and(
          eq(noteTagsTable.note_id, input.note_id),
          eq(noteTagsTable.tag_id, input.tag_id)
        )
      )
      .execute();

    if (existingAssociation.length > 0) {
      throw new Error(`Tag is already associated with this note`);
    }

    // Create the association
    await db.insert(noteTagsTable)
      .values({
        note_id: input.note_id,
        tag_id: input.tag_id
      })
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Adding tag to note failed:', error);
    throw error;
  }
};