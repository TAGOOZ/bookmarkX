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
            borderLeft: `3px solid ${color}`,
            padding: '8px 12px',
            margin: '4px 0',
            background: `${color}11`,
            borderRadius: '0 4px 4px 0',
          }}
        >
          <div
            style={{
              fontSize: '14px',
              lineHeight: '1.5',
              color: '#ddd',
              fontStyle: 'italic',
            }}
          >
            "{selectedText}"
          </div>
          {note && (
            <div
              style={{
                marginTop: '6px',
                fontSize: '12px',
                color: '#888',
                borderTop: '1px solid #333',
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
