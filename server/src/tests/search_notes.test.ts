import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { notesTable, foldersTable, tagsTable, noteTagsTable } from '../db/schema';
import { type SearchNotesInput } from '../schema';
import { searchNotes } from '../handlers/search_notes';
import { eq } from 'drizzle-orm';

describe('searchNotes', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  const createTestData = async () => {
    // Create folders
    const folder1 = await db.insert(foldersTable)
      .values({
        name: 'Work Folder',
        parent_id: null
      })
      .returning()
      .execute();

    const folder2 = await db.insert(foldersTable)
      .values({
        name: 'Personal Folder',
        parent_id: null
      })
      .returning()
      .execute();

    // Create tags
    const tag1 = await db.insert(tagsTable)
      .values({
        name: 'Important',
        color: '#ff0000'
      })
      .returning()
      .execute();

    const tag2 = await db.insert(tagsTable)
      .values({
        name: 'Project',
        color: '#00ff00'
      })
      .returning()
      .execute();

    const tag3 = await db.insert(tagsTable)
      .values({
        name: 'Meeting',
        color: '#0000ff'
      })
      .returning()
      .execute();

    // Create notes
    const note1 = await db.insert(notesTable)
      .values({
        title: 'JavaScript Best Practices',
        content: 'This note contains JavaScript coding standards and best practices',
        folder_id: folder1[0].id,
        is_favorite: true
      })
      .returning()
      .execute();

    const note2 = await db.insert(notesTable)
      .values({
        title: 'Meeting Notes',
        content: 'Discussed project timeline and JavaScript implementation details',
        folder_id: folder1[0].id,
        is_favorite: false
      })
      .returning()
      .execute();

    const note3 = await db.insert(notesTable)
      .values({
        title: 'Python Tutorial',
        content: 'Learning Python programming language basics and syntax',
        folder_id: folder2[0].id,
        is_favorite: true
      })
      .returning()
      .execute();

    const note4 = await db.insert(notesTable)
      .values({
        title: 'Shopping List',
        content: 'Buy groceries and household items',
        folder_id: null, // Note without folder
        is_favorite: false
      })
      .returning()
      .execute();

    // Create note-tag relationships
    await db.insert(noteTagsTable)
      .values([
        { note_id: note1[0].id, tag_id: tag1[0].id }, // JS note - Important
        { note_id: note1[0].id, tag_id: tag2[0].id }, // JS note - Project
        { note_id: note2[0].id, tag_id: tag3[0].id }, // Meeting note - Meeting
        { note_id: note2[0].id, tag_id: tag2[0].id }, // Meeting note - Project
        { note_id: note3[0].id, tag_id: tag1[0].id }  // Python note - Important
      ])
      .execute();

    return {
      folders: [folder1[0], folder2[0]],
      tags: [tag1[0], tag2[0], tag3[0]],
      notes: [note1[0], note2[0], note3[0], note4[0]]
    };
  };

  it('should search notes by title', async () => {
    await createTestData();

    const searchInput: SearchNotesInput = {
      query: 'JavaScript',
      favorites_only: false
    };

    const results = await searchNotes(searchInput);

    expect(results).toHaveLength(2); // JS Best Practices and Meeting Notes
    expect(results[0].title).toBe('JavaScript Best Practices'); // Should be first due to title match
    expect(results[1].title).toBe('Meeting Notes');
    
    // Verify all results contain the search term
    results.forEach(note => {
      const hasQueryInTitle = note.title.toLowerCase().includes('javascript');
      const hasQueryInContent = note.content.toLowerCase().includes('javascript');
      expect(hasQueryInTitle || hasQueryInContent).toBe(true);
    });
  });

  it('should search notes by content', async () => {
    await createTestData();

    const searchInput: SearchNotesInput = {
      query: 'programming',
      favorites_only: false
    };

    const results = await searchNotes(searchInput);

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Python Tutorial');
    expect(results[0].content).toContain('programming');
  });

  it('should search notes case-insensitively', async () => {
    await createTestData();

    const searchInput: SearchNotesInput = {
      query: 'JAVASCRIPT',
      favorites_only: false
    };

    const results = await searchNotes(searchInput);

    expect(results).toHaveLength(2);
    expect(results[0].title).toBe('JavaScript Best Practices');
  });

  it('should filter by folder', async () => {
    const testData = await createTestData();

    const searchInput: SearchNotesInput = {
      query: 'Meeting',
      folder_id: testData.folders[0].id, // Work folder
      favorites_only: false
    };

    const results = await searchNotes(searchInput);

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Meeting Notes');
    expect(results[0].folder_id).toBe(testData.folders[0].id);
  });

  it('should filter by null folder (notes without folder)', async () => {
    await createTestData();

    const searchInput: SearchNotesInput = {
      query: 'list',
      folder_id: null,
      favorites_only: false
    };

    const results = await searchNotes(searchInput);

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Shopping List');
    expect(results[0].folder_id).toBeNull();
  });

  it('should filter by favorites only', async () => {
    await createTestData();

    const searchInput: SearchNotesInput = {
      query: 'practices',
      favorites_only: true
    };

    const results = await searchNotes(searchInput);

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('JavaScript Best Practices');
    expect(results[0].is_favorite).toBe(true);
  });

  it('should filter by single tag', async () => {
    const testData = await createTestData();

    const searchInput: SearchNotesInput = {
      query: 'JavaScript',
      tag_ids: [testData.tags[0].id], // Important tag
      favorites_only: false
    };

    const results = await searchNotes(searchInput);

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('JavaScript Best Practices');
    
    // Verify the note has the Important tag
    const importantTag = results[0].tags.find(tag => tag.id === testData.tags[0].id);
    expect(importantTag).toBeDefined();
    expect(importantTag?.name).toBe('Important');
  });

  it('should filter by multiple tags (AND logic)', async () => {
    const testData = await createTestData();

    const searchInput: SearchNotesInput = {
      query: 'JavaScript',
      tag_ids: [testData.tags[0].id, testData.tags[1].id], // Important AND Project tags
      favorites_only: false
    };

    const results = await searchNotes(searchInput);

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('JavaScript Best Practices');
    
    // Verify the note has both tags
    const tagIds = results[0].tags.map(tag => tag.id);
    expect(tagIds).toContain(testData.tags[0].id); // Important
    expect(tagIds).toContain(testData.tags[1].id); // Project
  });

  it('should combine all filters', async () => {
    const testData = await createTestData();

    const searchInput: SearchNotesInput = {
      query: 'JavaScript',
      folder_id: testData.folders[0].id,
      tag_ids: [testData.tags[0].id], // Important tag
      favorites_only: true
    };

    const results = await searchNotes(searchInput);

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('JavaScript Best Practices');
    expect(results[0].folder_id).toBe(testData.folders[0].id);
    expect(results[0].is_favorite).toBe(true);
    
    const tagIds = results[0].tags.map(tag => tag.id);
    expect(tagIds).toContain(testData.tags[0].id);
  });

  it('should return empty array when no matches found', async () => {
    await createTestData();

    const searchInput: SearchNotesInput = {
      query: 'nonexistent',
      favorites_only: false
    };

    const results = await searchNotes(searchInput);

    expect(results).toHaveLength(0);
  });

  it('should return notes with tags populated', async () => {
    const testData = await createTestData();

    const searchInput: SearchNotesInput = {
      query: 'JavaScript',
      favorites_only: false
    };

    const results = await searchNotes(searchInput);

    expect(results).toHaveLength(2);
    
    // Check first result (JS Best Practices) has tags
    const noteWithTags = results[0];
    expect(noteWithTags.tags).toBeInstanceOf(Array);
    expect(noteWithTags.tags.length).toBeGreaterThan(0);
    
    // Verify tag structure
    noteWithTags.tags.forEach(tag => {
      expect(tag.id).toBeDefined();
      expect(tag.name).toBeDefined();
      expect(tag.created_at).toBeInstanceOf(Date);
    });
  });

  it('should return notes without tags when no tags assigned', async () => {
    await createTestData();

    const searchInput: SearchNotesInput = {
      query: 'Shopping',
      favorites_only: false
    };

    const results = await searchNotes(searchInput);

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Shopping List');
    expect(results[0].tags).toEqual([]);
  });

  it('should rank title matches higher than content matches', async () => {
    await createTestData();

    const searchInput: SearchNotesInput = {
      query: 'JavaScript',
      favorites_only: false
    };

    const results = await searchNotes(searchInput);

    expect(results).toHaveLength(2);
    // "JavaScript Best Practices" should come first (title match)
    expect(results[0].title).toBe('JavaScript Best Practices');
    // "Meeting Notes" should come second (content match only)
    expect(results[1].title).toBe('Meeting Notes');
  });

  it('should handle partial word matches', async () => {
    await createTestData();

    const searchInput: SearchNotesInput = {
      query: 'Script',
      favorites_only: false
    };

    const results = await searchNotes(searchInput);

    expect(results).toHaveLength(2);
    results.forEach(note => {
      const hasQueryInTitle = note.title.toLowerCase().includes('script');
      const hasQueryInContent = note.content.toLowerCase().includes('script');
      expect(hasQueryInTitle || hasQueryInContent).toBe(true);
    });
  });
});