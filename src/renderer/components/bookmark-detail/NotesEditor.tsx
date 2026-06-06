import React from 'react';
import styles from './NotesEditor.module.css';

interface NotesEditorProps {
  content: string;
  onChange: (content: string) => void;
}

const NotesEditor: React.FC<NotesEditorProps> = ({ content, onChange }) => {
  return (
    <div className={styles.container}>
      <textarea
        className={styles.textarea}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write your notes here..."
        aria-label="Notes"
      />
    </div>
  );
};

export default NotesEditor;
