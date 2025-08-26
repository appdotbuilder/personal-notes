import { db } from '../db';
import { notesTable, tagsTable, noteTagsTable } from '../db/schema';
import { type SearchNotesInput, type NoteWithTags } from '../schema';
import { eq, and, sql, desc, type SQL } from 'drizzle-orm';

export const searchNotes = async (input: SearchNotesInput): Promise<NoteWithTags[]> => {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    // Search query condition - search in both title and content
    conditions.push(
      sql`(${notesTable.title} ILIKE ${'%' + input.query + '%'} OR ${notesTable.content} ILIKE ${'%' + input.query + '%'})`
    );

    // Optional folder filter
    if (input.folder_id !== undefined) {
      if (input.folder_id === null) {
        // Filter for notes not in any folder
        conditions.push(sql`${notesTable.folder_id} IS NULL`);
      } else {
        // Filter for specific folder
        conditions.push(eq(notesTable.folder_id, input.folder_id));
      }
    }

    // Optional favorites filter
    if (input.favorites_only) {
      conditions.push(eq(notesTable.is_favorite, true));
    }

    // Base query with tags joined and relevance calculation
    const query = db.select({
      id: notesTable.id,
      title: notesTable.title,
      content: notesTable.content,
      folder_id: notesTable.folder_id,
      is_favorite: notesTable.is_favorite,
      created_at: notesTable.created_at,
      updated_at: notesTable.updated_at,
      tags: sql<string>`COALESCE(
        json_agg(
          CASE WHEN ${tagsTable.id} IS NOT NULL THEN
            json_build_object(
              'id', ${tagsTable.id},
              'name', ${tagsTable.name},
              'color', ${tagsTable.color},
              'created_at', ${tagsTable.created_at}
            )
          ELSE NULL END
        ) FILTER (WHERE ${tagsTable.id} IS NOT NULL),
        '[]'
      )`,
      // Calculate relevance score for ranking
      relevance_score: sql<number>`
        CASE 
          WHEN ${notesTable.title} ILIKE ${'%' + input.query + '%'} THEN 10
          ELSE 0
        END +
        CASE 
          WHEN ${notesTable.content} ILIKE ${'%' + input.query + '%'} THEN 5
          ELSE 0
        END
      `
    })
    .from(notesTable)
    .leftJoin(noteTagsTable, eq(notesTable.id, noteTagsTable.note_id))
    .leftJoin(tagsTable, eq(noteTagsTable.tag_id, tagsTable.id))
    .where(and(...conditions))
    .groupBy(
      notesTable.id,
      notesTable.title,
      notesTable.content,
      notesTable.folder_id,
      notesTable.is_favorite,
      notesTable.created_at,
      notesTable.updated_at
    )
    .orderBy(
      desc(sql`
        CASE 
          WHEN ${notesTable.title} ILIKE ${'%' + input.query + '%'} THEN 10
          ELSE 0
        END +
        CASE 
          WHEN ${notesTable.content} ILIKE ${'%' + input.query + '%'} THEN 5
          ELSE 0
        END
      `),
      desc(notesTable.updated_at)
    );

    const results = await query.execute();

    // Process results and apply tag filtering if specified
    let processedResults = results.map(result => ({
      id: result.id,
      title: result.title,
      content: result.content,
      folder_id: result.folder_id,
      is_favorite: result.is_favorite,
      created_at: result.created_at,
      updated_at: result.updated_at,
      tags: (typeof result.tags === 'string' ? JSON.parse(result.tags) : result.tags).map((tag: any) => ({
        ...tag,
        created_at: new Date(tag.created_at) // Convert timestamp string to Date
      }))
    }));

    // Apply tag filtering if specified (post-processing for complex tag logic)
    if (input.tag_ids && input.tag_ids.length > 0) {
      processedResults = processedResults.filter(note => {
        const noteTagIds = note.tags.map((tag: any) => tag.id);
        // Check if note has ALL specified tags (AND logic)
        return input.tag_ids!.every(tagId => noteTagIds.includes(tagId));
      });
    }

    return processedResults;
  } catch (error) {
    console.error('Search notes failed:', error);
    throw error;
  }
};