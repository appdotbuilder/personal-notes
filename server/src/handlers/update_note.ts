import { db } from '../db';
import { notesTable, noteTagsTable, tagsTable } from '../db/schema';
import { type UpdateNoteInput, type NoteWithTags } from '../schema';
import { eq } from 'drizzle-orm';

export const updateNote = async (input: UpdateNoteInput): Promise<NoteWithTags> => {
  try {
    // Update the note with provided fields and set updated_at timestamp
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }
    if (input.content !== undefined) {
      updateData.content = input.content;
    }
    if (input.folder_id !== undefined) {
      updateData.folder_id = input.folder_id;
    }
    if (input.is_favorite !== undefined) {
      updateData.is_favorite = input.is_favorite;
    }

    const updatedNotes = await db.update(notesTable)
      .set(updateData)
      .where(eq(notesTable.id, input.id))
      .returning()
      .execute();

    if (updatedNotes.length === 0) {
      throw new Error(`Note with id ${input.id} not found`);
    }

    const updatedNote = updatedNotes[0];

    // Fetch associated tags
    const noteTagsResult = await db.select({
      tag_id: tagsTable.id,
      tag_name: tagsTable.name,
      tag_color: tagsTable.color,
      tag_created_at: tagsTable.created_at
    })
      .from(noteTagsTable)
      .innerJoin(tagsTable, eq(noteTagsTable.tag_id, tagsTable.id))
      .where(eq(noteTagsTable.note_id, updatedNote.id))
      .execute();

    // Transform tags data
    const tags = noteTagsResult.map(result => ({
      id: result.tag_id,
      name: result.tag_name,
      color: result.tag_color,
      created_at: result.tag_created_at
    }));

    return {
      ...updatedNote,
      tags
    };
  } catch (error) {
    console.error('Note update failed:', error);
    throw error;
  }
};