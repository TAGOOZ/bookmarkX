import { createReactBlockSpec } from '@blocknote/react';
import { defaultProps } from '@blocknote/core';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import styles from './ArticleReaderBlock.module.css';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface InlineItem {
  type: string;
  text: string;
  styles?: Record<string, any>;
}

function renderInline(items: InlineItem[]): React.ReactNode {
  if (!Array.isArray(items)) return items;
  return items.map((item, i) => {
    const s = item.styles || {};
    let el: React.ReactNode = item.text;
    if (s.bold) el = <strong>{el}</strong>;
    if (s.italic) el = <em>{el}</em>;
    if (s.code) el = <code className={styles.inlineCode}>{el}</code>;
    if (s.link) el = <a href={s.link} target="_blank" rel="noopener noreferrer" className={styles.link}>{el}</a>;
    return <React.Fragment key={i}>{el}</React.Fragment>;
  });
}

function renderBlock(block: any, index: number): React.ReactNode {
  const content = block.content;

  if (block.type === 'heading') {
    const level = block.props?.level || 2;
    const text = renderInline(content);
    if (level === 1) return <h1 key={index} className={styles.heading}>{text}</h1>;
    if (level === 2) return <h2 key={index} className={styles.heading}>{text}</h2>;
    return <h3 key={index} className={styles.heading}>{text}</h3>;
  }

  if (block.type === 'bulletListItem') {
    return <li key={index} className={styles.listItem}>{renderInline(content)}</li>;
  }

  if (block.type === 'numberedListItem') {
    return <li key={index} className={styles.listItem}>{renderInline(content)}</li>;
  }

  // paragraph or fallback
  if (Array.isArray(content)) {
    const isCode = content.length === 1 && content[0].styles?.code;
    if (isCode) {
      return <pre key={index} className={styles.codeBlock}><code>{content[0].text}</code></pre>;
    }
    const isImage = content.length === 1 && content[0].styles?.italic && content[0].text?.startsWith('[Image');
    if (isImage) {
      return <p key={index} className={styles.imagePlaceholder}>{content[0].text}</p>;
    }
    const isTable = content.length === 1 && content[0].styles?.italic && content[0].text?.startsWith('[Table');
    if (isTable) {
      return <p key={index} className={styles.imagePlaceholder}>{content[0].text}</p>;
    }
    const isDivider = content.length === 1 && content[0].text === '---';
    if (isDivider) {
      return <hr key={index} className={styles.divider} />;
    }
    const isBlockquote = content.length === 1 && content[0].styles?.italic && !content[0].text?.startsWith('[');
    if (isBlockquote) {
      return <blockquote key={index} className={styles.blockquote}>{content[0].text}</blockquote>;
    }
    return <p key={index} className={styles.paragraph}>{renderInline(content)}</p>;
  }

  if (typeof content === 'string') {
    return <p key={index} className={styles.paragraph}>{content}</p>;
  }

  return null;
}

export const createArticleReaderBlock = createReactBlockSpec(
  {
    type: 'articleReader',
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      blocksJson: { default: '[]' },
      wordCount: { default: 0 },
      readingTime: { default: 0 },
      sourceUrl: { default: '' },
      isExpanded: { default: false },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const blocksJson = props.block.props.blocksJson as string;
      const wordCount = props.block.props.wordCount as number;
      const readingTime = props.block.props.readingTime as number;
      const sourceUrl = props.block.props.sourceUrl as string;
      const [expanded, setExpanded] = useState(
        () => props.block.props.isExpanded as boolean,
      );
      const bodyRef = useRef<HTMLDivElement>(null);

      const toggle = useCallback(() => {
        const next = !expanded;
        setExpanded(next);
        props.editor.updateBlock(props.block, {
          props: { isExpanded: next },
        });
      }, [expanded, props]);

      useEffect(() => {
        if (!expanded || !bodyRef.current) return;
        const codes = bodyRef.current.querySelectorAll('pre code');
        codes.forEach((el) => hljs.highlightElement(el as HTMLElement));
      }, [expanded, blocksJson]);

      let blocks: any[] = [];
      try {
        blocks = JSON.parse(blocksJson);
      } catch {
        blocks = [];
      }

      return (
        <div className={styles.container}>
          <button
            onClick={toggle}
            aria-expanded={expanded}
            contentEditable={false}
            className={styles.header}
          >
            <span className={styles.chevron} data-expanded={expanded}>
              ▶
            </span>
            <span className={styles.headerTitle}>Article</span>
            <span className={styles.headerMeta}>
              {wordCount > 0 && <span>{wordCount.toLocaleString()} words</span>}
              {readingTime > 0 && <span> · {readingTime} min read</span>}
            </span>
          </button>
          {expanded && (
            <div className={styles.body} ref={bodyRef}>
              {sourceUrl && (
                <div className={styles.sourceUrl}>
                  <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                    {sourceUrl}
                  </a>
                </div>
              )}
              <div className={styles.content}>
                {blocks.length > 0
                  ? blocks.map((block, i) => renderBlock(block, i))
                  : <p className={styles.empty}>No article content</p>}
              </div>
            </div>
          )}
        </div>
      );
    },
  },
);
