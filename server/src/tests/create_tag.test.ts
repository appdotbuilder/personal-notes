import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tagsTable } from '../db/schema';
import { type CreateTagInput } from '../schema';
import { createTag } from '../handlers/create_tag';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateTagInput = {
  name: 'Important',
  color: '#ff0000'
};

describe('createTag', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a tag with color', async () => {
    const result = await createTag(testInput);

    // Basic field validation
    expect(result.name).toEqual('Important');
    expect(result.color).toEqual('#ff0000');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toEqual('number');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a tag without color', async () => {
    const inputWithoutColor: CreateTagInput = {
      name: 'Work',
      color: null
    };

    const result = await createTag(inputWithoutColor);

    expect(result.name).toEqual('Work');
    expect(result.color).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save tag to database', async () => {
    const result = await createTag(testInput);

    // Query using proper drizzle syntax
    const tags = await db.select()
      .from(tagsTable)
      .where(eq(tagsTable.id, result.id))
      .execute();

    expect(tags).toHaveLength(1);
    expect(tags[0].name).toEqual('Important');
    expect(tags[0].color).toEqual('#ff0000');
    expect(tags[0].created_at).toBeInstanceOf(Date);
  });

  it('should reject duplicate tag names', async () => {
    // Create first tag
    await createTag(testInput);

    // Try to create tag with same name
    const duplicateInput: CreateTagInput = {
      name: 'Important',
      color: '#0000ff'
    };

    await expect(createTag(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should handle different color formats', async () => {
    const colorVariations: CreateTagInput[] = [
      { name: 'Red', color: '#ff0000' },
      { name: 'Green', color: '#00ff00' },
      { name: 'Blue', color: '#0000ff' },
      { name: 'NoColor', color: null }
    ];

    for (const input of colorVariations) {
      const result = await createTag(input);
      expect(result.name).toEqual(input.name);
      expect(result.color).toEqual(input.color);
    }
  });

  it('should create multiple tags with unique names', async () => {
    const tags = [
      { name: 'Urgent', color: '#ff0000' },
      { name: 'Personal', color: '#00ff00' },
      { name: 'Work', color: '#0000ff' }
    ];

    const results = [];
    for (const tag of tags) {
      const result = await createTag(tag);
      results.push(result);
    }

    // Verify all tags were created
    expect(results).toHaveLength(3);
    results.forEach((result, index) => {
      expect(result.name).toEqual(tags[index].name);
      expect(result.color).toEqual(tags[index].color);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    // Verify they exist in database
    const allTags = await db.select().from(tagsTable).execute();
    expect(allTags).toHaveLength(3);
  });

  it('should set created_at timestamp automatically', async () => {
    const beforeCreation = new Date();
    const result = await createTag(testInput);
    const afterCreation = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.created_at >= beforeCreation).toBe(true);
    expect(result.created_at <= afterCreation).toBe(true);
  });
});