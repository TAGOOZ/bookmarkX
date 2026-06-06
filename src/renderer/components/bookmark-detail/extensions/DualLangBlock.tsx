import { createReactBlockSpec } from '@blocknote/react';
import { defaultProps } from '@blocknote/core';
import React from 'react';

export const createDualLangBlock = createReactBlockSpec(
  {
    type: 'dualLang',
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      contentEn: { default: '' },
      contentAr: { default: '' },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const contentEn = props.block.props.contentEn as string;
      const contentAr = props.block.props.contentAr as string;

      return (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            padding: '8px 0',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                marginBottom: '4px',
              }}
              contentEditable={false}
            >
              English
            </div>
            <div
              style={{ direction: 'ltr', minHeight: '24px' }}
            >
              {contentEn || <span style={{ color: 'var(--text-faint)' }}>No English summary</span>}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                marginBottom: '4px',
              }}
              contentEditable={false}
            >
              العربية
            </div>
            <div
              style={{ direction: 'rtl', minHeight: '24px' }}
            >
              {contentAr || <span style={{ color: 'var(--text-faint)' }}>لا يوجد ملخص عربي</span>}
            </div>
          </div>
        </div>
      );
    },
  },
);
