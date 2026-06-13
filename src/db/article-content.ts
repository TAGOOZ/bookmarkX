import type { Client } from '@libsql/client';
import type { ArticleContentRow, FtsSearchRow } from './row-types';
import { mapRow } from './row-types';

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

const ARTICLE_CONTENT_FIELDS: (keyof ArticleContentRow)[] = [
  'id', 'bookmark_id', 'extracted_text', 'word_count', 'blocks_json',
  'parser_version', 'content_hash', 'og_title', 'og_description',
  'og_image', 'og_site_name', 'created_at',
];

function computeContentHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export async function createArticleContent(
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
    const existingId = existing.rows[0]['id'] as string;
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
        existingId,
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

  const row = rows[0];
  if (!row) return null;

  const r = mapRow<ArticleContentRow>(row, ARTICLE_CONTENT_FIELDS);
  return {
    id: r.id,
    bookmark_id: r.bookmark_id,
    extracted_text: r.extracted_text,
    word_count: r.word_count,
    blocks_json: r.blocks_json || undefined,
    parser_version: r.parser_version || 1,
    content_hash: r.content_hash || '',
    og_title: r.og_title || undefined,
    og_description: r.og_description || undefined,
    og_image: r.og_image || undefined,
    og_site_name: r.og_site_name || undefined,
    created_at: r.created_at,
  };
}

export function sanitizeFtsQuery(query: string): string {
  // Escape existing double quotes, then wrap in quotes for exact phrase match
  const escaped = query.replace(/"/g, '""');
  return `"${escaped}"`;
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

  return rows.map((row) => {
    const r = mapRow<FtsSearchRow>(row, ['bookmark_id', 'snippet', 'rank']);
    return {
      bookmark_id: r.bookmark_id,
      snippet: r.snippet,
      rank: r.rank,
    };
  });
}
