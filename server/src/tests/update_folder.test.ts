import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { foldersTable } from '../db/schema';
import { type UpdateFolderInput } from '../schema';
import { updateFolder } from '../handlers/update_folder';
import { eq } from 'drizzle-orm';

describe('updateFolder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update folder name', async () => {
    // Create a test folder
    const createdFolder = await db.insert(foldersTable)
      .values({
        name: 'Original Folder',
        parent_id: null
      })
      .returning()
      .execute();

    const folderId = createdFolder[0].id;

    const input: UpdateFolderInput = {
      id: folderId,
      name: 'Updated Folder Name'
    };

    const result = await updateFolder(input);

    expect(result.id).toEqual(folderId);
    expect(result.name).toEqual('Updated Folder Name');
    expect(result.parent_id).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify the change was persisted
    const updatedFolder = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.id, folderId))
      .execute();

    expect(updatedFolder[0].name).toEqual('Updated Folder Name');
  });

  it('should update folder parent', async () => {
    // Create parent folder
    const parentFolder = await db.insert(foldersTable)
      .values({
        name: 'Parent Folder',
        parent_id: null
      })
      .returning()
      .execute();

    // Create child folder
    const childFolder = await db.insert(foldersTable)
      .values({
        name: 'Child Folder',
        parent_id: null
      })
      .returning()
      .execute();

    const input: UpdateFolderInput = {
      id: childFolder[0].id,
      parent_id: parentFolder[0].id
    };

    const result = await updateFolder(input);

    expect(result.id).toEqual(childFolder[0].id);
    expect(result.parent_id).toEqual(parentFolder[0].id);
    expect(result.name).toEqual('Child Folder'); // Name should remain unchanged

    // Verify the change was persisted
    const updatedFolder = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.id, childFolder[0].id))
      .execute();

    expect(updatedFolder[0].parent_id).toEqual(parentFolder[0].id);
  });

  it('should update both name and parent', async () => {
    // Create parent folder
    const parentFolder = await db.insert(foldersTable)
      .values({
        name: 'Parent Folder',
        parent_id: null
      })
      .returning()
      .execute();

    // Create child folder
    const childFolder = await db.insert(foldersTable)
      .values({
        name: 'Original Name',
        parent_id: null
      })
      .returning()
      .execute();

    const input: UpdateFolderInput = {
      id: childFolder[0].id,
      name: 'Updated Name',
      parent_id: parentFolder[0].id
    };

    const result = await updateFolder(input);

    expect(result.id).toEqual(childFolder[0].id);
    expect(result.name).toEqual('Updated Name');
    expect(result.parent_id).toEqual(parentFolder[0].id);

    // Verify both changes were persisted
    const updatedFolder = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.id, childFolder[0].id))
      .execute();

    expect(updatedFolder[0].name).toEqual('Updated Name');
    expect(updatedFolder[0].parent_id).toEqual(parentFolder[0].id);
  });

  it('should set parent to null', async () => {
    // Create parent folder
    const parentFolder = await db.insert(foldersTable)
      .values({
        name: 'Parent Folder',
        parent_id: null
      })
      .returning()
      .execute();

    // Create child folder with parent
    const childFolder = await db.insert(foldersTable)
      .values({
        name: 'Child Folder',
        parent_id: parentFolder[0].id
      })
      .returning()
      .execute();

    const input: UpdateFolderInput = {
      id: childFolder[0].id,
      parent_id: null
    };

    const result = await updateFolder(input);

    expect(result.id).toEqual(childFolder[0].id);
    expect(result.parent_id).toBeNull();

    // Verify the change was persisted
    const updatedFolder = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.id, childFolder[0].id))
      .execute();

    expect(updatedFolder[0].parent_id).toBeNull();
  });

  it('should throw error when folder does not exist', async () => {
    const input: UpdateFolderInput = {
      id: 999,
      name: 'Non-existent Folder'
    };

    await expect(updateFolder(input)).rejects.toThrow(/folder with id 999 not found/i);
  });

  it('should throw error when parent folder does not exist', async () => {
    // Create a test folder
    const createdFolder = await db.insert(foldersTable)
      .values({
        name: 'Test Folder',
        parent_id: null
      })
      .returning()
      .execute();

    const input: UpdateFolderInput = {
      id: createdFolder[0].id,
      parent_id: 999
    };

    await expect(updateFolder(input)).rejects.toThrow(/parent folder with id 999 not found/i);
  });

  it('should throw error when folder tries to be its own parent', async () => {
    // Create a test folder
    const createdFolder = await db.insert(foldersTable)
      .values({
        name: 'Test Folder',
        parent_id: null
      })
      .returning()
      .execute();

    const input: UpdateFolderInput = {
      id: createdFolder[0].id,
      parent_id: createdFolder[0].id
    };

    await expect(updateFolder(input)).rejects.toThrow(/folder cannot be its own parent/i);
  });

  it('should throw error when creating circular reference', async () => {
    // Create parent folder
    const parentFolder = await db.insert(foldersTable)
      .values({
        name: 'Parent Folder',
        parent_id: null
      })
      .returning()
      .execute();

    // Create child folder
    const childFolder = await db.insert(foldersTable)
      .values({
        name: 'Child Folder',
        parent_id: parentFolder[0].id
      })
      .returning()
      .execute();

    // Create grandchild folder
    const grandchildFolder = await db.insert(foldersTable)
      .values({
        name: 'Grandchild Folder',
        parent_id: childFolder[0].id
      })
      .returning()
      .execute();

    // Try to make grandchild the parent of the original parent (circular)
    const input: UpdateFolderInput = {
      id: parentFolder[0].id,
      parent_id: grandchildFolder[0].id
    };

    await expect(updateFolder(input)).rejects.toThrow(/cannot move folder to its own descendant/i);
  });

  it('should update updated_at timestamp', async () => {
    // Create a test folder
    const createdFolder = await db.insert(foldersTable)
      .values({
        name: 'Test Folder',
        parent_id: null
      })
      .returning()
      .execute();

    const originalUpdatedAt = createdFolder[0].updated_at;
    
    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateFolderInput = {
      id: createdFolder[0].id,
      name: 'Updated Name'
    };

    const result = await updateFolder(input);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should handle partial updates correctly', async () => {
    // Create a test folder with parent
    const parentFolder = await db.insert(foldersTable)
      .values({
        name: 'Parent Folder',
        parent_id: null
      })
      .returning()
      .execute();

    const testFolder = await db.insert(foldersTable)
      .values({
        name: 'Original Name',
        parent_id: parentFolder[0].id
      })
      .returning()
      .execute();

    // Update only name, leave parent unchanged
    const input: UpdateFolderInput = {
      id: testFolder[0].id,
      name: 'New Name'
    };

    const result = await updateFolder(input);

    expect(result.name).toEqual('New Name');
    expect(result.parent_id).toEqual(parentFolder[0].id); // Should remain unchanged
  });
});