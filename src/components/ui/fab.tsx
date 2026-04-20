import * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label?: string;
  /** Hide on desktop (md+). Default true — FAB is mobile-only by convention. */
  mobileOnly?: boolean;
}

/**
 * Floating Action Button — fixed at the bottom-right, optimized for thumb reach.
 * By default only shows on mobile (<md). Honors iOS safe area insets.
 */
export const Fab = React.forwardRef<HTMLButtonElement, FabProps>(function Fab(
  { icon, label, className, mobileOnly = true, ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      size="lg"
      className={cn(
        'fixed z-40 right-4 rounded-full shadow-xl h-14 w-14 p-0 flex items-center justify-center',
        'bottom-[calc(env(safe-area-inset-bottom)+1rem)]',
        mobileOnly && 'md:hidden',
        className,
      )}
      aria-label={label}
      {...props}
    >
      {icon}
      <span className="sr-only">{label}</span>
    </Button>
  );
});
