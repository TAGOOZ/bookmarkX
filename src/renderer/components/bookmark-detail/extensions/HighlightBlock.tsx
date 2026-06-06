import { createReactBlockSpec } from '@blocknote/react';
import { defaultProps } from '@blocknote/core';
import React from 'react';

export const createHighlightBlock = createReactBlockSpec(
  {
    type: 'highlight',
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      selectedText: { default: '' },
      note: { default: '' },
      color: { default: '#e69819' },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const selectedText = props.block.props.selectedText as string;
      const note = props.block.props.note as string;
      const color = props.block.props.color as string;

      return (
        <div
          contentEditable={false}
          style={{
            padding: '8px 12px',
            margin: '4px 0',
            background: `${color}15`,
            borderRadius: 'var(--radius-m)',
          }}
        >
          <div
            style={{
              fontSize: 'var(--font-text)',
              lineHeight: '1.5',
              color: 'var(--text-normal)',
              fontStyle: 'italic',
            }}
          >
            "{selectedText}"
          </div>
          {note && (
            <div
              style={{
                marginTop: '6px',
                fontSize: 'var(--font-ui-small)',
                color: 'var(--text-muted)',
                borderTop: '1px solid var(--background-modifier-border)',
                paddingTop: '6px',
              }}
            >
              Note: {note}
            </div>
          )}
        </div>
      );
    },
  },
);
