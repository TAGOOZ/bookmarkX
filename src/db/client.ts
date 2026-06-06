import { createClient, type Client } from '@libsql/client';
import path from 'node:path';

export function createDb(userDataDir: string): Client {
  return createClient({ url: `file:${path.join(userDataDir, 'bookmarks.db')}` });
}
