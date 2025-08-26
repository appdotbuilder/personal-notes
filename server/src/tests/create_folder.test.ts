import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { foldersTable } from '../db/schema';
import { type CreateFolderInput } from '../schema';
import { createFolder } from '../handlers/create_folder';
import { eq } from 'drizzle-orm';

// Test inputs for different scenarios
const rootFolderInput: CreateFolderInput = {
  name: 'Root Folder',
  parent_id: null
};

const childFolderInput: CreateFolderInput = {
  name: 'Child Folder',
  parent_id: 1 // Will be set to actual parent ID in tests
};

describe('createFolder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a root folder', async () => {
    const result = await createFolder(rootFolderInput);

    // Basic field validation
    expect(result.name).toEqual('Root Folder');
    expect(result.parent_id).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save root folder to database', async () => {
    const result = await createFolder(rootFolderInput);

    // Query database to verify folder was saved
    const folders = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.id, result.id))
      .execute();

    expect(folders).toHaveLength(1);
    expect(folders[0].name).toEqual('Root Folder');
    expect(folders[0].parent_id).toBeNull();
    expect(folders[0].created_at).toBeInstanceOf(Date);
    expect(folders[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create a child folder with valid parent_id', async () => {
    // First create a parent folder
    const parentFolder = await createFolder(rootFolderInput);

    // Create child folder with parent reference
    const childInput: CreateFolderInput = {
      name: 'Child Folder',
      parent_id: parentFolder.id
    };

    const result = await createFolder(childInput);

    // Validate child folder properties
    expect(result.name).toEqual('Child Folder');
    expect(result.parent_id).toEqual(parentFolder.id);
    expect(result.id).toBeDefined();
    expect(result.id).not.toEqual(parentFolder.id);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save child folder to database with correct parent reference', async () => {
    // Create parent folder first
    const parentFolder = await createFolder(rootFolderInput);

    // Create child folder
    const childInput: CreateFolderInput = {
      name: 'Child Folder',
      parent_id: parentFolder.id
    };

    const childFolder = await createFolder(childInput);

    // Query database to verify child folder was saved correctly
    const folders = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.id, childFolder.id))
      .execute();

    expect(folders).toHaveLength(1);
    expect(folders[0].name).toEqual('Child Folder');
    expect(folders[0].parent_id).toEqual(parentFolder.id);
    expect(folders[0].created_at).toBeInstanceOf(Date);
    expect(folders[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when parent_id references non-existent folder', async () => {
    const invalidParentInput: CreateFolderInput = {
      name: 'Invalid Child',
      parent_id: 999 // Non-existent parent ID
    };

    await expect(createFolder(invalidParentInput))
      .rejects
      .toThrow(/Parent folder with ID 999 does not exist/i);
  });

  it('should create multiple folders in hierarchical structure', async () => {
    // Create root folder
    const rootFolder = await createFolder({
      name: 'Root',
      parent_id: null
    });

    // Create first-level child
    const level1Folder = await createFolder({
      name: 'Level 1',
      parent_id: rootFolder.id
    });

    // Create second-level child
    const level2Folder = await createFolder({
      name: 'Level 2',
      parent_id: level1Folder.id
    });

    // Verify hierarchy is maintained
    expect(rootFolder.parent_id).toBeNull();
    expect(level1Folder.parent_id).toEqual(rootFolder.id);
    expect(level2Folder.parent_id).toEqual(level1Folder.id);

    // Verify all folders are in database
    const allFolders = await db.select().from(foldersTable).execute();
    expect(allFolders).toHaveLength(3);

    // Verify folder names and hierarchy
    const rootInDb = allFolders.find(f => f.id === rootFolder.id);
    const level1InDb = allFolders.find(f => f.id === level1Folder.id);
    const level2InDb = allFolders.find(f => f.id === level2Folder.id);

    expect(rootInDb?.name).toEqual('Root');
    expect(rootInDb?.parent_id).toBeNull();
    expect(level1InDb?.name).toEqual('Level 1');
    expect(level1InDb?.parent_id).toEqual(rootFolder.id);
    expect(level2InDb?.name).toEqual('Level 2');
    expect(level2InDb?.parent_id).toEqual(level1Folder.id);
  });

  it('should handle folder names with special characters', async () => {
    const specialNameInput: CreateFolderInput = {
      name: 'Folder with "quotes" & symbols!@#$%',
      parent_id: null
    };

    const result = await createFolder(specialNameInput);

    expect(result.name).toEqual('Folder with "quotes" & symbols!@#$%');
    expect(result.id).toBeDefined();

    // Verify in database
    const folders = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.id, result.id))
      .execute();

    expect(folders[0].name).toEqual('Folder with "quotes" & symbols!@#$%');
  });
});