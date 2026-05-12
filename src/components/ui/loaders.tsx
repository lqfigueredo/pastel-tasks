import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface PageLoaderProps {
  label?: string;
  className?: string;
}

/** Loader de tela cheia centralizado. Use em rotas/páginas inteiras carregando. */
export function PageLoader({ className }: PageLoaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-20',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
    </div>
  );
}

interface InlineLoaderProps {
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

/** Loader pequeno inline. Use dentro de botões, seções pequenas e fallbacks de Suspense. */
export function InlineLoader({ label, className, size = 'md' }: InlineLoaderProps) {
  return (
    <div
      className={cn('flex items-center justify-center gap-2 py-6', className)}
      role="status"
      aria-live="polite"
    >
      <Loader2
        className={cn(
          'animate-spin text-muted-foreground',
          size === 'sm' ? 'h-4 w-4' : 'h-5 w-5',
        )}
        aria-hidden
      />
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </div>
  );
}

interface ListSkeletonProps {
  rows?: number;
  className?: string;
  variant?: 'list' | 'card' | 'table';
}

/** Skeleton genérico para listas. Use enquanto dados primários carregam. */
export function ListSkeleton({ rows = 5, className, variant = 'list' }: ListSkeletonProps) {
  if (variant === 'card') {
    return (
      <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-3', className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-3 pt-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={cn('rounded-lg border border-border overflow-hidden', className)}>
        <div className="border-b border-border bg-muted/30 px-4 py-3">
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
