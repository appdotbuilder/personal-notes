import { db } from '../db';
import { notesTable, foldersTable } from '../db/schema';
import { type CreateNoteInput, type NoteWithTags } from '../schema';
import { eq } from 'drizzle-orm';

export const createNote = async (input: CreateNoteInput): Promise<NoteWithTags> => {
  try {
    // Validate folder exists if folder_id is provided
    if (input.folder_id !== null) {
      const folder = await db.select()
        .from(foldersTable)
        .where(eq(foldersTable.id, input.folder_id))
        .execute();

      if (folder.length === 0) {
        throw new Error(`Folder with id ${input.folder_id} does not exist`);
      }
    }

    // Insert note record
    const result = await db.insert(notesTable)
      .values({
        title: input.title,
        content: input.content,
        folder_id: input.folder_id,
        is_favorite: input.is_favorite
      })
      .returning()
      .execute();

    const note = result[0];
    
    // Return note with empty tags array (no tags initially)
    return {
      ...note,
      tags: []
    };
  } catch (error) {
    console.error('Note creation failed:', error);
    throw error;
  }
};