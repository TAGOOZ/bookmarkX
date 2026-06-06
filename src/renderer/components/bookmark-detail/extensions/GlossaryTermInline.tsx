import { createReactInlineContentSpec } from '@blocknote/react';
import React, { useId, useState } from 'react';

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
        const tooltipId = useId();

        return (
          <span
            style={{
              borderBottom: '1px dashed var(--accent-color)',
              cursor: 'help',
              position: 'relative',
              color: 'var(--accent-color)',
            }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            role="button"
            tabIndex={0}
            onFocus={() => setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
            aria-describedby={showTooltip ? tooltipId : undefined}
          >
            {term}
            {showTooltip && definition && (
              <span
                id={tooltipId}
                role="tooltip"
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--background-secondary)',
                  border: '1px solid var(--background-modifier-border)',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  color: 'var(--text-normal)',
                  whiteSpace: 'nowrap',
                  maxWidth: '250px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  zIndex: 1000,
                  pointerEvents: 'none',
                  boxShadow: 'var(--shadow-m)',
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
