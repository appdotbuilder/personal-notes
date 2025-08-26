import { db } from '../db';
import { notesTable, tagsTable, noteTagsTable } from '../db/schema';
import { type NoteWithTags } from '../schema';
import { eq, desc, inArray } from 'drizzle-orm';

export const getNotesByTag = async (tagId: number): Promise<NoteWithTags[]> => {
  try {
    // First, get all notes that are associated with the specific tag
    const notesWithTag = await db.select({
      id: notesTable.id,
      title: notesTable.title,
      content: notesTable.content,
      folder_id: notesTable.folder_id,
      is_favorite: notesTable.is_favorite,
      created_at: notesTable.created_at,
      updated_at: notesTable.updated_at,
    })
    .from(notesTable)
    .innerJoin(noteTagsTable, eq(notesTable.id, noteTagsTable.note_id))
    .where(eq(noteTagsTable.tag_id, tagId))
    .orderBy(desc(notesTable.updated_at))
    .execute();

    if (notesWithTag.length === 0) {
      return [];
    }

    // Get all note IDs
    const noteIds = notesWithTag.map(note => note.id);

    // Get all tags for all these notes
    const allTagsForNotes = await db.select({
      note_id: noteTagsTable.note_id,
      tag_id: tagsTable.id,
      tag_name: tagsTable.name,
      tag_color: tagsTable.color,
      tag_created_at: tagsTable.created_at,
    })
    .from(noteTagsTable)
    .innerJoin(tagsTable, eq(noteTagsTable.tag_id, tagsTable.id))
    .where(inArray(noteTagsTable.note_id, noteIds))
    .execute();

    // Group tags by note_id
    const tagsByNoteId = new Map<number, Array<{
      id: number;
      name: string;
      color: string | null;
      created_at: Date;
    }>>();

    for (const tagRow of allTagsForNotes) {
      if (!tagsByNoteId.has(tagRow.note_id)) {
        tagsByNoteId.set(tagRow.note_id, []);
      }
      tagsByNoteId.get(tagRow.note_id)!.push({
        id: tagRow.tag_id,
        name: tagRow.tag_name,
        color: tagRow.tag_color,
        created_at: tagRow.tag_created_at
      });
    }

    // Combine notes with their tags
    return notesWithTag.map(note => ({
      ...note,
      tags: tagsByNoteId.get(note.id) || []
    }));
  } catch (error) {
    console.error('Failed to get notes by tag:', error);
    throw error;
  }
};