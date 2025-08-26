import { db } from '../db';
import { foldersTable, notesTable } from '../db/schema';
import { type DeleteFolderInput } from '../schema';
import { eq } from 'drizzle-orm';

export const deleteFolder = async (input: DeleteFolderInput): Promise<{ success: boolean }> => {
  try {
    // First, verify the folder exists
    const folder = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.id, input.id))
      .execute();

    if (folder.length === 0) {
      throw new Error('Folder not found');
    }

    const folderToDelete = folder[0];

    // Handle cascading operations: move child folders and notes to parent folder
    // Move child folders to the parent folder (or null if deleting a root folder)
    await db.update(foldersTable)
      .set({ parent_id: folderToDelete.parent_id })
      .where(eq(foldersTable.parent_id, input.id))
      .execute();

    // Move notes in this folder to the parent folder (or null if deleting a root folder)
    await db.update(notesTable)
      .set({ folder_id: folderToDelete.parent_id })
      .where(eq(notesTable.folder_id, input.id))
      .execute();

    // Finally, delete the folder itself
    await db.delete(foldersTable)
      .where(eq(foldersTable.id, input.id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Folder deletion failed:', error);
    throw error;
  }
};