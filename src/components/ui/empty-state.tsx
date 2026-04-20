import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon: Icon, title, description, action, className, compact }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-6 px-3' : 'py-12 px-6',
        className,
      )}
    >
      <div
        className={cn(
          'mb-4 flex items-center justify-center rounded-full bg-muted/40',
          compact ? 'h-10 w-10' : 'h-14 w-14',
        )}
      >
        <Icon className={cn('text-muted-foreground', compact ? 'h-5 w-5' : 'h-7 w-7')} />
      </div>
      <h3 className={cn('font-semibold text-foreground', compact ? 'text-sm' : 'text-base')}>
        {title}
      </h3>
      {description && (
        <p className={cn('mt-1 max-w-sm text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>
          {description}
        </p>
      )}
      {action && (
        <Button
          size={compact ? 'sm' : 'default'}
          variant="outline"
          onClick={action.onClick}
          className="mt-4"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
