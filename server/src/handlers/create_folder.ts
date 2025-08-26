import { db } from '../db';
import { foldersTable } from '../db/schema';
import { type CreateFolderInput, type Folder } from '../schema';
import { eq } from 'drizzle-orm';

export const createFolder = async (input: CreateFolderInput): Promise<Folder> => {
  try {
    // Validate parent folder exists if parent_id is provided
    if (input.parent_id !== null) {
      const parentFolder = await db.select()
        .from(foldersTable)
        .where(eq(foldersTable.id, input.parent_id))
        .execute();

      if (parentFolder.length === 0) {
        throw new Error(`Parent folder with ID ${input.parent_id} does not exist`);
      }
    }

    // Insert new folder record
    const result = await db.insert(foldersTable)
      .values({
        name: input.name,
        parent_id: input.parent_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Folder creation failed:', error);
    throw error;
  }
};