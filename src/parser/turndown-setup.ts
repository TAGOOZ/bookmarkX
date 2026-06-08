import TurndownService from 'turndown';

export function createTurndownService(): TurndownService {
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
    strongDelimiter: '**',
  });

  td.addRule('iframe', {
    filter: 'iframe',
    replacement: (_content: string, node: TurndownService.Node) => {
      const src = (node as HTMLElement).getAttribute('src') || '';
      if (!src) return '';
      return `[Embed: ${src}](${src})`;
    },
  });

  td.addRule('video', {
    filter: 'video',
    replacement: (_content: string, node: TurndownService.Node) => {
      const el = node as HTMLElement;
      const src = el.getAttribute('src') || el.querySelector('source')?.getAttribute('src') || '';
      if (!src) return '';
      return `[Video: ${src}](${src})`;
    },
  });

  td.addRule('audio', {
    filter: 'audio',
    replacement: (_content: string, node: TurndownService.Node) => {
      const el = node as HTMLElement;
      const src = el.getAttribute('src') || el.querySelector('source')?.getAttribute('src') || '';
      if (!src) return '';
      return `[Audio: ${src}](${src})`;
    },
  });

  td.addRule('figure', {
    filter: 'figure',
    replacement: (content: string) => {
      return content.trim();
    },
  });

  td.addRule('figcaption', {
    filter: 'figcaption',
    replacement: (content: string) => {
      return `\n*${content.trim()}*\n`;
    },
  });

  td.addRule('removeNavAndFooter', {
    filter: ['nav', 'footer', 'header', 'aside', 'noscript', 'script', 'style'],
    replacement: () => '',
  });

  return td;
}
