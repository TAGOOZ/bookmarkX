import type { Client } from '@libsql/client';

export interface ArticleContentData {
  extracted_text: string;
  word_count: number;
}

export interface ArticleContent extends ArticleContentData {
  id: string;
  bookmark_id: string;
  created_at: string;
}

export async function storeArticleContent(
  db: Client,
  bookmarkId: string,
  data: ArticleContentData,
): Promise<void> {
  const id = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO article_content (id, bookmark_id, extracted_text, word_count)
          VALUES (?, ?, ?, ?)`,
    args: [id, bookmarkId, data.extracted_text, data.word_count],
  });
}

export async function getArticleContent(
  db: Client,
  bookmarkId: string,
): Promise<ArticleContent | null> {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM article_content WHERE bookmark_id = ? ORDER BY created_at DESC LIMIT 1',
    args: [bookmarkId],
  });

  const row = rows[0] as any;
  if (!row) return null;

  return {
    id: row.id,
    bookmark_id: row.bookmark_id,
    extracted_text: row.extracted_text,
    word_count: row.word_count,
    created_at: row.created_at,
  };
}
