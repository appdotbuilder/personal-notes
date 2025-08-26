import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { notesTable, tagsTable, noteTagsTable, foldersTable } from '../db/schema';
import { getNotesByTag } from '../handlers/get_notes_by_tag';

describe('getNotesByTag', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return notes associated with a specific tag', async () => {
    // Create test tags
    const tags = await db.insert(tagsTable)
      .values([
        { name: 'Work', color: '#ff0000' },
        { name: 'Personal', color: '#00ff00' }
      ])
      .returning()
      .execute();

    const workTag = tags[0];
    const personalTag = tags[1];

    // Create test notes with delays to ensure proper updated_at ordering
    const note1 = await db.insert(notesTable)
      .values({
        title: 'Work Meeting Notes',
        content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Meeting agenda"}]}]}',
        folder_id: null,
        is_favorite: false
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const note2 = await db.insert(notesTable)
      .values({
        title: 'Personal Todo',
        content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Buy groceries"}]}]}',
        folder_id: null,
        is_favorite: true
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const note3 = await db.insert(notesTable)
      .values({
        title: 'Mixed Note',
        content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Work and personal stuff"}]}]}',
        folder_id: null,
        is_favorite: false
      })
      .returning()
      .execute();

    const notes = [note1[0], note2[0], note3[0]];

    // Associate notes with tags
    await db.insert(noteTagsTable)
      .values([
        { note_id: notes[0].id, tag_id: workTag.id },
        { note_id: notes[1].id, tag_id: personalTag.id },
        { note_id: notes[2].id, tag_id: workTag.id },
        { note_id: notes[2].id, tag_id: personalTag.id } // Mixed note has both tags
      ])
      .execute();

    // Test getting notes by Work tag
    const workNotes = await getNotesByTag(workTag.id);

    expect(workNotes).toHaveLength(2);
    expect(workNotes[0].title).toEqual('Mixed Note'); // Should be first due to order by updated_at DESC
    expect(workNotes[1].title).toEqual('Work Meeting Notes');

    // Verify tags are included
    expect(workNotes[0].tags).toHaveLength(2); // Mixed note has both tags
    expect(workNotes[0].tags.some(tag => tag.name === 'Work')).toBe(true);
    expect(workNotes[0].tags.some(tag => tag.name === 'Personal')).toBe(true);

    expect(workNotes[1].tags).toHaveLength(1); // Work note has only work tag
    expect(workNotes[1].tags[0].name).toEqual('Work');
    expect(workNotes[1].tags[0].color).toEqual('#ff0000');
  });

  it('should return notes with complete tag information', async () => {
    // Create test tag
    const tag = await db.insert(tagsTable)
      .values({ name: 'Important', color: '#ff9900' })
      .returning()
      .execute();

    // Create test note
    const note = await db.insert(notesTable)
      .values({
        title: 'Important Note',
        content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Very important info"}]}]}',
        folder_id: null,
        is_favorite: true
      })
      .returning()
      .execute();

    // Associate note with tag
    await db.insert(noteTagsTable)
      .values({ note_id: note[0].id, tag_id: tag[0].id })
      .execute();

    const result = await getNotesByTag(tag[0].id);

    expect(result).toHaveLength(1);
    
    const returnedNote = result[0];
    expect(returnedNote.id).toEqual(note[0].id);
    expect(returnedNote.title).toEqual('Important Note');
    expect(returnedNote.content).toEqual('{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Very important info"}]}]}');
    expect(returnedNote.folder_id).toBeNull();
    expect(returnedNote.is_favorite).toBe(true);
    expect(returnedNote.created_at).toBeInstanceOf(Date);
    expect(returnedNote.updated_at).toBeInstanceOf(Date);

    expect(returnedNote.tags).toHaveLength(1);
    expect(returnedNote.tags[0].id).toEqual(tag[0].id);
    expect(returnedNote.tags[0].name).toEqual('Important');
    expect(returnedNote.tags[0].color).toEqual('#ff9900');
    expect(returnedNote.tags[0].created_at).toBeInstanceOf(Date);
  });

  it('should return notes ordered by updated_at DESC', async () => {
    // Create test tag
    const tag = await db.insert(tagsTable)
      .values({ name: 'Test', color: null })
      .returning()
      .execute();

    // Create notes with different timestamps
    const oldNote = await db.insert(notesTable)
      .values({
        title: 'Old Note',
        content: '{"type":"doc","content":[]}',
        folder_id: null,
        is_favorite: false
      })
      .returning()
      .execute();

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const newNote = await db.insert(notesTable)
      .values({
        title: 'New Note',
        content: '{"type":"doc","content":[]}',
        folder_id: null,
        is_favorite: false
      })
      .returning()
      .execute();

    // Associate both notes with the tag
    await db.insert(noteTagsTable)
      .values([
        { note_id: oldNote[0].id, tag_id: tag[0].id },
        { note_id: newNote[0].id, tag_id: tag[0].id }
      ])
      .execute();

    const result = await getNotesByTag(tag[0].id);

    expect(result).toHaveLength(2);
    expect(result[0].title).toEqual('New Note'); // Newer note should be first
    expect(result[1].title).toEqual('Old Note');
    expect(result[0].updated_at >= result[1].updated_at).toBe(true);
  });

  it('should return empty array when tag has no associated notes', async () => {
    // Create tag but no notes
    const tag = await db.insert(tagsTable)
      .values({ name: 'Empty Tag', color: '#000000' })
      .returning()
      .execute();

    const result = await getNotesByTag(tag[0].id);

    expect(result).toHaveLength(0);
  });

  it('should handle notes with multiple tags correctly', async () => {
    // Create multiple tags
    const tags = await db.insert(tagsTable)
      .values([
        { name: 'Priority', color: '#ff0000' },
        { name: 'Draft', color: '#ffff00' },
        { name: 'Review', color: '#0000ff' }
      ])
      .returning()
      .execute();

    // Create a note
    const note = await db.insert(notesTable)
      .values({
        title: 'Multi-tag Note',
        content: '{"type":"doc","content":[]}',
        folder_id: null,
        is_favorite: false
      })
      .returning()
      .execute();

    // Associate note with all tags
    await db.insert(noteTagsTable)
      .values([
        { note_id: note[0].id, tag_id: tags[0].id },
        { note_id: note[0].id, tag_id: tags[1].id },
        { note_id: note[0].id, tag_id: tags[2].id }
      ])
      .execute();

    // Get notes by first tag
    const result = await getNotesByTag(tags[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].tags).toHaveLength(3);
    
    const tagNames = result[0].tags.map(tag => tag.name);
    expect(tagNames).toContain('Priority');
    expect(tagNames).toContain('Draft');
    expect(tagNames).toContain('Review');
  });

  it('should handle notes in folders correctly', async () => {
    // Create folder
    const folder = await db.insert(foldersTable)
      .values({ name: 'Test Folder', parent_id: null })
      .returning()
      .execute();

    // Create tag
    const tag = await db.insert(tagsTable)
      .values({ name: 'Folder Test', color: '#00ff00' })
      .returning()
      .execute();

    // Create note in folder
    const note = await db.insert(notesTable)
      .values({
        title: 'Note in Folder',
        content: '{"type":"doc","content":[]}',
        folder_id: folder[0].id,
        is_favorite: false
      })
      .returning()
      .execute();

    // Associate note with tag
    await db.insert(noteTagsTable)
      .values({ note_id: note[0].id, tag_id: tag[0].id })
      .execute();

    const result = await getNotesByTag(tag[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].folder_id).toEqual(folder[0].id);
    expect(result[0].tags).toHaveLength(1);
    expect(result[0].tags[0].name).toEqual('Folder Test');
  });

  it('should return empty array for non-existent tag', async () => {
    const result = await getNotesByTag(99999);
    expect(result).toHaveLength(0);
  });
});