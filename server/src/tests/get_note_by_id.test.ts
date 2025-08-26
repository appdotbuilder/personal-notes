import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { notesTable, tagsTable, noteTagsTable, foldersTable } from '../db/schema';
import { getNoteById } from '../handlers/get_note_by_id';

describe('getNoteById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when note does not exist', async () => {
    const result = await getNoteById(999);
    expect(result).toBeNull();
  });

  it('should return a note without tags', async () => {
    // Create a test note
    const noteResult = await db.insert(notesTable)
      .values({
        title: 'Test Note',
        content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Test content"}]}]}',
        folder_id: null,
        is_favorite: false
      })
      .returning()
      .execute();

    const createdNote = noteResult[0];
    const result = await getNoteById(createdNote.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdNote.id);
    expect(result!.title).toEqual('Test Note');
    expect(result!.content).toEqual('{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Test content"}]}]}');
    expect(result!.folder_id).toBeNull();
    expect(result!.is_favorite).toBe(false);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.tags).toEqual([]);
  });

  it('should return a note with folder_id', async () => {
    // Create a test folder first
    const folderResult = await db.insert(foldersTable)
      .values({
        name: 'Test Folder',
        parent_id: null
      })
      .returning()
      .execute();

    const folder = folderResult[0];

    // Create a test note with folder_id
    const noteResult = await db.insert(notesTable)
      .values({
        title: 'Note in Folder',
        content: '{"type":"doc","content":[]}',
        folder_id: folder.id,
        is_favorite: true
      })
      .returning()
      .execute();

    const createdNote = noteResult[0];
    const result = await getNoteById(createdNote.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdNote.id);
    expect(result!.title).toEqual('Note in Folder');
    expect(result!.folder_id).toEqual(folder.id);
    expect(result!.is_favorite).toBe(true);
    expect(result!.tags).toEqual([]);
  });

  it('should return a note with single tag', async () => {
    // Create a test tag
    const tagResult = await db.insert(tagsTable)
      .values({
        name: 'Important',
        color: '#ff0000'
      })
      .returning()
      .execute();

    const tag = tagResult[0];

    // Create a test note
    const noteResult = await db.insert(notesTable)
      .values({
        title: 'Tagged Note',
        content: '{"type":"doc","content":[]}',
        folder_id: null,
        is_favorite: false
      })
      .returning()
      .execute();

    const note = noteResult[0];

    // Associate the tag with the note
    await db.insert(noteTagsTable)
      .values({
        note_id: note.id,
        tag_id: tag.id
      })
      .execute();

    const result = await getNoteById(note.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(note.id);
    expect(result!.title).toEqual('Tagged Note');
    expect(result!.tags).toHaveLength(1);
    expect(result!.tags[0].id).toEqual(tag.id);
    expect(result!.tags[0].name).toEqual('Important');
    expect(result!.tags[0].color).toEqual('#ff0000');
    expect(result!.tags[0].created_at).toBeInstanceOf(Date);
  });

  it('should return a note with multiple tags', async () => {
    // Create multiple test tags
    const tag1Result = await db.insert(tagsTable)
      .values({
        name: 'Work',
        color: '#0066cc'
      })
      .returning()
      .execute();

    const tag2Result = await db.insert(tagsTable)
      .values({
        name: 'Personal',
        color: '#00cc66'
      })
      .returning()
      .execute();

    const tag3Result = await db.insert(tagsTable)
      .values({
        name: 'Urgent',
        color: null // Test null color
      })
      .returning()
      .execute();

    const tag1 = tag1Result[0];
    const tag2 = tag2Result[0];
    const tag3 = tag3Result[0];

    // Create a test note
    const noteResult = await db.insert(notesTable)
      .values({
        title: 'Multi-Tagged Note',
        content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Complex note content"}]}]}',
        folder_id: null,
        is_favorite: true
      })
      .returning()
      .execute();

    const note = noteResult[0];

    // Associate multiple tags with the note
    await db.insert(noteTagsTable)
      .values([
        { note_id: note.id, tag_id: tag1.id },
        { note_id: note.id, tag_id: tag2.id },
        { note_id: note.id, tag_id: tag3.id }
      ])
      .execute();

    const result = await getNoteById(note.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(note.id);
    expect(result!.title).toEqual('Multi-Tagged Note');
    expect(result!.tags).toHaveLength(3);

    // Sort tags by name for consistent testing
    const sortedTags = result!.tags.sort((a, b) => a.name.localeCompare(b.name));

    expect(sortedTags[0].name).toEqual('Personal');
    expect(sortedTags[0].color).toEqual('#00cc66');
    expect(sortedTags[1].name).toEqual('Urgent');
    expect(sortedTags[1].color).toBeNull();
    expect(sortedTags[2].name).toEqual('Work');
    expect(sortedTags[2].color).toEqual('#0066cc');

    // Verify all tags have proper dates
    sortedTags.forEach(tag => {
      expect(tag.created_at).toBeInstanceOf(Date);
    });
  });

  it('should handle complex Tiptap JSON content', async () => {
    const complexContent = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "This is " },
            { type: "text", marks: [{ type: "bold" }], text: "bold text" },
            { type: "text", text: " and " },
            { type: "text", marks: [{ type: "italic" }], text: "italic text" }
          ]
        },
        {
          type: "bulletList",
          content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "First item" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Second item" }] }] }
          ]
        }
      ]
    });

    // Create a test note with complex content
    const noteResult = await db.insert(notesTable)
      .values({
        title: 'Complex Content Note',
        content: complexContent,
        folder_id: null,
        is_favorite: false
      })
      .returning()
      .execute();

    const createdNote = noteResult[0];
    const result = await getNoteById(createdNote.id);

    expect(result).not.toBeNull();
    expect(result!.content).toEqual(complexContent);
    expect(() => JSON.parse(result!.content)).not.toThrow();
    
    // Verify the parsed content structure
    const parsedContent = JSON.parse(result!.content);
    expect(parsedContent.type).toEqual('doc');
    expect(parsedContent.content).toHaveLength(2);
    expect(parsedContent.content[0].type).toEqual('paragraph');
    expect(parsedContent.content[1].type).toEqual('bulletList');
  });
});