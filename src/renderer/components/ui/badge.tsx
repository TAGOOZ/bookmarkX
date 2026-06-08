import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-[var(--radius-s)] border border-transparent font-medium transition-colors outline-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-3',
  {
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
    variants: {
      size: {
        default: 'h-5 min-w-5 px-1.5 text-[var(--font-ui-xs)]',
        sm: 'h-4 min-w-4 px-1 text-[0.625rem]',
        lg: 'h-6 min-w-6 px-2 text-[var(--font-ui-small)]',
      },
      variant: {
        default:
          'bg-[var(--accent-color)] text-[var(--text-on-accent)]',
        destructive:
          'bg-[var(--priority-high)] text-white',
        success:
          'bg-[var(--priority-low)]/15 text-[var(--priority-low)]',
        warning:
          'bg-[var(--priority-medium)]/15 text-[var(--priority-medium)]',
        error:
          'bg-[var(--priority-high)]/15 text-[var(--priority-high)]',
        outline:
          'border-[var(--background-modifier-border)] bg-transparent text-[var(--text-normal)]',
        secondary:
          'bg-[var(--background-tertiary)] text-[var(--text-normal)]',
      },
    },
  },
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ className, size, variant }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
