import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { notesTable, tagsTable, noteTagsTable, foldersTable } from '../db/schema';
import { getFavoriteNotes } from '../handlers/get_favorite_notes';

describe('getFavoriteNotes', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no favorite notes exist', async () => {
    // Create a regular note (not favorite)
    await db.insert(notesTable).values({
      title: 'Regular Note',
      content: 'Regular content',
      folder_id: null,
      is_favorite: false
    }).execute();

    const result = await getFavoriteNotes();

    expect(result).toEqual([]);
  });

  it('should return favorite notes without tags', async () => {
    // Create a favorite note without tags
    const insertResult = await db.insert(notesTable).values({
      title: 'Favorite Note',
      content: 'Favorite content',
      folder_id: null,
      is_favorite: true
    }).returning().execute();

    const result = await getFavoriteNotes();

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Favorite Note');
    expect(result[0].content).toEqual('Favorite content');
    expect(result[0].is_favorite).toEqual(true);
    expect(result[0].tags).toEqual([]);
    expect(result[0].id).toEqual(insertResult[0].id);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return favorite notes with tags', async () => {
    // Create tags first
    const tagResults = await db.insert(tagsTable).values([
      { name: 'Important', color: '#ff0000' },
      { name: 'Work', color: '#0000ff' }
    ]).returning().execute();

    // Create a favorite note
    const noteResult = await db.insert(notesTable).values({
      title: 'Tagged Favorite',
      content: 'Content with tags',
      folder_id: null,
      is_favorite: true
    }).returning().execute();

    // Associate tags with the note
    await db.insert(noteTagsTable).values([
      { note_id: noteResult[0].id, tag_id: tagResults[0].id },
      { note_id: noteResult[0].id, tag_id: tagResults[1].id }
    ]).execute();

    const result = await getFavoriteNotes();

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Tagged Favorite');
    expect(result[0].tags).toHaveLength(2);
    
    // Check that both tags are present
    const tagNames = result[0].tags.map(tag => tag.name);
    expect(tagNames).toContain('Important');
    expect(tagNames).toContain('Work');
    
    // Check tag properties
    const importantTag = result[0].tags.find(tag => tag.name === 'Important');
    expect(importantTag).toBeDefined();
    expect(importantTag!.color).toEqual('#ff0000');
    expect(importantTag!.id).toEqual(tagResults[0].id);
    expect(importantTag!.created_at).toBeInstanceOf(Date);
  });

  it('should return multiple favorite notes ordered by updated_at DESC', async () => {
    // Create notes with slight delays to ensure different timestamps
    const firstNote = await db.insert(notesTable).values({
      title: 'First Favorite',
      content: 'First content',
      folder_id: null,
      is_favorite: true
    }).returning().execute();

    // Wait a moment to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const secondNote = await db.insert(notesTable).values({
      title: 'Second Favorite',
      content: 'Second content',
      folder_id: null,
      is_favorite: true
    }).returning().execute();

    const result = await getFavoriteNotes();

    expect(result).toHaveLength(2);
    
    // Should be ordered by updated_at DESC (most recent first)
    expect(result[0].title).toEqual('Second Favorite');
    expect(result[1].title).toEqual('First Favorite');
    
    // Verify all notes are favorites
    expect(result[0].is_favorite).toEqual(true);
    expect(result[1].is_favorite).toEqual(true);
  });

  it('should exclude non-favorite notes', async () => {
    // Create a mix of favorite and non-favorite notes
    await db.insert(notesTable).values([
      {
        title: 'Favorite Note',
        content: 'Favorite content',
        folder_id: null,
        is_favorite: true
      },
      {
        title: 'Regular Note',
        content: 'Regular content',
        folder_id: null,
        is_favorite: false
      },
      {
        title: 'Another Favorite',
        content: 'Another favorite content',
        folder_id: null,
        is_favorite: true
      }
    ]).execute();

    const result = await getFavoriteNotes();

    expect(result).toHaveLength(2);
    const titles = result.map(note => note.title);
    expect(titles).toContain('Favorite Note');
    expect(titles).toContain('Another Favorite');
    expect(titles).not.toContain('Regular Note');
  });

  it('should handle favorite notes in folders', async () => {
    // Create a folder first
    const folderResult = await db.insert(foldersTable).values({
      name: 'Test Folder',
      parent_id: null
    }).returning().execute();

    // Create a favorite note in the folder
    await db.insert(notesTable).values({
      title: 'Folder Favorite',
      content: 'Content in folder',
      folder_id: folderResult[0].id,
      is_favorite: true
    }).execute();

    const result = await getFavoriteNotes();

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Folder Favorite');
    expect(result[0].folder_id).toEqual(folderResult[0].id);
    expect(result[0].is_favorite).toEqual(true);
  });

  it('should handle multiple favorite notes with different tag combinations', async () => {
    // Create tags
    const tagResults = await db.insert(tagsTable).values([
      { name: 'Tag1', color: '#ff0000' },
      { name: 'Tag2', color: '#00ff00' },
      { name: 'Tag3', color: '#0000ff' }
    ]).returning().execute();

    // Create favorite notes
    const noteResults = await db.insert(notesTable).values([
      {
        title: 'Note with Tag1',
        content: 'Content 1',
        folder_id: null,
        is_favorite: true
      },
      {
        title: 'Note with Tag1 and Tag2',
        content: 'Content 2',
        folder_id: null,
        is_favorite: true
      },
      {
        title: 'Note without tags',
        content: 'Content 3',
        folder_id: null,
        is_favorite: true
      }
    ]).returning().execute();

    // Associate tags
    await db.insert(noteTagsTable).values([
      { note_id: noteResults[0].id, tag_id: tagResults[0].id }, // First note gets Tag1
      { note_id: noteResults[1].id, tag_id: tagResults[0].id }, // Second note gets Tag1 and Tag2
      { note_id: noteResults[1].id, tag_id: tagResults[1].id }
      // Third note gets no tags
    ]).execute();

    const result = await getFavoriteNotes();

    expect(result).toHaveLength(3);
    
    // Find each note and verify its tags
    const noteWithTag1 = result.find(note => note.title === 'Note with Tag1');
    expect(noteWithTag1).toBeDefined();
    expect(noteWithTag1!.tags).toHaveLength(1);
    expect(noteWithTag1!.tags[0].name).toEqual('Tag1');

    const noteWithTwoTags = result.find(note => note.title === 'Note with Tag1 and Tag2');
    expect(noteWithTwoTags).toBeDefined();
    expect(noteWithTwoTags!.tags).toHaveLength(2);
    const twoTagNames = noteWithTwoTags!.tags.map(tag => tag.name);
    expect(twoTagNames).toContain('Tag1');
    expect(twoTagNames).toContain('Tag2');

    const noteWithoutTags = result.find(note => note.title === 'Note without tags');
    expect(noteWithoutTags).toBeDefined();
    expect(noteWithoutTags!.tags).toHaveLength(0);
  });
});