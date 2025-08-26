import { db } from '../db';
import { foldersTable, notesTable } from '../db/schema';
import { type FolderWithChildren } from '../schema';
import { eq, isNull, count } from 'drizzle-orm';

export const getFolders = async (): Promise<FolderWithChildren[]> => {
  try {
    // Get all folders with their notes count
    const foldersWithCount = await db
      .select({
        id: foldersTable.id,
        name: foldersTable.name,
        parent_id: foldersTable.parent_id,
        created_at: foldersTable.created_at,
        updated_at: foldersTable.updated_at,
        notes_count: count(notesTable.id)
      })
      .from(foldersTable)
      .leftJoin(notesTable, eq(foldersTable.id, notesTable.folder_id))
      .groupBy(
        foldersTable.id,
        foldersTable.name,
        foldersTable.parent_id,
        foldersTable.created_at,
        foldersTable.updated_at
      )
      .execute();

    // Convert to folder objects with proper typing
    const folders: FolderWithChildren[] = foldersWithCount.map(folder => ({
      id: folder.id,
      name: folder.name,
      parent_id: folder.parent_id,
      created_at: folder.created_at,
      updated_at: folder.updated_at,
      notes_count: folder.notes_count,
      children: []
    }));

    // Build hierarchical structure
    const folderMap = new Map<number, FolderWithChildren>();
    const rootFolders: FolderWithChildren[] = [];

    // Create a map of all folders by ID
    folders.forEach(folder => {
      folderMap.set(folder.id, folder);
    });

    // Build the tree structure
    folders.forEach(folder => {
      if (folder.parent_id === null) {
        // Root folder
        rootFolders.push(folder);
      } else {
        // Child folder - add to parent's children array
        const parent = folderMap.get(folder.parent_id);
        if (parent) {
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(folder);
        }
      }
    });

    return rootFolders;
  } catch (error) {
    console.error('Failed to fetch folders:', error);
    throw error;
  }
};