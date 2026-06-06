import React, { useState } from 'react';
import styles from './GlossarySection.module.css';

interface Term {
  term: string;
  definition: string;
}

interface GlossarySectionProps {
  terms?: Term[];
  onAddTerm?: (term: string, definition: string) => void;
}

const GlossarySection: React.FC<GlossarySectionProps> = ({ terms = [], onAddTerm }) => {
  const [newTerm, setNewTerm] = useState('');
  const [newDef, setNewDef] = useState('');

  if (terms.length === 0 && !onAddTerm) return null;

  const handleAdd = () => {
    if (newTerm.trim() && newDef.trim() && onAddTerm) {
      onAddTerm(newTerm.trim(), newDef.trim());
      setNewTerm('');
      setNewDef('');
    }
  };

  return (
    <div className={styles.container}>
      {terms.length > 0 && (
        <dl className={styles.list}>
          {terms.map((t) => (
            <div key={t.term} className={styles.term}>
              <dt className={styles.termName}>{t.term}</dt>
              <dd className={styles.termDef}>{t.definition}</dd>
            </div>
          ))}
        </dl>
      )}
      {onAddTerm && (
        <div className={styles.addForm}>
          <input
            className={styles.input}
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
            placeholder="Term"
            aria-label="New term"
          />
          <input
            className={styles.input}
            value={newDef}
            onChange={(e) => setNewDef(e.target.value)}
            placeholder="Definition"
            aria-label="New definition"
          />
          <button className={styles.addBtn} onClick={handleAdd} disabled={!newTerm.trim() || !newDef.trim()}>
            Add
          </button>
        </div>
      )}
    </div>
  );
};

export default GlossarySection;
