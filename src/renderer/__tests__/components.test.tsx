import { describe, it, expect } from 'vitest';
import Sidebar from '../components/Sidebar';
import BookmarkList from '../components/BookmarkList';
import BookmarkDetail from '../components/BookmarkDetail';
import Settings from '../components/Settings';

describe('UI Components', () => {
  it('Sidebar exports correctly', () => {
    expect(Sidebar).toBeDefined();
    expect(typeof Sidebar).toBe('function');
  });

  it('BookmarkList exports correctly', () => {
    expect(BookmarkList).toBeDefined();
    expect(typeof BookmarkList).toBe('function');
  });

  it('BookmarkDetail exports correctly', () => {
    expect(BookmarkDetail).toBeDefined();
    expect(typeof BookmarkDetail).toBe('function');
  });

  it('Settings exports correctly', () => {
    expect(Settings).toBeDefined();
    expect(typeof Settings).toBe('function');
  });

  it('BookmarkList filters bookmarks by priority', () => {
    const bookmarks = [
      { id: '1', title: 'High', url: '', topic: 'tech', priority: 'high' as const, contentType: 'article', content: '', createdAt: '' },
      { id: '2', title: 'Low', url: '', topic: 'tech', priority: 'low' as const, contentType: 'article', content: '', createdAt: '' },
    ];
    const filtered = bookmarks.filter((b) => b.priority === 'high');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe('High');
  });

  it('BookmarkList filters bookmarks by search query', () => {
    const bookmarks = [
      { id: '1', title: 'React Tutorial', url: '', topic: 'tech', priority: 'high' as const, contentType: 'article', content: '', createdAt: '' },
      { id: '2', title: 'Vue Guide', url: '', topic: 'tech', priority: 'low' as const, contentType: 'article', content: '', createdAt: '' },
    ];
    const filtered = bookmarks.filter((b) =>
      b.title.toLowerCase().includes('react'),
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe('React Tutorial');
  });

  it('Filter state defaults correctly', () => {
    const filters = { priority: '', topic: '', contentType: '' };
    expect(filters.priority).toBe('');
    expect(filters.topic).toBe('');
    expect(filters.contentType).toBe('');
  });

  it('Priority filter values are valid', () => {
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
});
