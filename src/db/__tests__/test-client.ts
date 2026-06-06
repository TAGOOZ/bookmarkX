import { createClient, type Client } from '@libsql/client';
import { initializeSchema } from '../schema';

export async function createTestDb(): Promise<Client> {
  const db = createClient({ url: ':memory:' });
  await initializeSchema(db);
  return db;
}
