import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { foldersTable, notesTable, tagsTable, noteTagsTable } from '../db/schema';
import { getNotesByFolder } from '../handlers/get_notes_by_folder';

describe('getNotesByFolder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return notes from a specific folder with tags', async () => {
    // Create test folder
    const folderResult = await db.insert(foldersTable)
      .values({
        name: 'Test Folder',
        parent_id: null
      })
      .returning()
      .execute();
    const folderId = folderResult[0].id;

    // Create test tags
    const tagResults = await db.insert(tagsTable)
      .values([
        { name: 'Important', color: '#ff0000' },
        { name: 'Work', color: '#00ff00' }
      ])
      .returning()
      .execute();

    // Create test notes in the folder
    const noteResults = await db.insert(notesTable)
      .values([
        {
          title: 'Note 1',
          content: 'Content 1',
          folder_id: folderId,
          is_favorite: false
        },
        {
          title: 'Note 2', 
          content: 'Content 2',
          folder_id: folderId,
          is_favorite: true
        }
      ])
      .returning()
      .execute();

    // Associate tags with notes
    await db.insert(noteTagsTable)
      .values([
        { note_id: noteResults[0].id, tag_id: tagResults[0].id },
        { note_id: noteResults[0].id, tag_id: tagResults[1].id },
        { note_id: noteResults[1].id, tag_id: tagResults[0].id }
      ])
      .execute();

    const result = await getNotesByFolder(folderId);

    expect(result).toHaveLength(2);
    
    // Verify first note
    const note1 = result.find(n => n.title === 'Note 1');
    expect(note1).toBeDefined();
    expect(note1!.content).toBe('Content 1');
    expect(note1!.folder_id).toBe(folderId);
    expect(note1!.is_favorite).toBe(false);
    expect(note1!.tags).toHaveLength(2);
    expect(note1!.tags.some(t => t.name === 'Important')).toBe(true);
    expect(note1!.tags.some(t => t.name === 'Work')).toBe(true);

    // Verify second note
    const note2 = result.find(n => n.title === 'Note 2');
    expect(note2).toBeDefined();
    expect(note2!.content).toBe('Content 2');
    expect(note2!.folder_id).toBe(folderId);
    expect(note2!.is_favorite).toBe(true);
    expect(note2!.tags).toHaveLength(1);
    expect(note2!.tags[0].name).toBe('Important');
    expect(note2!.tags[0].color).toBe('#ff0000');
  });

  it('should return notes not in any folder when folderId is null', async () => {
    // Create a folder
    const folderResult = await db.insert(foldersTable)
      .values({
        name: 'Test Folder',
        parent_id: null
      })
      .returning()
      .execute();
    const folderId = folderResult[0].id;

    // Create notes - some in folder, some not
    await db.insert(notesTable)
      .values([
        {
          title: 'Note in Folder',
          content: 'Content in folder',
          folder_id: folderId,
          is_favorite: false
        },
        {
          title: 'Note without Folder 1',
          content: 'Content without folder 1',
          folder_id: null,
          is_favorite: false
        },
        {
          title: 'Note without Folder 2',
          content: 'Content without folder 2',
          folder_id: null,
          is_favorite: true
        }
      ])
      .execute();

    const result = await getNotesByFolder(null);

    expect(result).toHaveLength(2);
    expect(result.every(note => note.folder_id === null)).toBe(true);
    expect(result.some(note => note.title === 'Note without Folder 1')).toBe(true);
    expect(result.some(note => note.title === 'Note without Folder 2')).toBe(true);
    expect(result.some(note => note.title === 'Note in Folder')).toBe(false);
  });

  it('should return notes without tags correctly', async () => {
    // Create test folder
    const folderResult = await db.insert(foldersTable)
      .values({
        name: 'Test Folder',
        parent_id: null
      })
      .returning()
      .execute();
    const folderId = folderResult[0].id;

    // Create note without tags
    await db.insert(notesTable)
      .values({
        title: 'Note without Tags',
        content: 'Content without tags',
        folder_id: folderId,
        is_favorite: false
      })
      .execute();

    const result = await getNotesByFolder(folderId);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Note without Tags');
    expect(result[0].tags).toHaveLength(0);
  });

  it('should return empty array for folder with no notes', async () => {
    // Create empty folder
    const folderResult = await db.insert(foldersTable)
      .values({
        name: 'Empty Folder',
        parent_id: null
      })
      .returning()
      .execute();
    const folderId = folderResult[0].id;

    const result = await getNotesByFolder(folderId);

    expect(result).toHaveLength(0);
  });

  it('should return notes ordered by updated_at DESC', async () => {
    // Create test folder
    const folderResult = await db.insert(foldersTable)
      .values({
        name: 'Test Folder',
        parent_id: null
      })
      .returning()
      .execute();
    const folderId = folderResult[0].id;

    // Create notes with different timestamps
    const now = new Date();
    const earlier = new Date(now.getTime() - 60000); // 1 minute earlier
    const later = new Date(now.getTime() + 60000); // 1 minute later

    await db.insert(notesTable)
      .values([
        {
          title: 'Oldest Note',
          content: 'Content 1',
          folder_id: folderId,
          is_favorite: false,
          created_at: earlier,
          updated_at: earlier
        },
        {
          title: 'Newest Note',
          content: 'Content 2',
          folder_id: folderId,
          is_favorite: false,
          created_at: later,
          updated_at: later
        },
        {
          title: 'Middle Note',
          content: 'Content 3',
          folder_id: folderId,
          is_favorite: false,
          created_at: now,
          updated_at: now
        }
      ])
      .execute();

    const result = await getNotesByFolder(folderId);

    expect(result).toHaveLength(3);
    expect(result[0].title).toBe('Newest Note');
    expect(result[1].title).toBe('Middle Note');
    expect(result[2].title).toBe('Oldest Note');
  });

  it('should handle non-existent folder ID gracefully', async () => {
    const result = await getNotesByFolder(999999);

    expect(result).toHaveLength(0);
  });

  it('should include all required note fields', async () => {
    // Create test folder and note
    const folderResult = await db.insert(foldersTable)
      .values({
        name: 'Test Folder',
        parent_id: null
      })
      .returning()
      .execute();
    const folderId = folderResult[0].id;

    await db.insert(notesTable)
      .values({
        title: 'Complete Note',
        content: 'Complete content',
        folder_id: folderId,
        is_favorite: true
      })
      .execute();

    const result = await getNotesByFolder(folderId);

    expect(result).toHaveLength(1);
    const note = result[0];
    
    expect(note.id).toBeDefined();
    expect(typeof note.id).toBe('number');
    expect(note.title).toBe('Complete Note');
    expect(note.content).toBe('Complete content');
    expect(note.folder_id).toBe(folderId);
    expect(note.is_favorite).toBe(true);
    expect(note.created_at).toBeInstanceOf(Date);
    expect(note.updated_at).toBeInstanceOf(Date);
    expect(Array.isArray(note.tags)).toBe(true);
  });
});