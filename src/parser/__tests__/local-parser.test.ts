import { describe, it, expect } from 'vitest';
import { parseHTMLToBlocks } from '../local-parser';

describe('parseHTMLToBlocks', () => {
  it('converts headings to heading blocks', () => {
    const html = '<h1>Title</h1><h2>Subtitle</h2><h3>Section</h3>';
    const blocks = parseHTMLToBlocks(html);
    expect(blocks).toEqual([
      { type: 'heading', props: { level: 1 }, content: 'Title' },
      { type: 'heading', props: { level: 2 }, content: 'Subtitle' },
      { type: 'heading', props: { level: 3 }, content: 'Section' },
    ]);
  });

  it('converts paragraphs to paragraph blocks', () => {
    const html = '<p>First paragraph.</p><p>Second paragraph.</p>';
    const blocks = parseHTMLToBlocks(html);
    expect(blocks).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: 'First paragraph.', styles: {} }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Second paragraph.', styles: {} }] },
    ]);
  });

  it('converts bold and italic inline styles', () => {
    const html = '<p>Text with <strong>bold</strong> and <em>italic</em></p>';
    const blocks = parseHTMLToBlocks(html);
    expect(blocks[0]).toEqual({
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Text with ', styles: {} },
        { type: 'text', text: 'bold', styles: { bold: true } },
        { type: 'text', text: ' and ', styles: {} },
        { type: 'text', text: 'italic', styles: { italic: true } },
      ],
    });
  });

  it('converts inline code', () => {
    const html = '<p>Use <code>console.log()</code> to debug</p>';
    const blocks = parseHTMLToBlocks(html);
    expect(blocks[0]).toEqual({
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Use ', styles: {} },
        { type: 'text', text: 'console.log()', styles: { code: true } },
        { type: 'text', text: ' to debug', styles: {} },
      ],
    });
  });

  it('converts links', () => {
    const html = '<p>Visit <a href="https://example.com">Example</a></p>';
    const blocks = parseHTMLToBlocks(html);
    expect(blocks[0]).toEqual({
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Visit ', styles: {} },
        { type: 'text', text: 'Example', styles: { link: 'https://example.com' } },
      ],
    });
  });

  it('converts unordered lists to bulletListItem blocks', () => {
    const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
    const blocks = parseHTMLToBlocks(html);
    expect(blocks).toEqual([
      { type: 'bulletListItem', content: 'Item 1' },
      { type: 'bulletListItem', content: 'Item 2' },
    ]);
  });

  it('converts ordered lists to numberedListItem blocks', () => {
    const html = '<ol><li>First</li><li>Second</li></ol>';
    const blocks = parseHTMLToBlocks(html);
    expect(blocks).toEqual([
      { type: 'numberedListItem', content: 'First' },
      { type: 'numberedListItem', content: 'Second' },
    ]);
  });

  it('converts pre>code to code-styled paragraph', () => {
    const html = '<pre><code>const x = 1;</code></pre>';
    const blocks = parseHTMLToBlocks(html);
    expect(blocks).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: 'const x = 1;', styles: { code: true } }] },
    ]);
  });

  it('converts blockquote to italic paragraph', () => {
    const html = '<blockquote>A wise quote</blockquote>';
    const blocks = parseHTMLToBlocks(html);
    expect(blocks).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: 'A wise quote', styles: { italic: true } }] },
    ]);
  });

  it('converts img to placeholder paragraph', () => {
    const html = '<img src="photo.jpg" alt="A photo">';
    const blocks = parseHTMLToBlocks(html);
    expect(blocks).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: '[Image: A photo]', styles: { italic: true } }] },
    ]);
  });

  it('converts img without alt to generic placeholder', () => {
    const html = '<img src="photo.jpg">';
    const blocks = parseHTMLToBlocks(html);
    expect(blocks).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: '[Image]', styles: { italic: true } }] },
    ]);
  });

  it('converts table to placeholder paragraph', () => {
    const html = '<table><caption>My Table</caption><tr><td>A</td></tr></table>';
    const blocks = parseHTMLToBlocks(html);
    expect(blocks).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: '[Table: My Table]', styles: { italic: true } }] },
    ]);
  });

  it('converts table without caption', () => {
    const html = '<table><tr><td>A</td></tr></table>';
    const blocks = parseHTMLToBlocks(html);
    expect(blocks).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: '[Table]', styles: { italic: true } }] },
    ]);
  });

  it('converts hr to divider paragraph', () => {
    const html = '<hr>';
    const blocks = parseHTMLToBlocks(html);
    expect(blocks).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: '---', styles: {} }] },
    ]);
  });

  it('skips empty text nodes', () => {
    const html = '<p></p><p>   </p><p>Real content</p>';
    const blocks = parseHTMLToBlocks(html);
    expect(blocks).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: 'Real content', styles: {} }] },
    ]);
  });

  it('handles mixed content in a paragraph', () => {
    const html = '<p>Plain <strong>bold</strong> <a href="http://x.com">link</a> end</p>';
    const blocks = parseHTMLToBlocks(html);
    const content = (blocks[0] as any).content;
    expect(content[0]).toEqual({ type: 'text', text: 'Plain ', styles: {} });
    expect(content[1]).toEqual({ type: 'text', text: 'bold', styles: { bold: true } });
    expect(content.some((i: any) => i.text === 'link' && i.styles?.link === 'http://x.com')).toBe(true);
    expect(content.some((i: any) => i.text.includes('end'))).toBe(true);
  });

  it('returns empty array for empty html', () => {
    expect(parseHTMLToBlocks('')).toEqual([]);
    expect(parseHTMLToBlocks('<html><body></body></html>')).toEqual([]);
  });
});
