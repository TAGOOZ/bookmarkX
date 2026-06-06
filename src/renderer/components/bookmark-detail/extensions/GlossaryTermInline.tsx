import { createReactInlineContentSpec } from '@blocknote/react';
import React, { useState } from 'react';

export const createGlossaryTermInline = () =>
  createReactInlineContentSpec(
    {
      type: 'glossaryTerm',
      propSchema: {
        term: { default: '' },
        definition: { default: '' },
      },
      content: 'none',
    },
    {
      render: (props) => {
        const term = props.inlineContent.props.term as string;
        const definition = props.inlineContent.props.definition as string;
        const [showTooltip, setShowTooltip] = useState(false);

        return (
          <span
            style={{
              borderBottom: '1px dashed #5b9bd5',
              cursor: 'help',
              position: 'relative',
              color: '#5b9bd5',
            }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            {term}
            {showTooltip && definition && (
              <span
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#1a1a1a',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  color: '#ddd',
                  whiteSpace: 'nowrap',
                  maxWidth: '250px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  zIndex: 1000,
                  pointerEvents: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                {definition}
              </span>
            )}
          </span>
        );
      },
    },
  );
