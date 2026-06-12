import type { PartialBlock } from '@blocknote/core';

type InlineItem = { type: string; text?: string; styles?: Record<string, any>; props?: Record<string, any> };

function serializeInline(content: any): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return String(content);

  return content
    .map((item: InlineItem) => {
      const s = item.styles || {};
      const text = item.text || '';

      if (item.type === 'glossaryTerm') {
        const props = item.props || {};
        return `**${props.term}**: ${props.definition}`;
      }

      if (item.type === 'referenceChip') {
        const props = item.props || {};
        return `[ref: ${props.sourceSection}]`;
      }

      if (s.link) return `[${text}](${s.link})`;
      if (s.bold) return `**${text}**`;
      if (s.italic) return `*${text}*`;
      if (s.code) return `\`${text}\``;
      return text;
    })
    .join('');
}

function isCodeBlock(block: any): boolean {
  return (
    block.type === 'paragraph' &&
    Array.isArray(block.content) &&
    block.content.length === 1 &&
    block.content[0]?.styles?.code
  );
}

function isHorizontalRule(block: any): boolean {
  return (
    block.type === 'paragraph' &&
    Array.isArray(block.content) &&
    block.content.length === 1 &&
    block.content[0]?.text === '---'
  );
}

function serializeArticleReaderBlock(block: any): string {
  const props = block.props || {};
  const lines: string[] = [];

  const ogTitle = props.ogTitle || '';
  const ogDescription = props.ogDescription || '';
  const ogImage = props.ogImage || '';
  const ogSiteName = props.ogSiteName || '';
  const sourceUrl = props.sourceUrl || '';

  if (ogTitle) {
    lines.push(`[${ogTitle}](${sourceUrl || ''})`);
    if (ogSiteName) lines.push(`*${ogSiteName}*`);
    if (ogDescription) lines.push(ogDescription);
    if (ogImage) lines.push(`![OG Image](${ogImage})`);
    if (ogTitle || ogSiteName || ogDescription || ogImage) lines.push('');
  }

  let innerBlocks: any[] = [];
  try {
    innerBlocks = JSON.parse(props.blocksJson || '[]');
  } catch {
    innerBlocks = [];
  }

  if (innerBlocks.length > 0) {
    lines.push(blocksToMarkdown(innerBlocks));
  }

  return lines.join('\n').trim();
}

function serializeDualLangBlock(block: any): string {
  const props = block.props || {};
  const parts: string[] = [];
  if (props.contentEn) parts.push(`**English:** ${props.contentEn}`);
  if (props.contentAr) parts.push(`**Arabic:** ${props.contentAr}`);
  return parts.join('\n\n');
}

interface BlockGroup {
  type: 'heading' | 'para' | 'list-item' | 'code' | 'hr' | 'image' | 'custom' | 'skip';
  text: string;
}

export function blocksToMarkdown(blocks: PartialBlock[]): string {
  const groups: BlockGroup[] = [];

  for (const raw of blocks) {
    const block = raw as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const type = block.type;

    if (type === 'heading') {
      const level = block.props?.level || 1;
      const prefix = '#'.repeat(Math.min(level, 6));
      const text = serializeInline(block.content);
      groups.push({ type: 'heading', text: `${prefix} ${text}` });
      continue;
    }

    if (type === 'paragraph') {
      if (isCodeBlock(block)) {
        const code = block.content[0].text;
        groups.push({ type: 'code', text: `\`\`\`\n${code}\n\`\`\`` });
        continue;
      }
      if (isHorizontalRule(block)) {
        groups.push({ type: 'hr', text: '---' });
        continue;
      }
      groups.push({ type: 'para', text: serializeInline(block.content) });
      continue;
    }

    if (type === 'bulletListItem' || type === 'numberedListItem') {
      const text = serializeInline(block.content);
      let num = 1;
      if (type === 'numberedListItem') {
        const last = groups[groups.length - 1];
        if (last?.type === 'list-item' && /^\d+\.\s/.test(last.text)) {
          const prevNum = parseInt(last.text.match(/^(\d+)\.\s/)?.[1] || '0', 10);
          num = prevNum + 1;
        }
      }
      const prefix = type === 'numberedListItem' ? `${num}.` : '-';
      groups.push({ type: 'list-item', text: `${prefix} ${text}` });
      continue;
    }

    if (type === 'image') {
      const url = block.props?.url || '';
      const alt = block.props?.alt || '';
      groups.push({ type: 'image', text: `![${alt}](${url})` });
      continue;
    }

    if (type === 'dualLang') {
      groups.push({ type: 'custom', text: serializeDualLangBlock(block) });
      continue;
    }

    if (type === 'articleReader') {
      const md = serializeArticleReaderBlock(block);
      if (md) groups.push({ type: 'custom', text: md });
      continue;
    }

    if (type === 'collapsibleArticle') {
      const content = block.props?.content || '';
      if (content) groups.push({ type: 'custom', text: content });
      continue;
    }

    if (type === 'highlight') {
      const props = block.props || {};
      const text = props.selectedText || '';
      const note = props.note || '';
      if (text) {
        let h = `> ${text}`;
        if (note) h += `\n> *Note: ${note}*`;
        groups.push({ type: 'custom', text: h });
      }
      continue;
    }

    if (type === 'chat') {
      groups.push({ type: 'skip', text: '' });
      continue;
    }

    if (type === 'tableHtml') {
      const html = block.props?.html || '';
      if (html) groups.push({ type: 'custom', text: html });
      continue;
    }

    if (type === 'embed') {
      const url = block.props?.url || '';
      if (url) groups.push({ type: 'custom', text: `[Embed: ${url}](${url})` });
      continue;
    }

    if (type === 'video') {
      const url = block.props?.url || '';
      if (url) groups.push({ type: 'custom', text: `[Video: ${url}](${url})` });
      continue;
    }

    if (type === 'audio') {
      const url = block.props?.url || '';
      if (url) groups.push({ type: 'custom', text: `[Audio: ${url}](${url})` });
      continue;
    }
  }

  const parts: string[] = [];
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    if (g.type === 'skip') continue;
    parts.push(g.text);
    if (i < groups.length - 1) {
      const next = groups[i + 1];
      if (next?.type === 'skip') continue;
      if (g.type === 'list-item' && next?.type === 'list-item') {
        continue;
      }
      parts.push('');
    }
  }

  return parts.join('\n');
}
