// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { sanitizeTableHtml } from '../ArticleReaderBlock';
import { sanitizeSnippet } from '../../../SearchOverlay';

describe('sanitizeTableHtml', () => {
  it('strips onerror event handler from img tag', () => {
    const html = '<table><tr><td><img onerror="alert(1)" src="x"></td></tr></table>';
    const result = sanitizeTableHtml(html);
    expect(result).not.toContain('onerror');
    expect(result).toContain('img');
  });

  it('strips javascript: URIs', () => {
    const html = '<a href="javascript:alert(1)">link</a>';
    const result = sanitizeTableHtml(html);
    expect(result).not.toContain('javascript:');
    expect(result).toContain('a');
  });

  it('preserves safe table HTML', () => {
    const result = sanitizeTableHtml('<table><tr><td>safe</td></tr></table>');
    expect(result).toContain('<table>');
    expect(result).toContain('<td>safe</td>');
    expect(result).toContain('</table>');
  });
});

describe('sanitizeSnippet', () => {
  it('strips all tags except mark', () => {
    const input = '<mark>term</mark><script>alert(1)</script>';
    const result = sanitizeSnippet(input);
    expect(result).toContain('<mark>term</mark>');
    expect(result).not.toContain('<script>');
  });

  it('preserves mark tags', () => {
    const input = '<mark>highlighted</mark>';
    const result = sanitizeSnippet(input);
    expect(result).toBe('<mark>highlighted</mark>');
  });
});