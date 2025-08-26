import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tagsTable, notesTable, noteTagsTable } from '../db/schema';
import { type DeleteTagInput } from '../schema';
import { deleteTag } from '../handlers/delete_tag';
import { eq } from 'drizzle-orm';

// Test inputs
const testTagInput = {
  name: 'Test Tag',
  color: '#FF5733'
};

const testNoteInput = {
  title: 'Test Note',
  content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Test content"}]}]}',
  folder_id: null,
  is_favorite: false
};

describe('deleteTag', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing tag', async () => {
    // Create a test tag
    const [createdTag] = await db.insert(tagsTable)
      .values(testTagInput)
      .returning()
      .execute();

    const deleteInput: DeleteTagInput = { id: createdTag.id };
    const result = await deleteTag(deleteInput);

    expect(result.success).toBe(true);

    // Verify tag is deleted from database
    const tags = await db.select()
      .from(tagsTable)
      .where(eq(tagsTable.id, createdTag.id))
      .execute();

    expect(tags).toHaveLength(0);
  });

  it('should return false when deleting non-existent tag', async () => {
    const deleteInput: DeleteTagInput = { id: 999999 };
    const result = await deleteTag(deleteInput);

    expect(result.success).toBe(false);
  });

  it('should delete tag associations with notes', async () => {
    // Create a test tag
    const [createdTag] = await db.insert(tagsTable)
      .values(testTagInput)
      .returning()
      .execute();

    // Create a test note
    const [createdNote] = await db.insert(notesTable)
      .values(testNoteInput)
      .returning()
      .execute();

    // Create note-tag association
    await db.insert(noteTagsTable)
      .values({
        note_id: createdNote.id,
        tag_id: createdTag.id
      })
      .execute();

    // Verify association exists
    const associationsBefore = await db.select()
      .from(noteTagsTable)
      .where(eq(noteTagsTable.tag_id, createdTag.id))
      .execute();

    expect(associationsBefore).toHaveLength(1);

    // Delete the tag
    const deleteInput: DeleteTagInput = { id: createdTag.id };
    const result = await deleteTag(deleteInput);

    expect(result.success).toBe(true);

    // Verify associations are deleted
    const associationsAfter = await db.select()
      .from(noteTagsTable)
      .where(eq(noteTagsTable.tag_id, createdTag.id))
      .execute();

    expect(associationsAfter).toHaveLength(0);

    // Verify note still exists (tag deletion should not affect notes)
    const notes = await db.select()
      .from(notesTable)
      .where(eq(notesTable.id, createdNote.id))
      .execute();

    expect(notes).toHaveLength(1);
  });

  it('should handle multiple note associations correctly', async () => {
    // Create a test tag
    const [createdTag] = await db.insert(tagsTable)
      .values(testTagInput)
      .returning()
      .execute();

    // Create multiple test notes
    const [note1] = await db.insert(notesTable)
      .values({
        ...testNoteInput,
        title: 'Note 1'
      })
      .returning()
      .execute();

    const [note2] = await db.insert(notesTable)
      .values({
        ...testNoteInput,
        title: 'Note 2'
      })
      .returning()
      .execute();

    // Create multiple note-tag associations
    await db.insert(noteTagsTable)
      .values([
        { note_id: note1.id, tag_id: createdTag.id },
        { note_id: note2.id, tag_id: createdTag.id }
      ])
      .execute();

    // Verify associations exist
    const associationsBefore = await db.select()
      .from(noteTagsTable)
      .where(eq(noteTagsTable.tag_id, createdTag.id))
      .execute();

    expect(associationsBefore).toHaveLength(2);

    // Delete the tag
    const deleteInput: DeleteTagInput = { id: createdTag.id };
    const result = await deleteTag(deleteInput);

    expect(result.success).toBe(true);

    // Verify all associations are deleted
    const associationsAfter = await db.select()
      .from(noteTagsTable)
      .where(eq(noteTagsTable.tag_id, createdTag.id))
      .execute();

    expect(associationsAfter).toHaveLength(0);

    // Verify both notes still exist
    const notesAfter = await db.select()
      .from(notesTable)
      .execute();

    expect(notesAfter).toHaveLength(2);
  });

  it('should delete tag with null color correctly', async () => {
    // Create a test tag with null color
    const [createdTag] = await db.insert(tagsTable)
      .values({
        name: 'Tag with null color',
        color: null
      })
      .returning()
      .execute();

    const deleteInput: DeleteTagInput = { id: createdTag.id };
    const result = await deleteTag(deleteInput);

    expect(result.success).toBe(true);

    // Verify tag is deleted
    const tags = await db.select()
      .from(tagsTable)
      .where(eq(tagsTable.id, createdTag.id))
      .execute();

    expect(tags).toHaveLength(0);
  });
});