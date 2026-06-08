import React, { useState, useCallback, useRef } from 'react';
import type { SplitDividerProps } from './types';
import styles from './SplitDivider.module.css';

const SplitDivider: React.FC<SplitDividerProps> = ({ onResize, dir }) => {
  const [isDragging, setIsDragging] = useState(false);
  const startRef = useRef<number>(0);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startRef.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const handlePointerMove = (ev: PointerEvent) => {
      const delta = dir === 'rtl'
        ? startRef.current - ev.clientX
        : ev.clientX - startRef.current;
      onResize(delta);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  }, [onResize, dir]);

  return (
    <div
      className={`${styles.divider} ${isDragging ? styles.dividerActive : ''}`}
      onPointerDown={handlePointerDown}
      role="separator"
      aria-orientation="vertical"
    />
  );
};

export default SplitDivider;
