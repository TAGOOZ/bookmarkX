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
});
