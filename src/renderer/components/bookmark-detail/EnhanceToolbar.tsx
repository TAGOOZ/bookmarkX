import React from 'react';
import styles from './EnhanceToolbar.module.css';

interface EnhanceToolbarProps {
  visible: boolean;
  onEnhance: () => void;
  position: { top: number; left: number };
}

const EnhanceToolbar: React.FC<EnhanceToolbarProps> = ({ visible, onEnhance, position }) => {
  if (!visible) return null;

  return (
    <div
      className={styles.toolbar}
      style={{ top: position.top, left: position.left }}
    >
      <button className={styles.btn} onClick={onEnhance}>
        Enhance
      </button>
    </div>
  );
};

export default EnhanceToolbar;
