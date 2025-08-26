import { db } from '../db';
import { tagsTable } from '../db/schema';
import { type UpdateTagInput, type Tag } from '../schema';
import { eq } from 'drizzle-orm';

export const updateTag = async (input: UpdateTagInput): Promise<Tag> => {
  try {
    // Build the update object with only provided fields
    const updateData: Partial<{ name: string; color: string | null }> = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    
    if (input.color !== undefined) {
      updateData.color = input.color;
    }

    // If no fields to update, just return the existing tag
    if (Object.keys(updateData).length === 0) {
      const existingTags = await db.select()
        .from(tagsTable)
        .where(eq(tagsTable.id, input.id))
        .execute();
      
      if (existingTags.length === 0) {
        throw new Error(`Tag with id ${input.id} not found`);
      }
      
      return existingTags[0];
    }

    // Perform the update operation
    const result = await db.update(tagsTable)
      .set(updateData)
      .where(eq(tagsTable.id, input.id))
      .returning()
      .execute();

    // Check if tag was found and updated
    if (result.length === 0) {
      throw new Error(`Tag with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Tag update failed:', error);
    throw error;
  }
};