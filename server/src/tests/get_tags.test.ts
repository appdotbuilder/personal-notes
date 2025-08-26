import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tagsTable } from '../db/schema';
import { type CreateTagInput } from '../schema';
import { getTags } from '../handlers/get_tags';

// Test tag inputs
const testTags: CreateTagInput[] = [
  {
    name: 'Work',
    color: '#FF5733'
  },
  {
    name: 'Personal',
    color: '#33FF57'
  },
  {
    name: 'Archive',
    color: null
  },
  {
    name: 'Important',
    color: '#3357FF'
  }
];

describe('getTags', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no tags exist', async () => {
    const result = await getTags();

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all tags ordered by name', async () => {
    // Create test tags
    await db.insert(tagsTable)
      .values(testTags)
      .execute();

    const result = await getTags();

    // Should return all 4 tags
    expect(result).toHaveLength(4);
    
    // Should be ordered by name alphabetically
    expect(result[0].name).toEqual('Archive');
    expect(result[1].name).toEqual('Important');
    expect(result[2].name).toEqual('Personal');
    expect(result[3].name).toEqual('Work');

    // Verify all fields are present
    result.forEach(tag => {
      expect(tag.id).toBeDefined();
      expect(typeof tag.id).toBe('number');
      expect(typeof tag.name).toBe('string');
      expect(tag.created_at).toBeInstanceOf(Date);
      
      // Color can be string or null
      if (tag.color !== null) {
        expect(typeof tag.color).toBe('string');
      }
    });
  });

  it('should return tags with correct color values', async () => {
    // Create tags with different color scenarios
    await db.insert(tagsTable)
      .values([
        { name: 'Colored Tag', color: '#FF5733' },
        { name: 'No Color Tag', color: null }
      ])
      .execute();

    const result = await getTags();

    expect(result).toHaveLength(2);
    
    // Find the colored tag
    const coloredTag = result.find(tag => tag.name === 'Colored Tag');
    expect(coloredTag).toBeDefined();
    expect(coloredTag!.color).toEqual('#FF5733');

    // Find the tag without color
    const noColorTag = result.find(tag => tag.name === 'No Color Tag');
    expect(noColorTag).toBeDefined();
    expect(noColorTag!.color).toBeNull();
  });

  it('should handle single tag correctly', async () => {
    // Create single tag
    await db.insert(tagsTable)
      .values([{ name: 'Single Tag', color: '#123456' }])
      .execute();

    const result = await getTags();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Single Tag');
    expect(result[0].color).toEqual('#123456');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should maintain consistent ordering with mixed case names', async () => {
    // Create tags with mixed case to test ordering
    await db.insert(tagsTable)
      .values([
        { name: 'zebra', color: null },
        { name: 'Apple', color: null },
        { name: 'banana', color: null },
        { name: 'Cherry', color: null }
      ])
      .execute();

    const result = await getTags();

    expect(result).toHaveLength(4);
    
    // Should be ordered alphabetically (case-sensitive by default in PostgreSQL)
    const names = result.map(tag => tag.name);
    expect(names).toEqual(['Apple', 'Cherry', 'banana', 'zebra']);
  });

  it('should return tags created at different times in name order', async () => {
    // Create tags one by one to ensure different timestamps
    await db.insert(tagsTable)
      .values([{ name: 'Z-Last', color: null }])
      .execute();

    // Longer delay to ensure different created_at timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(tagsTable)
      .values([{ name: 'A-First', color: null }])
      .execute();

    const result = await getTags();

    expect(result).toHaveLength(2);
    
    // Should be ordered by name, not creation time
    expect(result[0].name).toEqual('A-First');
    expect(result[1].name).toEqual('Z-Last');
    
    // Verify both tags have valid timestamps
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[1].created_at).toBeInstanceOf(Date);
    
    // The key point is that ordering is by name, not creation time
    // We don't need to test the exact timestamp relationship
  });
});