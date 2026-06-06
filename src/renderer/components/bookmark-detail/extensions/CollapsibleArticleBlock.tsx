import { createReactBlockSpec } from '@blocknote/react';
import { defaultProps } from '@blocknote/core';
import React, { useState } from 'react';

export const createCollapsibleArticleBlock = createReactBlockSpec(
  {
    type: 'collapsibleArticle',
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      content: { default: '' },
      wordCount: { default: 0 },
      isExpanded: { default: false },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const content = props.block.props.content as string;
      const wordCount = props.block.props.wordCount as number;
      const [expanded, setExpanded] = useState(
        () => props.block.props.isExpanded as boolean,
      );

      const toggle = () => {
        const next = !expanded;
        setExpanded(next);
        props.editor.updateBlock(props.block, {
          props: { isExpanded: next },
        });
      };

      return (
        <div
          style={{
            border: '1px solid var(--background-modifier-border)',
            borderRadius: '6px',
            overflow: 'hidden',
          }}
        >
          <button
            onClick={toggle}
            aria-expanded={expanded}
            contentEditable={false}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '8px 12px',
              background: 'var(--background-secondary)',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-normal)',
              fontSize: '13px',
              textAlign: 'left',
            }}
          >
            <span style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
              ▶
            </span>
            <span>Article</span>
            {wordCount > 0 && (
              <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
                {wordCount.toLocaleString()} words
              </span>
            )}
          </button>
          {expanded && (
            <div
              style={{
                padding: '12px',
                maxHeight: '400px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                lineHeight: '1.6',
                fontSize: '14px',
                color: 'var(--text-normal)',
              }}
            >
              {content || 'No article content'}
            </div>
          )}
        </div>
      );
    },
  },
);
