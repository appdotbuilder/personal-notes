import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tagsTable } from '../db/schema';
import { type UpdateTagInput } from '../schema';
import { updateTag } from '../handlers/update_tag';
import { eq } from 'drizzle-orm';

describe('updateTag', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update tag name only', async () => {
    // Create initial tag
    const initialTag = await db.insert(tagsTable)
      .values({
        name: 'Original Tag',
        color: '#FF0000'
      })
      .returning()
      .execute();

    const tagId = initialTag[0].id;

    // Update only the name
    const updateInput: UpdateTagInput = {
      id: tagId,
      name: 'Updated Tag Name'
    };

    const result = await updateTag(updateInput);

    // Verify the result
    expect(result.id).toEqual(tagId);
    expect(result.name).toEqual('Updated Tag Name');
    expect(result.color).toEqual('#FF0000'); // Should remain unchanged
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update tag color only', async () => {
    // Create initial tag
    const initialTag = await db.insert(tagsTable)
      .values({
        name: 'Test Tag',
        color: '#FF0000'
      })
      .returning()
      .execute();

    const tagId = initialTag[0].id;

    // Update only the color
    const updateInput: UpdateTagInput = {
      id: tagId,
      color: '#00FF00'
    };

    const result = await updateTag(updateInput);

    // Verify the result
    expect(result.id).toEqual(tagId);
    expect(result.name).toEqual('Test Tag'); // Should remain unchanged
    expect(result.color).toEqual('#00FF00');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update both name and color', async () => {
    // Create initial tag
    const initialTag = await db.insert(tagsTable)
      .values({
        name: 'Original Tag',
        color: '#FF0000'
      })
      .returning()
      .execute();

    const tagId = initialTag[0].id;

    // Update both fields
    const updateInput: UpdateTagInput = {
      id: tagId,
      name: 'Completely New Tag',
      color: '#0000FF'
    };

    const result = await updateTag(updateInput);

    // Verify the result
    expect(result.id).toEqual(tagId);
    expect(result.name).toEqual('Completely New Tag');
    expect(result.color).toEqual('#0000FF');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should set color to null', async () => {
    // Create initial tag with color
    const initialTag = await db.insert(tagsTable)
      .values({
        name: 'Test Tag',
        color: '#FF0000'
      })
      .returning()
      .execute();

    const tagId = initialTag[0].id;

    // Update color to null
    const updateInput: UpdateTagInput = {
      id: tagId,
      color: null
    };

    const result = await updateTag(updateInput);

    // Verify the result
    expect(result.id).toEqual(tagId);
    expect(result.name).toEqual('Test Tag'); // Should remain unchanged
    expect(result.color).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should persist changes to database', async () => {
    // Create initial tag
    const initialTag = await db.insert(tagsTable)
      .values({
        name: 'Original Tag',
        color: '#FF0000'
      })
      .returning()
      .execute();

    const tagId = initialTag[0].id;

    // Update the tag
    const updateInput: UpdateTagInput = {
      id: tagId,
      name: 'Persisted Update',
      color: '#00FF00'
    };

    await updateTag(updateInput);

    // Verify changes were persisted in database
    const updatedTags = await db.select()
      .from(tagsTable)
      .where(eq(tagsTable.id, tagId))
      .execute();

    expect(updatedTags).toHaveLength(1);
    expect(updatedTags[0].name).toEqual('Persisted Update');
    expect(updatedTags[0].color).toEqual('#00FF00');
    expect(updatedTags[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent tag', async () => {
    const updateInput: UpdateTagInput = {
      id: 9999, // Non-existent ID
      name: 'This Should Fail'
    };

    await expect(updateTag(updateInput)).rejects.toThrow(/Tag with id 9999 not found/i);
  });

  it('should maintain name uniqueness constraint', async () => {
    // Create two tags
    const tag1 = await db.insert(tagsTable)
      .values({
        name: 'Unique Tag 1',
        color: '#FF0000'
      })
      .returning()
      .execute();

    const tag2 = await db.insert(tagsTable)
      .values({
        name: 'Unique Tag 2',
        color: '#00FF00'
      })
      .returning()
      .execute();

    // Try to update tag2 to have the same name as tag1
    const updateInput: UpdateTagInput = {
      id: tag2[0].id,
      name: 'Unique Tag 1' // This should violate unique constraint
    };

    await expect(updateTag(updateInput)).rejects.toThrow();
  });

  it('should handle updating tag with null color initially', async () => {
    // Create initial tag with null color
    const initialTag = await db.insert(tagsTable)
      .values({
        name: 'No Color Tag',
        color: null
      })
      .returning()
      .execute();

    const tagId = initialTag[0].id;

    // Update to add a color
    const updateInput: UpdateTagInput = {
      id: tagId,
      color: '#PURPLE'
    };

    const result = await updateTag(updateInput);

    // Verify the result
    expect(result.id).toEqual(tagId);
    expect(result.name).toEqual('No Color Tag'); // Should remain unchanged
    expect(result.color).toEqual('#PURPLE');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should handle empty update input gracefully', async () => {
    // Create initial tag
    const initialTag = await db.insert(tagsTable)
      .values({
        name: 'Unchanged Tag',
        color: '#FF0000'
      })
      .returning()
      .execute();

    const tagId = initialTag[0].id;

    // Update with no fields (should still work but change nothing)
    const updateInput: UpdateTagInput = {
      id: tagId
    };

    const result = await updateTag(updateInput);

    // Verify the result - should remain unchanged
    expect(result.id).toEqual(tagId);
    expect(result.name).toEqual('Unchanged Tag');
    expect(result.color).toEqual('#FF0000');
    expect(result.created_at).toBeInstanceOf(Date);
  });
});