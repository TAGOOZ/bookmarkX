import { execFile } from 'child_process';
import dotenv from 'dotenv';
import type { Bookmark, FetchOptions, FetchResult } from './types';

dotenv.config();

function runBird(args: string[], env?: Record<string, string>): Promise<string> {
  return new Promise((resolve, reject) => {
    const options: { env?: Record<string, string> } = {};
    if (env) {
      options.env = { ...process.env, ...env };
    }
    execFile('bird', args, options, (error, stdout, _stderr) => {
      if (error) return reject(error);
      resolve(stdout);
    });
  });
}

function classifyContentType(raw: any): Bookmark['content_type'] {
  if (raw.is_thread || raw.thread_tweet_count > 1) return 'thread';
  if (raw.is_video || raw.video) return 'video';
  const urls: string[] = (raw.urls || []).map((u: any) =>
    typeof u === 'string' ? u : u.expanded_url || u.url || '',
  );
  const hasOuterLinks = urls.some(
    (u) => u && !u.includes('x.com') && !u.includes('twitter.com'),
  );
  if (hasOuterLinks) return 'outer_link';
  if (raw.is_article || urls.length > 0) return 'x_article';
  return 'plain_tweet';
}

function mapBookmark(raw: any): Bookmark {
  const urls: string[] = (raw.urls || []).map((u: any) =>
    typeof u === 'string' ? u : u.expanded_url || u.url || '',
  );
  return {
    id: raw.id || crypto.randomUUID(),
    tweet_id: raw.id,
    url: raw.url || `https://x.com/i/status/${raw.id}`,
    content_type: classifyContentType(raw),
    title: raw.title || null,
    title_ar: raw.title_ar || null,
    title_en: raw.title_en || null,
    author_name: raw.author?.name || null,
    author_handle: raw.author?.screen_name || null,
    tweet_text: raw.text || null,
    outer_urls: urls.length > 0 ? urls : null,
    thread_tweet_count: raw.thread_tweet_count || null,
    video_url: raw.video || null,
    fetched_at: new Date().toISOString(),
  };
}

export async function fetchBookmarks(
  options: FetchOptions = {}
): Promise<Bookmark[]> {
  const result = await fetchBookmarksPaginated(options);
  return result.bookmarks;
}

export async function fetchBookmarksPaginated(
  options: FetchOptions = {}
): Promise<FetchResult> {
  const { count = 20, cursor, authToken, ct0, chromeProfile, firefoxProfile } = options;

  if (!authToken || !ct0) {
    throw new Error(
      'Missing X/Twitter credentials. Open Settings and either:\n' +
      '• Click "Login with Twitter" to authenticate, or\n' +
      '• Enter auth_token and ct0 manually from Chrome DevTools'
    );
  }

  const args = ['bookmarks', '--json', '--count', String(count)];
  if (cursor) args.push('--cursor', cursor);

  const env: Record<string, string> = {};
  if (authToken) env.AUTH_TOKEN = authToken;
  if (ct0) env.CT0 = ct0;

  if (chromeProfile) args.push('--chrome-profile', chromeProfile);
  if (firefoxProfile) args.push('--firefox-profile', firefoxProfile);

  const stdout = await runBird(args, Object.keys(env).length > 0 ? env : undefined);

  let raw: unknown;
  try {
    raw = JSON.parse(stdout);
  } catch {
    throw new Error(`Failed to parse bird output as JSON: ${stdout.substring(0, 200)}`);
  }

  let bookmarks: Bookmark[];
  let nextCursor: string | null = null;
  let hasMore = false;

  if (Array.isArray(raw)) {
    bookmarks = raw.map(mapBookmark);
  } else if (raw && typeof raw === 'object' && 'bookmarks' in raw) {
    const data = raw as { bookmarks: any[]; cursor?: string; has_more?: boolean };
    bookmarks = (data.bookmarks || []).map(mapBookmark);
    nextCursor = data.cursor || null;
    hasMore = data.has_more ?? bookmarks.length >= count;
  } else {
    throw new Error(`Unexpected bird output: ${typeof raw}`);
  }

  return { bookmarks, nextCursor, hasMore };
}
