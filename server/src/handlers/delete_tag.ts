import { db } from '../db';
import { tagsTable, noteTagsTable } from '../db/schema';
import { type DeleteTagInput } from '../schema';
import { eq } from 'drizzle-orm';

export const deleteTag = async (input: DeleteTagInput): Promise<{ success: boolean }> => {
  try {
    // First, delete all note-tag associations for this tag
    await db.delete(noteTagsTable)
      .where(eq(noteTagsTable.tag_id, input.id))
      .execute();

    // Then, delete the tag itself
    const result = await db.delete(tagsTable)
      .where(eq(tagsTable.id, input.id))
      .returning()
      .execute();

    // Return success if tag was found and deleted
    return { success: result.length > 0 };
  } catch (error) {
    console.error('Tag deletion failed:', error);
    throw error;
  }
};