import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { foldersTable, notesTable, tagsTable, noteTagsTable } from '../db/schema';
import { type RemoveTagFromNoteInput } from '../schema';
import { removeTagFromNote } from '../handlers/remove_tag_from_note';
import { eq, and } from 'drizzle-orm';

// Test input
const testInput: RemoveTagFromNoteInput = {
  note_id: 1,
  tag_id: 1
};

describe('removeTagFromNote', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should remove tag from note successfully', async () => {
    // Create test folder first
    const folders = await db.insert(foldersTable)
      .values({
        name: 'Test Folder',
        parent_id: null
      })
      .returning()
      .execute();

    // Create test note
    const notes = await db.insert(notesTable)
      .values({
        title: 'Test Note',
        content: 'Test content',
        folder_id: folders[0].id,
        is_favorite: false
      })
      .returning()
      .execute();

    // Create test tag
    const tags = await db.insert(tagsTable)
      .values({
        name: 'Test Tag',
        color: '#FF0000'
      })
      .returning()
      .execute();

    // Create the note-tag relationship
    await db.insert(noteTagsTable)
      .values({
        note_id: notes[0].id,
        tag_id: tags[0].id
      })
      .execute();

    // Verify relationship exists
    const beforeRemove = await db.select()
      .from(noteTagsTable)
      .where(
        and(
          eq(noteTagsTable.note_id, notes[0].id),
          eq(noteTagsTable.tag_id, tags[0].id)
        )
      )
      .execute();

    expect(beforeRemove).toHaveLength(1);

    // Remove the tag from note
    const result = await removeTagFromNote({
      note_id: notes[0].id,
      tag_id: tags[0].id
    });

    expect(result.success).toBe(true);

    // Verify relationship is removed
    const afterRemove = await db.select()
      .from(noteTagsTable)
      .where(
        and(
          eq(noteTagsTable.note_id, notes[0].id),
          eq(noteTagsTable.tag_id, tags[0].id)
        )
      )
      .execute();

    expect(afterRemove).toHaveLength(0);
  });

  it('should return success even when relationship does not exist', async () => {
    // Create test folder first
    const folders = await db.insert(foldersTable)
      .values({
        name: 'Test Folder',
        parent_id: null
      })
      .returning()
      .execute();

    // Create test note
    const notes = await db.insert(notesTable)
      .values({
        title: 'Test Note',
        content: 'Test content',
        folder_id: folders[0].id,
        is_favorite: false
      })
      .returning()
      .execute();

    // Create test tag
    const tags = await db.insert(tagsTable)
      .values({
        name: 'Test Tag',
        color: '#FF0000'
      })
      .returning()
      .execute();

    // Try to remove a relationship that doesn't exist
    const result = await removeTagFromNote({
      note_id: notes[0].id,
      tag_id: tags[0].id
    });

    expect(result.success).toBe(true);

    // Verify no relationships exist
    const relationships = await db.select()
      .from(noteTagsTable)
      .where(
        and(
          eq(noteTagsTable.note_id, notes[0].id),
          eq(noteTagsTable.tag_id, tags[0].id)
        )
      )
      .execute();

    expect(relationships).toHaveLength(0);
  });

  it('should handle removing one tag while leaving others intact', async () => {
    // Create test folder first
    const folders = await db.insert(foldersTable)
      .values({
        name: 'Test Folder',
        parent_id: null
      })
      .returning()
      .execute();

    // Create test note
    const notes = await db.insert(notesTable)
      .values({
        title: 'Test Note',
        content: 'Test content',
        folder_id: folders[0].id,
        is_favorite: false
      })
      .returning()
      .execute();

    // Create multiple test tags
    const tags = await db.insert(tagsTable)
      .values([
        {
          name: 'Tag 1',
          color: '#FF0000'
        },
        {
          name: 'Tag 2',
          color: '#00FF00'
        },
        {
          name: 'Tag 3',
          color: '#0000FF'
        }
      ])
      .returning()
      .execute();

    // Create multiple note-tag relationships
    await db.insert(noteTagsTable)
      .values([
        {
          note_id: notes[0].id,
          tag_id: tags[0].id
        },
        {
          note_id: notes[0].id,
          tag_id: tags[1].id
        },
        {
          note_id: notes[0].id,
          tag_id: tags[2].id
        }
      ])
      .execute();

    // Verify all relationships exist
    const beforeRemove = await db.select()
      .from(noteTagsTable)
      .where(eq(noteTagsTable.note_id, notes[0].id))
      .execute();

    expect(beforeRemove).toHaveLength(3);

    // Remove one specific tag
    const result = await removeTagFromNote({
      note_id: notes[0].id,
      tag_id: tags[1].id // Remove the middle tag
    });

    expect(result.success).toBe(true);

    // Verify only the specified relationship was removed
    const afterRemove = await db.select()
      .from(noteTagsTable)
      .where(eq(noteTagsTable.note_id, notes[0].id))
      .execute();

    expect(afterRemove).toHaveLength(2);

    // Verify the correct relationships remain
    const remainingTagIds = afterRemove.map(nt => nt.tag_id).sort();
    expect(remainingTagIds).toEqual([tags[0].id, tags[2].id].sort());
  });

  it('should handle invalid note and tag IDs gracefully', async () => {
    // Try to remove relationship with non-existent IDs
    const result = await removeTagFromNote({
      note_id: 9999,
      tag_id: 9999
    });

    expect(result.success).toBe(true);

    // Verify no relationships exist with these IDs
    const relationships = await db.select()
      .from(noteTagsTable)
      .where(
        and(
          eq(noteTagsTable.note_id, 9999),
          eq(noteTagsTable.tag_id, 9999)
        )
      )
      .execute();

    expect(relationships).toHaveLength(0);
  });
});