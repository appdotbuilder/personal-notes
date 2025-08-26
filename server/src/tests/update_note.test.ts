import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { notesTable, foldersTable, tagsTable, noteTagsTable } from '../db/schema';
import { type UpdateNoteInput } from '../schema';
import { updateNote } from '../handlers/update_note';
import { eq } from 'drizzle-orm';

describe('updateNote', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update note title', async () => {
    // Create test note
    const [note] = await db.insert(notesTable)
      .values({
        title: 'Original Title',
        content: '{}',
        folder_id: null,
        is_favorite: false
      })
      .returning()
      .execute();

    const input: UpdateNoteInput = {
      id: note.id,
      title: 'Updated Title'
    };

    const result = await updateNote(input);

    expect(result.id).toEqual(note.id);
    expect(result.title).toEqual('Updated Title');
    expect(result.content).toEqual('{}');
    expect(result.folder_id).toBeNull();
    expect(result.is_favorite).toEqual(false);
    expect(result.tags).toEqual([]);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > note.updated_at).toBe(true);
  });

  it('should update note content', async () => {
    // Create test note
    const [note] = await db.insert(notesTable)
      .values({
        title: 'Test Note',
        content: '{}',
        folder_id: null,
        is_favorite: false
      })
      .returning()
      .execute();

    const newContent = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Updated content"}]}]}';

    const input: UpdateNoteInput = {
      id: note.id,
      content: newContent
    };

    const result = await updateNote(input);

    expect(result.content).toEqual(newContent);
    expect(result.title).toEqual('Test Note'); // Should remain unchanged
    expect(result.updated_at > note.updated_at).toBe(true);
  });

  it('should update folder assignment', async () => {
    // Create test folder
    const [folder] = await db.insert(foldersTable)
      .values({
        name: 'Test Folder',
        parent_id: null
      })
      .returning()
      .execute();

    // Create test note
    const [note] = await db.insert(notesTable)
      .values({
        title: 'Test Note',
        content: '{}',
        folder_id: null,
        is_favorite: false
      })
      .returning()
      .execute();

    const input: UpdateNoteInput = {
      id: note.id,
      folder_id: folder.id
    };

    const result = await updateNote(input);

    expect(result.folder_id).toEqual(folder.id);
    expect(result.updated_at > note.updated_at).toBe(true);
  });

  it('should update favorite status', async () => {
    // Create test note
    const [note] = await db.insert(notesTable)
      .values({
        title: 'Test Note',
        content: '{}',
        folder_id: null,
        is_favorite: false
      })
      .returning()
      .execute();

    const input: UpdateNoteInput = {
      id: note.id,
      is_favorite: true
    };

    const result = await updateNote(input);

    expect(result.is_favorite).toEqual(true);
    expect(result.updated_at > note.updated_at).toBe(true);
  });

  it('should update multiple fields at once', async () => {
    // Create test folder
    const [folder] = await db.insert(foldersTable)
      .values({
        name: 'Test Folder',
        parent_id: null
      })
      .returning()
      .execute();

    // Create test note
    const [note] = await db.insert(notesTable)
      .values({
        title: 'Original Title',
        content: '{}',
        folder_id: null,
        is_favorite: false
      })
      .returning()
      .execute();

    const input: UpdateNoteInput = {
      id: note.id,
      title: 'Updated Title',
      content: '{"updated": true}',
      folder_id: folder.id,
      is_favorite: true
    };

    const result = await updateNote(input);

    expect(result.title).toEqual('Updated Title');
    expect(result.content).toEqual('{"updated": true}');
    expect(result.folder_id).toEqual(folder.id);
    expect(result.is_favorite).toEqual(true);
    expect(result.updated_at > note.updated_at).toBe(true);
  });

  it('should return note with associated tags', async () => {
    // Create test note
    const [note] = await db.insert(notesTable)
      .values({
        title: 'Test Note',
        content: '{}',
        folder_id: null,
        is_favorite: false
      })
      .returning()
      .execute();

    // Create test tags
    const [tag1] = await db.insert(tagsTable)
      .values({
        name: 'urgent',
        color: '#ff0000'
      })
      .returning()
      .execute();

    const [tag2] = await db.insert(tagsTable)
      .values({
        name: 'work',
        color: '#0000ff'
      })
      .returning()
      .execute();

    // Associate tags with note
    await db.insert(noteTagsTable)
      .values([
        { note_id: note.id, tag_id: tag1.id },
        { note_id: note.id, tag_id: tag2.id }
      ])
      .execute();

    const input: UpdateNoteInput = {
      id: note.id,
      title: 'Updated Title'
    };

    const result = await updateNote(input);

    expect(result.tags).toHaveLength(2);
    expect(result.tags.map(tag => tag.name).sort()).toEqual(['urgent', 'work']);
    expect(result.tags.find(tag => tag.name === 'urgent')?.color).toEqual('#ff0000');
    expect(result.tags.find(tag => tag.name === 'work')?.color).toEqual('#0000ff');
  });

  it('should handle null folder assignment', async () => {
    // Create test folder
    const [folder] = await db.insert(foldersTable)
      .values({
        name: 'Test Folder',
        parent_id: null
      })
      .returning()
      .execute();

    // Create test note with folder
    const [note] = await db.insert(notesTable)
      .values({
        title: 'Test Note',
        content: '{}',
        folder_id: folder.id,
        is_favorite: false
      })
      .returning()
      .execute();

    const input: UpdateNoteInput = {
      id: note.id,
      folder_id: null // Remove from folder
    };

    const result = await updateNote(input);

    expect(result.folder_id).toBeNull();
    expect(result.updated_at > note.updated_at).toBe(true);
  });

  it('should persist changes to database', async () => {
    // Create test note
    const [note] = await db.insert(notesTable)
      .values({
        title: 'Original Title',
        content: '{}',
        folder_id: null,
        is_favorite: false
      })
      .returning()
      .execute();

    const input: UpdateNoteInput = {
      id: note.id,
      title: 'Updated Title',
      is_favorite: true
    };

    await updateNote(input);

    // Verify changes in database
    const [updatedNote] = await db.select()
      .from(notesTable)
      .where(eq(notesTable.id, note.id))
      .execute();

    expect(updatedNote.title).toEqual('Updated Title');
    expect(updatedNote.is_favorite).toEqual(true);
    expect(updatedNote.updated_at > note.updated_at).toBe(true);
  });

  it('should throw error for non-existent note', async () => {
    const input: UpdateNoteInput = {
      id: 99999,
      title: 'Updated Title'
    };

    await expect(updateNote(input)).rejects.toThrow(/Note with id 99999 not found/i);
  });

  it('should handle partial updates correctly', async () => {
    // Create test note
    const [note] = await db.insert(notesTable)
      .values({
        title: 'Original Title',
        content: 'original content',
        folder_id: null,
        is_favorite: false
      })
      .returning()
      .execute();

    // Update only title
    const input: UpdateNoteInput = {
      id: note.id,
      title: 'New Title'
    };

    const result = await updateNote(input);

    // Title should be updated, other fields should remain the same
    expect(result.title).toEqual('New Title');
    expect(result.content).toEqual('original content');
    expect(result.folder_id).toBeNull();
    expect(result.is_favorite).toEqual(false);
    expect(result.updated_at > note.updated_at).toBe(true);
  });
});