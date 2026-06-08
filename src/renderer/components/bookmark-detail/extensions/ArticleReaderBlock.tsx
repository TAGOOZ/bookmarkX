import { createReactBlockSpec } from '@blocknote/react';
import { defaultProps } from '@blocknote/core';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useIntl } from 'react-intl';
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

function ImageBlock({ url, alt }: { url: string; alt: string }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className={styles.imageError}>
        <span className={styles.imageErrorIcon}>!</span>
        <span>Image failed to load: {alt || url}</span>
      </div>
    );
  }

  return (
    <figure className={styles.figure}>
      <img
        src={url}
        alt={alt}
        loading="lazy"
        className={styles.image}
        onError={() => setError(true)}
      />
      {alt && <figcaption className={styles.figcaption}>{alt}</figcaption>}
    </figure>
  );
}

function renderBlock(block: any, index: number): React.ReactNode {
  const content = block.content;

  if (block.type === 'heading') {
    const level = block.props?.level || 2;
    const text = renderInline(content);
    if (level === 1) return <h1 key={index} className={styles.heading}>{text}</h1>;
    if (level === 2) return <h2 key={index} className={styles.heading}>{text}</h2>;
    if (level === 3) return <h3 key={index} className={styles.heading}>{text}</h3>;
    if (level === 4) return <h4 key={index} className={styles.heading}>{text}</h4>;
    if (level === 5) return <h5 key={index} className={styles.heading}>{text}</h5>;
    return <h6 key={index} className={styles.heading}>{text}</h6>;
  }

  if (block.type === 'bulletListItem') {
    return <li key={index} className={styles.listItem}>{renderInline(content)}</li>;
  }

  if (block.type === 'numberedListItem') {
    return <li key={index} className={styles.listItem}>{renderInline(content)}</li>;
  }

  if (block.type === 'image') {
    const url = block.props?.url || '';
    const alt = block.props?.alt || '';
    if (!url) return null;
    return (
      <ImageBlock key={index} url={url} alt={alt} />
    );
  }

  if (block.type === 'tableHtml') {
    const html = block.props?.html || '';
    return (
      <div
        key={index}
        className={styles.tableWrapper}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  if (block.type === 'embed') {
    const url = block.props?.url || '';
    return (
      <div key={index} className={styles.embed}>
        <a href={url} target="_blank" rel="noopener noreferrer" className={styles.embedLink}>
          {url}
        </a>
      </div>
    );
  }

  if (block.type === 'video') {
    const url = block.props?.url || '';
    return (
      <div key={index} className={styles.mediaWrapper}>
        <video src={url} controls preload="metadata" className={styles.video}>
          Your browser does not support the video element.
        </video>
      </div>
    );
  }

  if (block.type === 'audio') {
    const url = block.props?.url || '';
    return (
      <div key={index} className={styles.mediaWrapper}>
        <audio src={url} controls preload="metadata" className={styles.audio}>
          Your browser does not support the audio element.
        </audio>
      </div>
    );
  }

  // paragraph or fallback
  if (Array.isArray(content)) {
    const isCode = content.length === 1 && content[0].styles?.code;
    if (isCode) {
      return <pre key={index} className={styles.codeBlock}><code>{content[0].text}</code></pre>;
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
      const intl = useIntl();
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
            <span className={styles.headerTitle}>{intl.formatMessage({ id: 'article' })}</span>
            <span className={styles.headerMeta}>
              {wordCount > 0 && <span>{wordCount.toLocaleString()} {intl.formatMessage({ id: 'words' })}</span>}
              {readingTime > 0 && <span> · {readingTime} {intl.formatMessage({ id: 'minRead' })}</span>}
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
                  : <p className={styles.empty}>{intl.formatMessage({ id: 'noArticleContent' })}</p>}
              </div>
            </div>
          )}
        </div>
      );
    },
  },
);
