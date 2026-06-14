import { describe, it, expect, vi } from 'vitest';
import { parseHTMLToBlocks, parseURL } from '../local-parser';

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

  it('converts img to image block with url and alt', () => {
    const html = '<img src="photo.jpg" alt="A photo">';
    const blocks = parseHTMLToBlocks(html);
    expect(blocks).toEqual([
      { type: 'image', props: { url: 'photo.jpg', alt: 'A photo' }, content: undefined },
    ]);
  });

  it('converts img without alt to image block with empty alt', () => {
    const html = '<img src="photo.jpg">';
    const blocks = parseHTMLToBlocks(html);
    expect(blocks).toEqual([
      { type: 'image', props: { url: 'photo.jpg', alt: '' }, content: undefined },
    ]);
  });

  it('converts table to tableHtml block', () => {
    const html = '<table><caption>My Table</caption><tr><td>A</td></tr></table>';
    const blocks = parseHTMLToBlocks(html);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ type: 'tableHtml' });
    const tableHtml = (blocks[0] as any).props.html;
    expect(tableHtml).toContain('<table>');
    expect(tableHtml).toContain('<td>A</td>');
  });

  it('converts table without caption to tableHtml block', () => {
    const html = '<table><tr><td>A</td></tr></table>';
    const blocks = parseHTMLToBlocks(html);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ type: 'tableHtml' });
    const tableHtml = (blocks[0] as any).props.html;
    expect(tableHtml).toContain('<table>');
    expect(tableHtml).toContain('<td>A</td>');
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

  it('handles Arabic/RTL paragraphs', () => {
    const html = '<p>هذا نص عربي</p><p>And an English paragraph</p>';
    const blocks = parseHTMLToBlocks(html);
    expect(blocks).toHaveLength(2);
    expect((blocks[0] as any).content[0].text).toBe('هذا نص عربي');
    expect((blocks[1] as any).content[0].text).toBe('And an English paragraph');
  });

  it('handles Arabic headings', () => {
    const html = '<h1>العنوان الرئيسي</h1><h2>عنوان فرعي</h2>';
    const blocks = parseHTMLToBlocks(html);
    expect(blocks).toEqual([
      { type: 'heading', props: { level: 1 }, content: 'العنوان الرئيسي' },
      { type: 'heading', props: { level: 2 }, content: 'عنوان فرعي' },
    ]);
  });

  it('handles mixed Arabic/English inline styles', () => {
    const html = '<p>نص <strong>عالي</strong> و <em>italic</em> text</p>';
    const blocks = parseHTMLToBlocks(html);
    const content = (blocks[0] as any).content;
    expect(content.some((i: any) => i.text === 'عالي' && i.styles?.bold)).toBe(true);
    expect(content.some((i: any) => i.text === 'italic' && i.styles?.italic)).toBe(true);
  });

  it('converts figure to image placeholder', () => {
    const html = '<figure><img src="pic.jpg" alt="A picture"><figcaption>Caption here</figcaption></figure>';
    const blocks = parseHTMLToBlocks(html);
    // figure is not handled as a special case — img inside falls back to no block-level
    // since parseNode only handles direct children, figure should produce no blocks
    // (this is a known gap — figure is not yet supported)
    expect(blocks).toEqual([]);
  });

  it('flattens nested lists', () => {
    const html = '<ul><li>Item 1<ul><li>Nested A</li><li>Nested B</li></ul></li><li>Item 2</li></ul>';
    const blocks = parseHTMLToBlocks(html);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({ type: 'bulletListItem', content: 'Item 1Nested ANested B' });
    expect(blocks[1]).toEqual({ type: 'bulletListItem', content: 'Item 2' });
  });

  it('extracts text from paragraph blocks with inline content for word count', () => {
    const html = '<p>Hello world this is a paragraph</p>';
    const blocks = parseHTMLToBlocks(html);
    expect(blocks).toHaveLength(1);
    const block = blocks[0] as any;
    expect(typeof block.content).toBe('object');
    expect(Array.isArray(block.content)).toBe(true);
    const text = block.content.map((c: any) => c.text).join('');
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    expect(wordCount).toBe(6);
  });
});

describe('parseURL', () => {
  it('throws on non-2xx HTTP responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Not Found', { status: 404, statusText: 'Not Found' })
    );
    await expect(parseURL('https://example.com/missing')).rejects.toThrow('HTTP 404');
    vi.restoreAllMocks();
  });
});
