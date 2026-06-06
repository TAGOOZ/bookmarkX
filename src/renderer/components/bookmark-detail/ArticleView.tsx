import React, { useState } from 'react';
import styles from './ArticleView.module.css';

interface ArticleViewProps {
  content: string;
  defaultCollapsed?: boolean;
}

const ArticleView: React.FC<ArticleViewProps> = ({ content, defaultCollapsed = false }) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  if (!content) return null;

  return (
    <div className={styles.container}>
      <button
        className={styles.toggle}
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
      >
        {collapsed ? 'Show article' : 'Hide article'}
      </button>
      {!collapsed && (
        <div
          className={styles.content}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )}
    </div>
  );
};

export default ArticleView;
