import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../ipc-helpers', () => ({
  checkCooldown: vi.fn(() => true),
  getConfigEnv: vi.fn(() => Promise.resolve({ apiKey: 'test-key' })),
  invalidateConfigCache: vi.fn(),
}));

vi.mock('../../../services/summarize', () => ({
  summarizeBookmark: vi.fn(),
}));

vi.mock('../../../db/bookmarks', () => ({
  getBookmarkById: vi.fn(),
}));

vi.mock('../../../db/chat', () => ({
  createChatSession: vi.fn(),
}));

vi.mock('../../../db/article-content', () => ({
  searchArticleContent: vi.fn(),
}));

vi.mock('../../../db/glossary', () => ({
  addTerm: vi.fn(),
}));

vi.mock('../../../db/custom-sections', () => ({
  createCustomSection: vi.fn(),
}));

import { registerContentIpc } from '../content';
import { registerContentChatIpc } from '../content-chat';
import { registerContentSearchIpc } from '../content-search';
import { registerContentGlossaryIpc } from '../content-glossary';
import { registerContentSectionsIpc } from '../content-sections';

import { checkCooldown, getConfigEnv } from '../ipc-helpers';
import { summarizeBookmark } from '../../../services/summarize';
import { getBookmarkById } from '../../../db/bookmarks';
import { createChatSession } from '../../../db/chat';
import { searchArticleContent } from '../../../db/article-content';
import { addTerm } from '../../../db/glossary';
import { createCustomSection } from '../../../db/custom-sections';

function createMockIpcMain() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlers: Record<string, (...args: any[]) => any> = {};
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handle: (channel: string, handler: (...args: any[]) => any) => {
      handlers[channel] = handler;
    },
    handlers,
  };
}

function createMockDb() {
  return {} as any;
}

describe('IPC handlers', () => {
  let ipcMain: ReturnType<typeof createMockIpcMain>;
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    ipcMain = createMockIpcMain();
    db = createMockDb();
  });

  describe('summarize-bookmark', () => {
    it('returns summary on success', async () => {
      registerContentIpc(ipcMain as any, db);

      (vi.mocked(getBookmarkById) as any).mockResolvedValue({ id: 'bm-1', title: 'Test' });
      (vi.mocked(summarizeBookmark) as any).mockResolvedValue({ content_en: 'Summary', content_ar: 'ملخص' });

      const result = await ipcMain.handlers['summarize-bookmark'](null, 'bm-1');

      expect(result.content_en).toBe('Summary');
      expect(result.content_ar).toBe('ملخص');
    });

    it('throws when bookmark not found', async () => {
      registerContentIpc(ipcMain as any, db);

      (vi.mocked(getBookmarkById) as any).mockResolvedValue(null);

      await expect(
        ipcMain.handlers['summarize-bookmark'](null, 'nonexistent'),
      ).rejects.toThrow('Bookmark not found');
    });
  });

  describe('create-chat-session', () => {
    it('returns new session on success', async () => {
      registerContentChatIpc(ipcMain as any, db);

      (vi.mocked(createChatSession) as any).mockResolvedValue({ id: 'session-1', bookmark_id: 'bm-1' });

      const result = await ipcMain.handlers['create-chat-session'](null, 'bm-1');

      expect(result.id).toBe('session-1');
      expect(createChatSession).toHaveBeenCalledWith(db, 'bm-1');
    });

    it('propagates db errors', async () => {
      registerContentChatIpc(ipcMain as any, db);

      (vi.mocked(createChatSession) as any).mockRejectedValue(new Error('DB error'));

      await expect(
        ipcMain.handlers['create-chat-session'](null, 'bm-1'),
      ).rejects.toThrow('DB error');
    });
  });

  describe('search-articles', () => {
    it('returns search results', async () => {
      registerContentSearchIpc(ipcMain as any, db);

      const mockResults = [{ id: 'bm-1', title: 'Article 1' }];
      (vi.mocked(searchArticleContent) as any).mockResolvedValue(mockResults);

      const result = await ipcMain.handlers['search-articles'](null, 'test query');

      expect(result).toEqual(mockResults);
    });

    it('returns empty array for short query', async () => {
      registerContentSearchIpc(ipcMain as any, db);

      const result = await ipcMain.handlers['search-articles'](null, 'a');

      expect(result).toEqual([]);
    });
  });

  describe('add-glossary-term', () => {
    it('adds term successfully', async () => {
      registerContentGlossaryIpc(ipcMain as any, db);

      (vi.mocked(addTerm) as any).mockResolvedValue({ id: 'term-1' });

      const result = await ipcMain.handlers['add-glossary-term'](null, 'API', 'Application Programming Interface');

      expect(result.id).toBe('term-1');
    });

    it('throws on empty term', async () => {
      registerContentGlossaryIpc(ipcMain as any, db);

      await expect(
        ipcMain.handlers['add-glossary-term'](null, '', 'def'),
      ).rejects.toThrow('Glossary term must be between 1 and 500 characters');
    });
  });

  describe('create-custom-section', () => {
    it('creates section successfully', async () => {
      registerContentSectionsIpc(ipcMain as any, db);

      (vi.mocked(createCustomSection) as any).mockResolvedValue({ id: 'section-1' });

      const result = await ipcMain.handlers['create-custom-section'](null, 'bm-1', 'My Section', 'content');

      expect(result.id).toBe('section-1');
    });

    it('throws on empty title', async () => {
      registerContentSectionsIpc(ipcMain as any, db);

      await expect(
        ipcMain.handlers['create-custom-section'](null, 'bm-1', '', 'content'),
      ).rejects.toThrow('Custom section title must be between 1 and 500 characters');
    });
  });
});
