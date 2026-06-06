import { createReactInlineContentSpec } from '@blocknote/react';
import React, { useState } from 'react';

export const createReferenceChipInline = () =>
  createReactInlineContentSpec(
    {
      type: 'referenceChip',
      propSchema: {
        sourceSection: { default: '' },
        sentence: { default: '' },
        sourceId: { default: '' },
      },
      content: 'none',
    },
    {
      render: (props) => {
        const sourceSection = props.inlineContent.props.sourceSection as string;
        const sentence = props.inlineContent.props.sentence as string;
        const [copied, setCopied] = useState(false);

        const handleCopy = async () => {
          try {
            await navigator.clipboard.writeText(sentence);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            // clipboard not available
          }
        };

        return (
          <span
            onClick={handleCopy}
            title={sentence}
            contentEditable={false}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: '#2a2a2a',
              border: '1px solid #444',
              borderRadius: '4px',
              padding: '1px 6px',
              fontSize: '11px',
              color: '#aaa',
              cursor: 'pointer',
              verticalAlign: 'middle',
            }}
          >
            <span style={{ fontSize: '10px' }}>🔗</span>
            <span>{copied ? 'Copied!' : sourceSection}</span>
          </span>
        );
      },
    },
  );
