import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { foldersTable, notesTable, tagsTable, noteTagsTable } from '../db/schema';
import { type AddTagToNoteInput } from '../schema';
import { addTagToNote } from '../handlers/add_tag_to_note';
import { eq, and } from 'drizzle-orm';

describe('addTagToNote', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testFolder: any;
  let testNote: any;
  let testTag: any;

  beforeEach(async () => {
    // Create test folder
    const folderResult = await db.insert(foldersTable)
      .values({
        name: 'Test Folder',
        parent_id: null
      })
      .returning()
      .execute();
    testFolder = folderResult[0];

    // Create test note
    const noteResult = await db.insert(notesTable)
      .values({
        title: 'Test Note',
        content: '{"type":"doc","content":[]}',
        folder_id: testFolder.id,
        is_favorite: false
      })
      .returning()
      .execute();
    testNote = noteResult[0];

    // Create test tag
    const tagResult = await db.insert(tagsTable)
      .values({
        name: 'Test Tag',
        color: '#ff0000'
      })
      .returning()
      .execute();
    testTag = tagResult[0];
  });

  it('should successfully add a tag to a note', async () => {
    const input: AddTagToNoteInput = {
      note_id: testNote.id,
      tag_id: testTag.id
    };

    const result = await addTagToNote(input);

    expect(result.success).toBe(true);

    // Verify the association was created in the database
    const associations = await db.select()
      .from(noteTagsTable)
      .where(
        and(
          eq(noteTagsTable.note_id, testNote.id),
          eq(noteTagsTable.tag_id, testTag.id)
        )
      )
      .execute();

    expect(associations).toHaveLength(1);
    expect(associations[0].note_id).toBe(testNote.id);
    expect(associations[0].tag_id).toBe(testTag.id);
    expect(associations[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when note does not exist', async () => {
    const input: AddTagToNoteInput = {
      note_id: 99999, // Non-existent note ID
      tag_id: testTag.id
    };

    await expect(addTagToNote(input)).rejects.toThrow(/Note with id 99999 not found/i);

    // Verify no association was created
    const associations = await db.select()
      .from(noteTagsTable)
      .where(eq(noteTagsTable.tag_id, testTag.id))
      .execute();

    expect(associations).toHaveLength(0);
  });

  it('should throw error when tag does not exist', async () => {
    const input: AddTagToNoteInput = {
      note_id: testNote.id,
      tag_id: 99999 // Non-existent tag ID
    };

    await expect(addTagToNote(input)).rejects.toThrow(/Tag with id 99999 not found/i);

    // Verify no association was created
    const associations = await db.select()
      .from(noteTagsTable)
      .where(eq(noteTagsTable.note_id, testNote.id))
      .execute();

    expect(associations).toHaveLength(0);
  });

  it('should throw error when association already exists', async () => {
    const input: AddTagToNoteInput = {
      note_id: testNote.id,
      tag_id: testTag.id
    };

    // First addition should succeed
    await addTagToNote(input);

    // Second addition should fail
    await expect(addTagToNote(input)).rejects.toThrow(/Tag is already associated with this note/i);

    // Verify only one association exists
    const associations = await db.select()
      .from(noteTagsTable)
      .where(
        and(
          eq(noteTagsTable.note_id, testNote.id),
          eq(noteTagsTable.tag_id, testTag.id)
        )
      )
      .execute();

    expect(associations).toHaveLength(1);
  });

  it('should allow same tag to be associated with different notes', async () => {
    // Create a second note
    const secondNoteResult = await db.insert(notesTable)
      .values({
        title: 'Second Note',
        content: '{"type":"doc","content":[]}',
        folder_id: testFolder.id,
        is_favorite: false
      })
      .returning()
      .execute();
    const secondNote = secondNoteResult[0];

    const firstInput: AddTagToNoteInput = {
      note_id: testNote.id,
      tag_id: testTag.id
    };

    const secondInput: AddTagToNoteInput = {
      note_id: secondNote.id,
      tag_id: testTag.id
    };

    // Both associations should succeed
    await addTagToNote(firstInput);
    await addTagToNote(secondInput);

    // Verify both associations exist
    const associations = await db.select()
      .from(noteTagsTable)
      .where(eq(noteTagsTable.tag_id, testTag.id))
      .execute();

    expect(associations).toHaveLength(2);
    expect(associations.map(a => a.note_id).sort()).toEqual([testNote.id, secondNote.id].sort());
  });

  it('should allow same note to be associated with different tags', async () => {
    // Create a second tag
    const secondTagResult = await db.insert(tagsTable)
      .values({
        name: 'Second Tag',
        color: '#00ff00'
      })
      .returning()
      .execute();
    const secondTag = secondTagResult[0];

    const firstInput: AddTagToNoteInput = {
      note_id: testNote.id,
      tag_id: testTag.id
    };

    const secondInput: AddTagToNoteInput = {
      note_id: testNote.id,
      tag_id: secondTag.id
    };

    // Both associations should succeed
    await addTagToNote(firstInput);
    await addTagToNote(secondInput);

    // Verify both associations exist
    const associations = await db.select()
      .from(noteTagsTable)
      .where(eq(noteTagsTable.note_id, testNote.id))
      .execute();

    expect(associations).toHaveLength(2);
    expect(associations.map(a => a.tag_id).sort()).toEqual([testTag.id, secondTag.id].sort());
  });
});