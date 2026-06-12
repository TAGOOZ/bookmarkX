import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchBookmarks } from '../bird';
import type { Bookmark } from '../types';

vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

import { execFile } from 'child_process';

const mockExecFile = vi.mocked(execFile);

function mockBirdOutput(data: any[]) {
  mockExecFile.mockImplementation(
    ((_cmd: any, _args: any, _opts: any, cb: any) => {
      if (typeof _opts === 'function') {
        cb = _opts;
      }
      cb(null, JSON.stringify(data), '');
    }) as any
  );
}

function mockBirdError(message: string) {
  mockExecFile.mockImplementation(
    ((_cmd: any, _args: any, _opts: any, cb: any) => {
      if (typeof _opts === 'function') {
        cb = _opts;
      }
      cb(new Error(message), '', '');
    }) as any
  );
}

describe('fetchBookmarks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when authToken is missing', async () => {
    await expect(fetchBookmarks({ ct0: 'ct0' })).rejects.toThrow('Missing X/Twitter credentials');
  });

  it('throws when ct0 is missing', async () => {
    await expect(fetchBookmarks({ authToken: 'token' })).rejects.toThrow('Missing X/Twitter credentials');
  });

  it('throws when both are missing', async () => {
    await expect(fetchBookmarks()).rejects.toThrow('Missing X/Twitter credentials');
  });

  it('calls bird bookmarks with correct args', async () => {
    mockBirdOutput([]);
    await fetchBookmarks({ authToken: 'token', ct0: 'ct0', count: 10 });

    expect(mockExecFile).toHaveBeenCalledWith(
      'bird',
      ['bookmarks', '--json', '--count', '10'],
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('returns empty array when no bookmarks', async () => {
    mockBirdOutput([]);
    const result = await fetchBookmarks({ authToken: 'token', ct0: 'ct0' });
    expect(result).toEqual([]);
  });

  it('parses bookmark JSON into Bookmark types', async () => {
    const raw = [
      {
        id: '123',
        url: 'https://x.com/user/status/123',
        author: { name: 'Test User', screen_name: 'testuser' },
        text: 'Check out this link',
        created_at: '2024-01-15T10:00:00Z',
        urls: [{ expanded_url: 'https://example.com/article' }],
      },
    ];
    mockBirdOutput(raw);

    const result = await fetchBookmarks({ authToken: 'token', ct0: 'ct0' });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      tweet_id: '123',
      url: 'https://x.com/user/status/123',
      author_name: 'Test User',
      author_handle: 'testuser',
      tweet_text: 'Check out this link',
    });
  });

  it('detects outer_link content type when URLs present', async () => {
    const raw = [
      {
        id: '1',
        url: 'https://x.com/user/status/1',
        author: { name: 'A', screen_name: 'a' },
        text: 'link',
        urls: [{ expanded_url: 'https://example.com' }],
      },
    ];
    mockBirdOutput(raw);

    const result = await fetchBookmarks({ authToken: 'token', ct0: 'ct0' });
    expect(result[0].content_type).toBe('outer_link');
  });

  it('detects thread content type for thread entries', async () => {
    const raw = [
      {
        id: '2',
        url: 'https://x.com/user/status/2',
        author: { name: 'B', screen_name: 'b' },
        text: 'thread start',
        is_thread: true,
        thread_tweet_count: 5,
      },
    ];
    mockBirdOutput(raw);

    const result = await fetchBookmarks({ authToken: 'token', ct0: 'ct0' });
    expect(result[0].content_type).toBe('thread');
  });

  it('passes auth tokens as env vars', async () => {
    mockBirdOutput([]);
    await fetchBookmarks({
      authToken: 'my-token',
      ct0: 'my-ct0',
    });

    expect(mockExecFile).toHaveBeenCalledWith(
      'bird',
      ['bookmarks', '--json', '--count', '20'],
      expect.objectContaining({
        env: expect.objectContaining({
          AUTH_TOKEN: 'my-token',
          CT0: 'my-ct0',
        }),
      }),
      expect.any(Function)
    );
  });

  it('throws on bird CLI errors', async () => {
    mockBirdError('Authentication failed');
    await expect(fetchBookmarks({ authToken: 'token', ct0: 'ct0' })).rejects.toThrow('Authentication failed');
  });

  it('throws on invalid JSON output', async () => {
    mockExecFile.mockImplementation(((_cmd: any, _args: any, _opts: any, cb: any) => {
      if (typeof _opts === 'function') {
        cb = _opts;
      }
      cb(null, 'not json', '');
    }) as any);

    await expect(fetchBookmarks({ authToken: 'token', ct0: 'ct0' })).rejects.toThrow();
  });
});
