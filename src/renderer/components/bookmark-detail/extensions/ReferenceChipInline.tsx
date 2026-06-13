import { createReactInlineContentSpec } from '@blocknote/react';
import React, { useState, useRef, useEffect } from 'react';

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
        const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

        useEffect(() => {
          return () => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
          };
        }, []);

        const handleCopy = async () => {
          try {
            await navigator.clipboard.writeText(sentence);
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            setCopied(true);
            timeoutRef.current = setTimeout(() => setCopied(false), 1500);
          } catch {
            // clipboard not available
          }
        };

        return (
          <span
            onClick={handleCopy}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCopy();
              }
            }}
            title={sentence}
            contentEditable={false}
            role="button"
            tabIndex={0}
            aria-label={`Copy reference from ${sourceSection}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'var(--background-tertiary)',
              border: '1px solid var(--background-modifier-border)',
              borderRadius: '4px',
              padding: '1px 6px',
              fontSize: '11px',
              color: 'var(--text-muted)',
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
