import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-m)] font-medium transition-all duration-[var(--transition-fast)] outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4',
  {
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
    variants: {
      size: {
        default: 'h-9 px-4 py-2 text-[var(--font-ui)]',
        sm: 'h-8 px-3 py-1.5 text-[var(--font-ui-small)] gap-1.5',
        lg: 'h-10 px-5 py-2.5 text-[var(--font-ui-large)]',
        xl: 'h-11 px-6 py-3 text-[var(--font-text)]',
        xs: 'h-7 px-2 py-1 text-[var(--font-ui-xs)] gap-1 rounded-[var(--radius-s)]',
        icon: 'h-9 w-9 p-0',
        'icon-sm': 'h-8 w-8 p-0',
        'icon-lg': 'h-10 w-10 p-0',
        'icon-xl': 'h-11 w-11 p-0',
        'icon-xs': 'h-7 w-7 p-0 rounded-[var(--radius-s)]',
      },
      variant: {
        default:
          'bg-[var(--accent-color)] text-[var(--text-on-accent)] hover:bg-[var(--accent-color-hover)] shadow-[var(--shadow-s)]',
        destructive:
          'bg-[var(--priority-high)] text-white hover:opacity-90 shadow-[var(--shadow-s)]',
        ghost:
          'bg-transparent text-[var(--text-normal)] hover:bg-[var(--background-modifier-hover)]',
        outline:
          'border border-[var(--background-modifier-border)] bg-transparent text-[var(--text-normal)] hover:bg-[var(--background-modifier-hover)]',
        secondary:
          'bg-[var(--background-secondary)] text-[var(--text-normal)] hover:bg-[var(--background-tertiary)]',
        link:
          'text-[var(--accent-color)] underline-offset-4 hover:underline p-0 h-auto',
      },
    },
  },
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ className, size, variant }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
