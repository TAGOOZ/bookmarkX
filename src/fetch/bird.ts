import { execFile } from 'child_process';
import dotenv from 'dotenv';
import type { Bookmark, FetchOptions } from './types';

dotenv.config();

function runBird(args: string[], env?: Record<string, string>): Promise<string> {
  return new Promise((resolve, reject) => {
    const options: { env?: Record<string, string> } = {};
    if (env) {
      options.env = { ...process.env, ...env };
    }
    execFile('bird', args, options, (error, stdout, stderr) => {
      if (error) return reject(error);
      resolve(stdout);
    });
  });
}

function classifyContentType(raw: any): Bookmark['content_type'] {
  if (raw.is_thread || raw.thread_tweet_count > 1) return 'thread';
  if (raw.urls && raw.urls.length > 0) return 'outer_link';
  if (raw.is_article) return 'x_article';
  return 'outer_link';
}

function mapBookmark(raw: any): Bookmark {
  return {
    id: raw.id || crypto.randomUUID(),
    tweet_id: raw.id,
    url: raw.url || `https://x.com/i/status/${raw.id}`,
    content_type: classifyContentType(raw),
    title: raw.title || null,
    author_name: raw.author?.name || null,
    author_handle: raw.author?.screen_name || null,
    tweet_text: raw.text || null,
    fetched_at: new Date().toISOString(),
  };
}

export async function fetchBookmarks(
  options: FetchOptions = {}
): Promise<Bookmark[]> {
  const { count = 20, authToken, ct0, chromeProfile, firefoxProfile } = options;

  const args = ['bookmarks', '--json', '--count', String(count)];

  const env: Record<string, string> = {};
  if (authToken) env.BIRD_AUTH_TOKEN = authToken;
  if (ct0) env.BIRD_CT0 = ct0;

  if (chromeProfile) args.push('--chrome-profile', chromeProfile);
  if (firefoxProfile) args.push('--firefox-profile', firefoxProfile);

  const stdout = await runBird(args, Object.keys(env).length > 0 ? env : undefined);

  const raw = JSON.parse(stdout);
  if (!Array.isArray(raw)) {
    throw new Error(`Unexpected bird output: ${typeof raw}`);
  }

  return raw.map(mapBookmark);
}
