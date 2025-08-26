import { db } from '../db';
import { foldersTable } from '../db/schema';
import { type UpdateFolderInput, type Folder } from '../schema';
import { eq, sql } from 'drizzle-orm';

export const updateFolder = async (input: UpdateFolderInput): Promise<Folder> => {
  try {
    // Check if folder exists
    const existingFolder = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.id, input.id))
      .execute();

    if (existingFolder.length === 0) {
      throw new Error(`Folder with id ${input.id} not found`);
    }

    // If parent_id is provided, validate it exists and isn't creating a cycle
    if (input.parent_id !== undefined && input.parent_id !== null) {
      const parentFolder = await db.select()
        .from(foldersTable)
        .where(eq(foldersTable.id, input.parent_id))
        .execute();

      if (parentFolder.length === 0) {
        throw new Error(`Parent folder with id ${input.parent_id} not found`);
      }

      // Check for circular reference (folder can't be its own parent or descendant)
      if (input.parent_id === input.id) {
        throw new Error('Folder cannot be its own parent');
      }

      // Check if the parent is a descendant of this folder (would create a cycle)
      const isDescendant = await checkIfDescendant(input.id, input.parent_id);
      if (isDescendant) {
        throw new Error('Cannot move folder to its own descendant');
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: sql`NOW()` // Always update timestamp
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.parent_id !== undefined) {
      updateData.parent_id = input.parent_id;
    }

    // Update the folder
    const result = await db.update(foldersTable)
      .set(updateData)
      .where(eq(foldersTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Folder update failed:', error);
    throw error;
  }
};

// Helper function to check if a folder is a descendant of another
const checkIfDescendant = async (folderId: number, potentialAncestorId: number): Promise<boolean> => {
  const descendants = await db.execute(sql`
    WITH RECURSIVE folder_tree AS (
      -- Base case: start with the folder
      SELECT id, parent_id, 0 as level
      FROM folders 
      WHERE id = ${folderId}
      
      UNION ALL
      
      -- Recursive case: find all descendants
      SELECT f.id, f.parent_id, ft.level + 1
      FROM folders f
      INNER JOIN folder_tree ft ON f.parent_id = ft.id
      WHERE ft.level < 10 -- Prevent infinite recursion
    )
    SELECT id FROM folder_tree WHERE id = ${potentialAncestorId}
  `);

  return descendants.rows.length > 0;
};