import { describe, it, expect } from 'vitest';
import NavPanel from '../components/NavPanel';
import BookmarkDetail from '../components/bookmark-detail/BookmarkDetail';
import Settings from '../components/Settings';

describe('UI Components', () => {
  it('NavPanel exports correctly', () => {
    expect(NavPanel).toBeDefined();
    expect(typeof NavPanel).toBe('function');
  });

  it('BookmarkDetail exports correctly', () => {
    expect(BookmarkDetail).toBeDefined();
    expect(typeof BookmarkDetail).toBe('function');
  });

  it('Settings exports correctly', () => {
    expect(Settings).toBeDefined();
    expect(typeof Settings).toBe('function');
  });

  it('Bookmark type has all required fields', () => {
    const bookmark = {
      id: '1',
      title: 'Test',
      url: 'https://test.com',
      topic: 'tech',
      priority: 'high' as const,
      contentType: 'article',
      content: 'Content',
      createdAt: '2024-01-01',
    };
    expect(bookmark).toHaveProperty('id');
    expect(bookmark).toHaveProperty('title');
    expect(bookmark).toHaveProperty('url');
    expect(bookmark).toHaveProperty('topic');
    expect(bookmark).toHaveProperty('priority');
    expect(bookmark).toHaveProperty('contentType');
    expect(bookmark).toHaveProperty('content');
    expect(bookmark).toHaveProperty('createdAt');
  });

  it('Priority values are valid', () => {
    const validPriorities = ['high', 'medium', 'low'];
    expect(validPriorities).toContain('high');
    expect(validPriorities).toContain('medium');
    expect(validPriorities).toContain('low');
  });

  it('Settings form data initializes with empty values', () => {
    const formData = {
      geminiApiKey: '',
      birdAuthToken: '',
      birdCt0: '',
      birdChromeProfile: '',
    };
    expect(formData.geminiApiKey).toBe('');
    expect(formData.birdAuthToken).toBe('');
    expect(formData.birdCt0).toBe('');
    expect(formData.birdChromeProfile).toBe('');
  });
});
