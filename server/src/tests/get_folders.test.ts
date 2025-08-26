import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { foldersTable, notesTable } from '../db/schema';
import { getFolders } from '../handlers/get_folders';

describe('getFolders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no folders exist', async () => {
    const result = await getFolders();
    expect(result).toEqual([]);
  });

  it('should return root folders with notes count', async () => {
    // Create a root folder
    const [folder] = await db.insert(foldersTable)
      .values({
        name: 'Root Folder',
        parent_id: null
      })
      .returning()
      .execute();

    // Create some notes in the folder
    await db.insert(notesTable)
      .values([
        {
          title: 'Note 1',
          content: 'Content 1',
          folder_id: folder.id,
          is_favorite: false
        },
        {
          title: 'Note 2',
          content: 'Content 2',
          folder_id: folder.id,
          is_favorite: false
        }
      ])
      .execute();

    const result = await getFolders();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(folder.id);
    expect(result[0].name).toBe('Root Folder');
    expect(result[0].parent_id).toBeNull();
    expect(result[0].notes_count).toBe(2);
    expect(result[0].children).toEqual([]);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return multiple root folders', async () => {
    // Create multiple root folders
    await db.insert(foldersTable)
      .values([
        {
          name: 'Root Folder 1',
          parent_id: null
        },
        {
          name: 'Root Folder 2', 
          parent_id: null
        }
      ])
      .execute();

    const result = await getFolders();

    expect(result).toHaveLength(2);
    expect(result.map(f => f.name)).toContain('Root Folder 1');
    expect(result.map(f => f.name)).toContain('Root Folder 2');
    result.forEach(folder => {
      expect(folder.parent_id).toBeNull();
      expect(folder.notes_count).toBe(0);
      expect(folder.children).toEqual([]);
    });
  });

  it('should build hierarchical tree structure with nested children', async () => {
    // Create root folder
    const [rootFolder] = await db.insert(foldersTable)
      .values({
        name: 'Root',
        parent_id: null
      })
      .returning()
      .execute();

    // Create child folders
    const [childFolder1] = await db.insert(foldersTable)
      .values({
        name: 'Child 1',
        parent_id: rootFolder.id
      })
      .returning()
      .execute();

    const [childFolder2] = await db.insert(foldersTable)
      .values({
        name: 'Child 2',
        parent_id: rootFolder.id
      })
      .returning()
      .execute();

    // Create grandchild folder
    await db.insert(foldersTable)
      .values({
        name: 'Grandchild',
        parent_id: childFolder1.id
      })
      .execute();

    const result = await getFolders();

    expect(result).toHaveLength(1);
    
    const root = result[0];
    expect(root.name).toBe('Root');
    expect(root.children).toHaveLength(2);
    
    const child1 = root.children!.find(c => c.name === 'Child 1');
    const child2 = root.children!.find(c => c.name === 'Child 2');
    
    expect(child1).toBeDefined();
    expect(child2).toBeDefined();
    expect(child1!.parent_id).toBe(rootFolder.id);
    expect(child2!.parent_id).toBe(rootFolder.id);
    
    // Check grandchild
    expect(child1!.children).toHaveLength(1);
    expect(child1!.children![0].name).toBe('Grandchild');
    expect(child1!.children![0].parent_id).toBe(childFolder1.id);
    
    expect(child2!.children).toEqual([]);
  });

  it('should include correct notes count for each folder in hierarchy', async () => {
    // Create folder structure
    const [rootFolder] = await db.insert(foldersTable)
      .values({
        name: 'Root',
        parent_id: null
      })
      .returning()
      .execute();

    const [childFolder] = await db.insert(foldersTable)
      .values({
        name: 'Child',
        parent_id: rootFolder.id
      })
      .returning()
      .execute();

    // Add notes to different folders
    await db.insert(notesTable)
      .values([
        // 2 notes in root folder
        {
          title: 'Root Note 1',
          content: 'Content',
          folder_id: rootFolder.id,
          is_favorite: false
        },
        {
          title: 'Root Note 2',
          content: 'Content',
          folder_id: rootFolder.id,
          is_favorite: false
        },
        // 1 note in child folder
        {
          title: 'Child Note',
          content: 'Content',
          folder_id: childFolder.id,
          is_favorite: false
        }
      ])
      .execute();

    const result = await getFolders();

    expect(result).toHaveLength(1);
    
    const root = result[0];
    expect(root.notes_count).toBe(2);
    
    const child = root.children![0];
    expect(child.notes_count).toBe(1);
  });

  it('should handle folders with zero notes', async () => {
    // Create folder without any notes
    await db.insert(foldersTable)
      .values({
        name: 'Empty Folder',
        parent_id: null
      })
      .execute();

    const result = await getFolders();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Empty Folder');
    expect(result[0].notes_count).toBe(0);
  });

  it('should handle complex nested structure correctly', async () => {
    // Create a complex folder structure
    // Root 1
    //   ├── Child 1-1
    //   │   └── Grandchild 1-1-1
    //   └── Child 1-2
    // Root 2
    //   └── Child 2-1

    const [root1] = await db.insert(foldersTable)
      .values({ name: 'Root 1', parent_id: null })
      .returning()
      .execute();

    const [root2] = await db.insert(foldersTable)
      .values({ name: 'Root 2', parent_id: null })
      .returning()
      .execute();

    const [child11] = await db.insert(foldersTable)
      .values({ name: 'Child 1-1', parent_id: root1.id })
      .returning()
      .execute();

    await db.insert(foldersTable)
      .values([
        { name: 'Child 1-2', parent_id: root1.id },
        { name: 'Child 2-1', parent_id: root2.id },
        { name: 'Grandchild 1-1-1', parent_id: child11.id }
      ])
      .execute();

    const result = await getFolders();

    expect(result).toHaveLength(2);
    
    const rootFolder1 = result.find(f => f.name === 'Root 1');
    const rootFolder2 = result.find(f => f.name === 'Root 2');
    
    expect(rootFolder1).toBeDefined();
    expect(rootFolder2).toBeDefined();
    
    expect(rootFolder1!.children).toHaveLength(2);
    expect(rootFolder2!.children).toHaveLength(1);
    
    const child1_1 = rootFolder1!.children!.find(c => c.name === 'Child 1-1');
    expect(child1_1!.children).toHaveLength(1);
    expect(child1_1!.children![0].name).toBe('Grandchild 1-1-1');
  });
});