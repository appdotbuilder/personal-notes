import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { foldersTable, notesTable, tagsTable, noteTagsTable } from '../db/schema';
import { getNotes } from '../handlers/get_notes';

describe('getNotes', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no notes exist', async () => {
    const result = await getNotes();
    
    expect(result).toEqual([]);
  });

  it('should return notes without tags', async () => {
    // Create a test note without tags
    const noteResult = await db.insert(notesTable)
      .values({
        title: 'Test Note',
        content: 'Test content',
        folder_id: null,
        is_favorite: false
      })
      .returning()
      .execute();

    const result = await getNotes();

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(noteResult[0].id);
    expect(result[0].title).toEqual('Test Note');
    expect(result[0].content).toEqual('Test content');
    expect(result[0].folder_id).toBeNull();
    expect(result[0].is_favorite).toBe(false);
    expect(result[0].tags).toEqual([]);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return notes with associated tags', async () => {
    // Create test tags
    const tagsResult = await db.insert(tagsTable)
      .values([
        { name: 'Important', color: '#ff0000' },
        { name: 'Work', color: '#0000ff' }
      ])
      .returning()
      .execute();

    // Create a test note
    const noteResult = await db.insert(notesTable)
      .values({
        title: 'Tagged Note',
        content: 'Content with tags',
        folder_id: null,
        is_favorite: true
      })
      .returning()
      .execute();

    // Associate tags with the note
    await db.insert(noteTagsTable)
      .values([
        { note_id: noteResult[0].id, tag_id: tagsResult[0].id },
        { note_id: noteResult[0].id, tag_id: tagsResult[1].id }
      ])
      .execute();

    const result = await getNotes();

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(noteResult[0].id);
    expect(result[0].title).toEqual('Tagged Note');
    expect(result[0].content).toEqual('Content with tags');
    expect(result[0].is_favorite).toBe(true);
    expect(result[0].tags).toHaveLength(2);

    // Check tags are properly structured
    const tagNames = result[0].tags.map(tag => tag.name).sort();
    expect(tagNames).toEqual(['Important', 'Work']);

    const importantTag = result[0].tags.find(tag => tag.name === 'Important');
    expect(importantTag).toBeDefined();
    expect(importantTag!.id).toEqual(tagsResult[0].id);
    expect(importantTag!.color).toEqual('#ff0000');
    expect(importantTag!.created_at).toBeInstanceOf(Date);
  });

  it('should return multiple notes in correct order (newest first)', async () => {
    // Create notes with different timestamps
    const firstNote = await db.insert(notesTable)
      .values({
        title: 'First Note',
        content: 'First content',
        folder_id: null,
        is_favorite: false
      })
      .returning()
      .execute();

    // Wait a moment to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const secondNote = await db.insert(notesTable)
      .values({
        title: 'Second Note',
        content: 'Second content',
        folder_id: null,
        is_favorite: false
      })
      .returning()
      .execute();

    const result = await getNotes();

    expect(result).toHaveLength(2);
    // Should be ordered by updated_at DESC (newest first)
    expect(result[0].title).toEqual('Second Note');
    expect(result[1].title).toEqual('First Note');
    expect(result[0].updated_at >= result[1].updated_at).toBe(true);
  });

  it('should handle notes in folders correctly', async () => {
    // Create a test folder
    const folderResult = await db.insert(foldersTable)
      .values({
        name: 'Test Folder',
        parent_id: null
      })
      .returning()
      .execute();

    // Create a note in the folder
    const noteResult = await db.insert(notesTable)
      .values({
        title: 'Folder Note',
        content: 'Content in folder',
        folder_id: folderResult[0].id,
        is_favorite: false
      })
      .returning()
      .execute();

    const result = await getNotes();

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Folder Note');
    expect(result[0].folder_id).toEqual(folderResult[0].id);
  });

  it('should handle complex scenario with multiple notes and tags', async () => {
    // Create multiple tags
    const tagsResult = await db.insert(tagsTable)
      .values([
        { name: 'Tag1', color: '#111111' },
        { name: 'Tag2', color: '#222222' },
        { name: 'Tag3', color: null }
      ])
      .returning()
      .execute();

    // Create multiple notes
    const notesResult = await db.insert(notesTable)
      .values([
        { title: 'Note 1', content: 'Content 1', folder_id: null, is_favorite: true },
        { title: 'Note 2', content: 'Content 2', folder_id: null, is_favorite: false },
        { title: 'Note 3', content: 'Content 3', folder_id: null, is_favorite: false }
      ])
      .returning()
      .execute();

    // Create various tag associations
    await db.insert(noteTagsTable)
      .values([
        // Note 1 has tags 1 and 2
        { note_id: notesResult[0].id, tag_id: tagsResult[0].id },
        { note_id: notesResult[0].id, tag_id: tagsResult[1].id },
        // Note 2 has tag 3
        { note_id: notesResult[1].id, tag_id: tagsResult[2].id },
        // Note 3 has no tags (no entries in junction table)
      ])
      .execute();

    const result = await getNotes();

    expect(result).toHaveLength(3);

    // Find each note by title
    const note1 = result.find(n => n.title === 'Note 1');
    const note2 = result.find(n => n.title === 'Note 2');
    const note3 = result.find(n => n.title === 'Note 3');

    expect(note1).toBeDefined();
    expect(note1!.tags).toHaveLength(2);
    expect(note1!.is_favorite).toBe(true);

    expect(note2).toBeDefined();
    expect(note2!.tags).toHaveLength(1);
    expect(note2!.tags[0].name).toEqual('Tag3');
    expect(note2!.tags[0].color).toBeNull();

    expect(note3).toBeDefined();
    expect(note3!.tags).toHaveLength(0);
  });
});