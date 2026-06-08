import React, { useState, useRef, useCallback } from 'react';
import { cn } from '../../lib/utils';

interface TooltipProps {
  content: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
  children: React.ReactElement;
  className?: string;
}

function Tooltip({ content, side = 'top', sideOffset = 4, children, className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOpen(true), 400);
  }, []);

  const hide = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setOpen(false);
  }, []);

  const positionClass = {
    top: 'bottom-full left-1/2 -translate-x-1/2',
    bottom: 'top-full left-1/2 -translate-x-1/2',
    left: 'right-full top-1/2 -translate-y-1/2',
    right: 'left-full top-1/2 -translate-y-1/2',
  }[side];

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {open && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-50 whitespace-nowrap rounded-[var(--radius-s)] bg-[var(--background-secondary)] px-2 py-1 text-[var(--font-ui-xs)] text-[var(--text-normal)] shadow-[var(--shadow-m)] border border-[var(--background-modifier-border)]',
            positionClass,
            className,
          )}
          style={{
            [side === 'top' || side === 'bottom' ? 'marginBottom' : 'marginRight']:
              `${sideOffset}px`,
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}

export { Tooltip };
