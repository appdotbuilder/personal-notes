import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { notesTable, foldersTable, tagsTable, noteTagsTable } from '../db/schema';
import { type DeleteNoteInput } from '../schema';
import { deleteNote } from '../handlers/delete_note';
import { eq } from 'drizzle-orm';

describe('deleteNote', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a note successfully', async () => {
    // Create a test note
    const noteResult = await db.insert(notesTable)
      .values({
        title: 'Test Note',
        content: '{"type": "doc", "content": []}',
        folder_id: null,
        is_favorite: false
      })
      .returning()
      .execute();

    const note = noteResult[0];
    const input: DeleteNoteInput = { id: note.id };

    // Delete the note
    const result = await deleteNote(input);

    // Verify deletion was successful
    expect(result.success).toBe(true);

    // Verify note no longer exists in database
    const remainingNotes = await db.select()
      .from(notesTable)
      .where(eq(notesTable.id, note.id))
      .execute();

    expect(remainingNotes).toHaveLength(0);
  });

  it('should delete note with tag associations', async () => {
    // Create folder, tags, and note
    const folderResult = await db.insert(foldersTable)
      .values({
        name: 'Test Folder',
        parent_id: null
      })
      .returning()
      .execute();

    const folder = folderResult[0];

    const tagResults = await db.insert(tagsTable)
      .values([
        { name: 'Important', color: '#ff0000' },
        { name: 'Work', color: '#0000ff' }
      ])
      .returning()
      .execute();

    const [tag1, tag2] = tagResults;

    const noteResult = await db.insert(notesTable)
      .values({
        title: 'Note with Tags',
        content: '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Test content"}]}]}',
        folder_id: folder.id,
        is_favorite: true
      })
      .returning()
      .execute();

    const note = noteResult[0];

    // Create tag associations
    await db.insert(noteTagsTable)
      .values([
        { note_id: note.id, tag_id: tag1.id },
        { note_id: note.id, tag_id: tag2.id }
      ])
      .execute();

    // Verify tag associations exist before deletion
    const tagsBefore = await db.select()
      .from(noteTagsTable)
      .where(eq(noteTagsTable.note_id, note.id))
      .execute();

    expect(tagsBefore).toHaveLength(2);

    const input: DeleteNoteInput = { id: note.id };

    // Delete the note
    const result = await deleteNote(input);

    // Verify deletion was successful
    expect(result.success).toBe(true);

    // Verify note no longer exists
    const remainingNotes = await db.select()
      .from(notesTable)
      .where(eq(notesTable.id, note.id))
      .execute();

    expect(remainingNotes).toHaveLength(0);

    // Verify tag associations were cascade deleted
    const tagsAfter = await db.select()
      .from(noteTagsTable)
      .where(eq(noteTagsTable.note_id, note.id))
      .execute();

    expect(tagsAfter).toHaveLength(0);

    // Verify tags themselves still exist (only associations were deleted)
    const remainingTags = await db.select()
      .from(tagsTable)
      .execute();

    expect(remainingTags).toHaveLength(2);
  });

  it('should return false when deleting non-existent note', async () => {
    const input: DeleteNoteInput = { id: 99999 };

    // Try to delete non-existent note
    const result = await deleteNote(input);

    // Should return false since no note was deleted
    expect(result.success).toBe(false);
  });

  it('should handle deletion of favorite note', async () => {
    // Create a favorite note
    const noteResult = await db.insert(notesTable)
      .values({
        title: 'Favorite Note',
        content: '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "This is my favorite note"}]}]}',
        folder_id: null,
        is_favorite: true
      })
      .returning()
      .execute();

    const note = noteResult[0];
    const input: DeleteNoteInput = { id: note.id };

    // Delete the favorite note
    const result = await deleteNote(input);

    // Verify deletion was successful
    expect(result.success).toBe(true);

    // Verify note no longer exists
    const remainingNotes = await db.select()
      .from(notesTable)
      .where(eq(notesTable.id, note.id))
      .execute();

    expect(remainingNotes).toHaveLength(0);
  });

  it('should not affect other notes when deleting one note', async () => {
    // Create multiple notes
    const noteResults = await db.insert(notesTable)
      .values([
        {
          title: 'Note 1',
          content: '{"type": "doc", "content": []}',
          folder_id: null,
          is_favorite: false
        },
        {
          title: 'Note 2',
          content: '{"type": "doc", "content": []}',
          folder_id: null,
          is_favorite: false
        },
        {
          title: 'Note 3',
          content: '{"type": "doc", "content": []}',
          folder_id: null,
          is_favorite: false
        }
      ])
      .returning()
      .execute();

    const [note1, note2, note3] = noteResults;

    // Delete the middle note
    const input: DeleteNoteInput = { id: note2.id };
    const result = await deleteNote(input);

    // Verify deletion was successful
    expect(result.success).toBe(true);

    // Verify only the target note was deleted
    const remainingNotes = await db.select()
      .from(notesTable)
      .execute();

    expect(remainingNotes).toHaveLength(2);
    
    const remainingIds = remainingNotes.map(n => n.id).sort();
    expect(remainingIds).toEqual([note1.id, note3.id].sort());
  });
});