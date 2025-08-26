import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { notesTable, foldersTable } from '../db/schema';
import { type CreateNoteInput } from '../schema';
import { createNote } from '../handlers/create_note';
import { eq } from 'drizzle-orm';

// Test inputs
const testNoteInput: CreateNoteInput = {
  title: 'Test Note',
  content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Test content"}]}]}',
  folder_id: null,
  is_favorite: false
};

const testNoteWithFavorite: CreateNoteInput = {
  title: 'Favorite Note',
  content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Favorite content"}]}]}',
  folder_id: null,
  is_favorite: true
};

describe('createNote', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a note with all required fields', async () => {
    const result = await createNote(testNoteInput);

    // Basic field validation
    expect(result.title).toEqual('Test Note');
    expect(result.content).toEqual(testNoteInput.content);
    expect(result.folder_id).toBeNull();
    expect(result.is_favorite).toBe(false);
    expect(result.tags).toEqual([]);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a favorite note', async () => {
    const result = await createNote(testNoteWithFavorite);

    expect(result.title).toEqual('Favorite Note');
    expect(result.is_favorite).toBe(true);
    expect(result.tags).toEqual([]);
  });

  it('should save note to database', async () => {
    const result = await createNote(testNoteInput);

    // Query database directly to verify persistence
    const notes = await db.select()
      .from(notesTable)
      .where(eq(notesTable.id, result.id))
      .execute();

    expect(notes).toHaveLength(1);
    expect(notes[0].title).toEqual('Test Note');
    expect(notes[0].content).toEqual(testNoteInput.content);
    expect(notes[0].folder_id).toBeNull();
    expect(notes[0].is_favorite).toBe(false);
    expect(notes[0].created_at).toBeInstanceOf(Date);
    expect(notes[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create a note in a specific folder', async () => {
    // Create a test folder first
    const folderResult = await db.insert(foldersTable)
      .values({
        name: 'Test Folder',
        parent_id: null
      })
      .returning()
      .execute();

    const folderId = folderResult[0].id;

    const noteInput: CreateNoteInput = {
      ...testNoteInput,
      folder_id: folderId
    };

    const result = await createNote(noteInput);

    expect(result.folder_id).toEqual(folderId);
    expect(result.title).toEqual('Test Note');
    expect(result.tags).toEqual([]);

    // Verify in database
    const notes = await db.select()
      .from(notesTable)
      .where(eq(notesTable.id, result.id))
      .execute();

    expect(notes[0].folder_id).toEqual(folderId);
  });

  it('should throw error when folder_id does not exist', async () => {
    const noteInput: CreateNoteInput = {
      ...testNoteInput,
      folder_id: 999 // Non-existent folder ID
    };

    await expect(createNote(noteInput)).rejects.toThrow(/folder with id 999 does not exist/i);
  });

  it('should handle rich text content correctly', async () => {
    const richTextContent = '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Rich Text"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Bold text"},{"type":"text","text":" and "},{"type":"text","marks":[{"type":"italic"}],"text":"italic text"}]}]}';

    const noteInput: CreateNoteInput = {
      title: 'Rich Text Note',
      content: richTextContent,
      folder_id: null,
      is_favorite: false
    };

    const result = await createNote(noteInput);

    expect(result.content).toEqual(richTextContent);
    expect(result.title).toEqual('Rich Text Note');

    // Verify persistence
    const notes = await db.select()
      .from(notesTable)
      .where(eq(notesTable.id, result.id))
      .execute();

    expect(notes[0].content).toEqual(richTextContent);
  });

  it('should create notes with different timestamps', async () => {
    const result1 = await createNote(testNoteInput);
    
    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const result2 = await createNote({
      ...testNoteInput,
      title: 'Second Note'
    });

    expect(result1.created_at).toBeInstanceOf(Date);
    expect(result2.created_at).toBeInstanceOf(Date);
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.title).toEqual('Test Note');
    expect(result2.title).toEqual('Second Note');
  });
});