import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { foldersTable, notesTable } from '../db/schema';
import { type DeleteFolderInput } from '../schema';
import { deleteFolder } from '../handlers/delete_folder';
import { eq } from 'drizzle-orm';

describe('deleteFolder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a folder successfully', async () => {
    // Create a test folder
    const folderResult = await db.insert(foldersTable)
      .values({
        name: 'Test Folder',
        parent_id: null
      })
      .returning()
      .execute();

    const folderId = folderResult[0].id;

    const input: DeleteFolderInput = {
      id: folderId
    };

    const result = await deleteFolder(input);

    // Verify success response
    expect(result.success).toBe(true);

    // Verify folder is deleted from database
    const folders = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.id, folderId))
      .execute();

    expect(folders).toHaveLength(0);
  });

  it('should throw error when folder does not exist', async () => {
    const input: DeleteFolderInput = {
      id: 999 // Non-existent folder ID
    };

    await expect(deleteFolder(input)).rejects.toThrow(/folder not found/i);
  });

  it('should move child folders to parent folder when deleting', async () => {
    // Create parent folder
    const parentResult = await db.insert(foldersTable)
      .values({
        name: 'Parent Folder',
        parent_id: null
      })
      .returning()
      .execute();
    const parentId = parentResult[0].id;

    // Create folder to be deleted
    const folderToDeleteResult = await db.insert(foldersTable)
      .values({
        name: 'Folder to Delete',
        parent_id: parentId
      })
      .returning()
      .execute();
    const folderToDeleteId = folderToDeleteResult[0].id;

    // Create child folders
    const childResult1 = await db.insert(foldersTable)
      .values({
        name: 'Child Folder 1',
        parent_id: folderToDeleteId
      })
      .returning()
      .execute();

    const childResult2 = await db.insert(foldersTable)
      .values({
        name: 'Child Folder 2',
        parent_id: folderToDeleteId
      })
      .returning()
      .execute();

    const child1Id = childResult1[0].id;
    const child2Id = childResult2[0].id;

    // Delete the folder
    await deleteFolder({ id: folderToDeleteId });

    // Verify child folders are moved to parent
    const childFolders = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.parent_id, parentId))
      .execute();

    // Should contain the 2 moved child folders
    const movedChildren = childFolders.filter(f => 
      f.id === child1Id || f.id === child2Id
    );
    expect(movedChildren).toHaveLength(2);
    expect(movedChildren.every(f => f.parent_id === parentId)).toBe(true);
  });

  it('should move child folders to null when deleting root folder', async () => {
    // Create root folder to be deleted
    const rootResult = await db.insert(foldersTable)
      .values({
        name: 'Root Folder',
        parent_id: null
      })
      .returning()
      .execute();
    const rootId = rootResult[0].id;

    // Create child folders
    const childResult1 = await db.insert(foldersTable)
      .values({
        name: 'Child Folder 1',
        parent_id: rootId
      })
      .returning()
      .execute();

    const childResult2 = await db.insert(foldersTable)
      .values({
        name: 'Child Folder 2',
        parent_id: rootId
      })
      .returning()
      .execute();

    const child1Id = childResult1[0].id;
    const child2Id = childResult2[0].id;

    // Delete the root folder
    await deleteFolder({ id: rootId });

    // Verify child folders are moved to null (become root folders)
    const child1 = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.id, child1Id))
      .execute();

    const child2 = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.id, child2Id))
      .execute();

    expect(child1[0].parent_id).toBeNull();
    expect(child2[0].parent_id).toBeNull();
  });

  it('should move notes to parent folder when deleting folder', async () => {
    // Create parent folder
    const parentResult = await db.insert(foldersTable)
      .values({
        name: 'Parent Folder',
        parent_id: null
      })
      .returning()
      .execute();
    const parentId = parentResult[0].id;

    // Create folder to be deleted
    const folderToDeleteResult = await db.insert(foldersTable)
      .values({
        name: 'Folder to Delete',
        parent_id: parentId
      })
      .returning()
      .execute();
    const folderToDeleteId = folderToDeleteResult[0].id;

    // Create notes in the folder to be deleted
    const noteResult1 = await db.insert(notesTable)
      .values({
        title: 'Note 1',
        content: 'Content 1',
        folder_id: folderToDeleteId,
        is_favorite: false
      })
      .returning()
      .execute();

    const noteResult2 = await db.insert(notesTable)
      .values({
        title: 'Note 2',
        content: 'Content 2',
        folder_id: folderToDeleteId,
        is_favorite: false
      })
      .returning()
      .execute();

    const note1Id = noteResult1[0].id;
    const note2Id = noteResult2[0].id;

    // Delete the folder
    await deleteFolder({ id: folderToDeleteId });

    // Verify notes are moved to parent folder
    const note1 = await db.select()
      .from(notesTable)
      .where(eq(notesTable.id, note1Id))
      .execute();

    const note2 = await db.select()
      .from(notesTable)
      .where(eq(notesTable.id, note2Id))
      .execute();

    expect(note1[0].folder_id).toBe(parentId);
    expect(note2[0].folder_id).toBe(parentId);
  });

  it('should move notes to null when deleting root folder', async () => {
    // Create root folder to be deleted
    const rootResult = await db.insert(foldersTable)
      .values({
        name: 'Root Folder',
        parent_id: null
      })
      .returning()
      .execute();
    const rootId = rootResult[0].id;

    // Create notes in the root folder
    const noteResult1 = await db.insert(notesTable)
      .values({
        title: 'Note 1',
        content: 'Content 1',
        folder_id: rootId,
        is_favorite: false
      })
      .returning()
      .execute();

    const noteResult2 = await db.insert(notesTable)
      .values({
        title: 'Note 2',
        content: 'Content 2',
        folder_id: rootId,
        is_favorite: false
      })
      .returning()
      .execute();

    const note1Id = noteResult1[0].id;
    const note2Id = noteResult2[0].id;

    // Delete the root folder
    await deleteFolder({ id: rootId });

    // Verify notes are moved to null (no folder)
    const note1 = await db.select()
      .from(notesTable)
      .where(eq(notesTable.id, note1Id))
      .execute();

    const note2 = await db.select()
      .from(notesTable)
      .where(eq(notesTable.id, note2Id))
      .execute();

    expect(note1[0].folder_id).toBeNull();
    expect(note2[0].folder_id).toBeNull();
  });

  it('should handle complex nested folder structure', async () => {
    // Create a multi-level folder hierarchy
    // Root -> Parent -> FolderToDelete -> Child -> GrandChild

    const rootResult = await db.insert(foldersTable)
      .values({
        name: 'Root Folder',
        parent_id: null
      })
      .returning()
      .execute();
    const rootId = rootResult[0].id;

    const parentResult = await db.insert(foldersTable)
      .values({
        name: 'Parent Folder',
        parent_id: rootId
      })
      .returning()
      .execute();
    const parentId = parentResult[0].id;

    const folderToDeleteResult = await db.insert(foldersTable)
      .values({
        name: 'Folder to Delete',
        parent_id: parentId
      })
      .returning()
      .execute();
    const folderToDeleteId = folderToDeleteResult[0].id;

    const childResult = await db.insert(foldersTable)
      .values({
        name: 'Child Folder',
        parent_id: folderToDeleteId
      })
      .returning()
      .execute();
    const childId = childResult[0].id;

    const grandChildResult = await db.insert(foldersTable)
      .values({
        name: 'GrandChild Folder',
        parent_id: childId
      })
      .returning()
      .execute();
    const grandChildId = grandChildResult[0].id;

    // Create notes at different levels
    await db.insert(notesTable)
      .values({
        title: 'Note in folder to delete',
        content: 'Content',
        folder_id: folderToDeleteId,
        is_favorite: false
      })
      .execute();

    await db.insert(notesTable)
      .values({
        title: 'Note in child folder',
        content: 'Content',
        folder_id: childId,
        is_favorite: false
      })
      .execute();

    // Delete the middle folder
    await deleteFolder({ id: folderToDeleteId });

    // Verify child folder moved to parent
    const childFolder = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.id, childId))
      .execute();
    expect(childFolder[0].parent_id).toBe(parentId);

    // Verify grandchild folder still points to child
    const grandChildFolder = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.id, grandChildId))
      .execute();
    expect(grandChildFolder[0].parent_id).toBe(childId);

    // Verify notes were moved appropriately
    const notesInParent = await db.select()
      .from(notesTable)
      .where(eq(notesTable.folder_id, parentId))
      .execute();
    expect(notesInParent).toHaveLength(1);
    expect(notesInParent[0].title).toBe('Note in folder to delete');

    const notesInChild = await db.select()
      .from(notesTable)
      .where(eq(notesTable.folder_id, childId))
      .execute();
    expect(notesInChild).toHaveLength(1);
    expect(notesInChild[0].title).toBe('Note in child folder');

    // Verify original folder is deleted
    const deletedFolder = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.id, folderToDeleteId))
      .execute();
    expect(deletedFolder).toHaveLength(0);
  });
});