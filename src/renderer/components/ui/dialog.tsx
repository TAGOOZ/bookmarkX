import React, { useEffect, useRef, useCallback } from 'react';
import { cn } from '../../lib/utils';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

function Dialog({ open, onClose, children, className }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleGlobalKey);
    return () => document.removeEventListener('keydown', handleGlobalKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      containerRef.current?.querySelector<HTMLElement>('input, button')?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        className={cn(
          'bg-[var(--background-secondary)] rounded-[var(--radius-l)] border border-[var(--background-modifier-border)] shadow-[var(--shadow-l)] max-h-[80vh] overflow-y-auto scrollbar-thin',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

function DialogHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between px-6 pt-6 pb-4', className)}>
      {children}
    </div>
  );
}

function DialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn('text-[1.5rem] font-bold text-[var(--text-normal)]', className)}>
      {children}
    </h2>
  );
}

function DialogClose({ onClose, className }: { onClose: () => void; className?: string }) {
  return (
    <button
      onClick={onClose}
      className={cn(
        'text-[var(--text-muted)] hover:text-[var(--text-normal)] text-xl transition-colors bg-transparent border-none cursor-pointer',
        className,
      )}
      aria-label="Close"
    >
      ×
    </button>
  );
}

function DialogContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-6 pb-6', className)}>
      {children}
    </div>
  );
}

export { Dialog, DialogHeader, DialogTitle, DialogClose, DialogContent };
