import type { Client } from '@libsql/client';

export interface ArticleContentData {
  extracted_text: string;
  word_count: number;
  blocks_json?: string;
  parser_version?: number;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  og_site_name?: string;
}

export interface ArticleContent extends ArticleContentData {
  id: string;
  bookmark_id: string;
  content_hash: string;
  created_at: string;
}

function computeContentHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export async function storeArticleContent(
  db: Client,
  bookmarkId: string,
  data: ArticleContentData,
): Promise<void> {
  const contentHash = computeContentHash(data.extracted_text);

  const existing = await db.execute({
    sql: 'SELECT id FROM article_content WHERE bookmark_id = ? ORDER BY created_at DESC LIMIT 1',
    args: [bookmarkId],
  });

  if (existing.rows.length > 0) {
    await db.execute({
      sql: `UPDATE article_content
            SET extracted_text = ?, word_count = ?, blocks_json = ?, parser_version = ?, content_hash = ?,
                og_title = ?, og_description = ?, og_image = ?, og_site_name = ?
            WHERE id = ?`,
      args: [
        data.extracted_text,
        data.word_count,
        data.blocks_json || null,
        data.parser_version || 1,
        contentHash,
        data.og_title || null,
        data.og_description || null,
        data.og_image || null,
        data.og_site_name || null,
        (existing.rows[0] as any).id,
      ],
    });
  } else {
    const id = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO article_content (id, bookmark_id, extracted_text, word_count, blocks_json, parser_version, content_hash,
                   og_title, og_description, og_image, og_site_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        bookmarkId,
        data.extracted_text,
        data.word_count,
        data.blocks_json || null,
        data.parser_version || 1,
        contentHash,
        data.og_title || null,
        data.og_description || null,
        data.og_image || null,
        data.og_site_name || null,
      ],
    });
  }
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
    blocks_json: row.blocks_json || undefined,
    parser_version: row.parser_version || 1,
    content_hash: row.content_hash || '',
    og_title: row.og_title || undefined,
    og_description: row.og_description || undefined,
    og_image: row.og_image || undefined,
    og_site_name: row.og_site_name || undefined,
    created_at: row.created_at,
  };
}

export function sanitizeFtsQuery(query: string): string {
  return query
    .replace(/[*]/g, '\\*')
    .replace(/[-]/g, '\\-')
    .replace(/["]/g, '""');
}

export async function searchArticleContent(
  db: Client,
  query: string,
  limit = 20,
): Promise<Array<{ bookmark_id: string; snippet: string; rank: number }>> {
  const { rows } = await db.execute({
    sql: `SELECT bookmark_id,
                 snippet(article_content_fts, 0, '<mark>', '</mark>', '...', 32) as snippet,
                 rank
          FROM article_content_fts
          JOIN article_content ON article_content.rowid = article_content_fts.rowid
          WHERE article_content_fts MATCH ?
          ORDER BY rank
          LIMIT ?`,
    args: [sanitizeFtsQuery(query), limit],
  });

  return rows.map((row: any) => ({
    bookmark_id: row.bookmark_id,
    snippet: row.snippet,
    rank: row.rank,
  }));
}
