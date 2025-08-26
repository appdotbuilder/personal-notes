import { db } from '../db';
import { tagsTable } from '../db/schema';
import { type Tag } from '../schema';
import { asc } from 'drizzle-orm';

export const getTags = async (): Promise<Tag[]> => {
  try {
    const results = await db.select()
      .from(tagsTable)
      .orderBy(asc(tagsTable.name))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    throw error;
  }
};