import React from 'react';
import styles from './ReferenceChip.module.css';

interface ReferenceChipProps {
  sourceSection: string;
  sentence: string;
  onJump: (section: string, sentence: string) => void;
}

const ReferenceChip: React.FC<ReferenceChipProps> = ({ sourceSection, sentence, onJump }) => {
  return (
    <button
      className={styles.chip}
      onClick={() => onJump(sourceSection, sentence)}
      title={sentence}
    >
      {sourceSection}
    </button>
  );
};

export default ReferenceChip;
