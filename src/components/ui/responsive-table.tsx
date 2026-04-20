import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/**
 * ResponsiveTable: renders a normal <table> on >=md screens and a stacked
 * card list on smaller screens, using the same column definitions.
 *
 * Usage:
 *   <ResponsiveTable
 *     data={items}
 *     keyExtractor={(it) => it.id}
 *     columns={[
 *       { id: 'name', header: 'Nome', cell: (it) => it.name, primary: true },
 *       { id: 'status', header: 'Status', cell: (it) => <Badge/>, mobileLabel: 'Status' },
 *       { id: 'actions', header: 'Ações', cell: (it) => <Buttons/>, align: 'right', mobileFooter: true },
 *     ]}
 *     onRowClick={(it) => ...}
 *   />
 */

export interface ResponsiveColumn<T> {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  /** When true, this column is the title shown at top of mobile card. */
  primary?: boolean;
  /** When true, rendered as a footer block (e.g. actions row). */
  mobileFooter?: boolean;
  /** Hide on mobile entirely. */
  hideOnMobile?: boolean;
  /** Hide on desktop entirely. */
  hideOnDesktop?: boolean;
  /** Override label shown on mobile card instead of `header`. */
  mobileLabel?: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
  headClassName?: string;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: ResponsiveColumn<T>[];
  keyExtractor: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
  className?: string;
  rowClassName?: (row: T) => string | undefined;
}

export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  emptyState,
  className,
  rowClassName,
}: ResponsiveTableProps<T>) {
  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  const desktopCols = columns.filter((c) => !c.hideOnDesktop);
  const mobileCols = columns.filter((c) => !c.hideOnMobile);
  const primaryCol = mobileCols.find((c) => c.primary) ?? mobileCols[0];
  const footerCols = mobileCols.filter((c) => c.mobileFooter);
  const bodyCols = mobileCols.filter((c) => c !== primaryCol && !c.mobileFooter);

  return (
    <>
      {/* Desktop table */}
      <div className={cn('hidden md:block rounded-lg border overflow-x-auto', className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {desktopCols.map((c) => (
                <TableHead
                  key={c.id}
                  className={cn(
                    c.align === 'right' && 'text-right',
                    c.align === 'center' && 'text-center',
                    c.headClassName,
                  )}
                >
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, i) => (
              <TableRow
                key={keyExtractor(row, i)}
                className={cn(onRowClick && 'cursor-pointer', rowClassName?.(row))}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {desktopCols.map((c) => (
                  <TableCell
                    key={c.id}
                    className={cn(
                      c.align === 'right' && 'text-right',
                      c.align === 'center' && 'text-center',
                      c.className,
                    )}
                  >
                    {c.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className={cn('md:hidden space-y-3', className)}>
        {data.map((row, i) => (
          <div
            key={keyExtractor(row, i)}
            className={cn(
              'rounded-lg border bg-card p-4 shadow-sm',
              onRowClick && 'cursor-pointer active:bg-accent/40 transition-colors',
              rowClassName?.(row),
            )}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            {primaryCol && (
              <div className="mb-2 text-base font-semibold text-foreground">
                {primaryCol.cell(row)}
              </div>
            )}
            {bodyCols.length > 0 && (
              <dl className="grid grid-cols-1 gap-1.5 text-sm">
                {bodyCols.map((c) => (
                  <div key={c.id} className="flex items-start justify-between gap-3">
                    <dt className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
                      {c.mobileLabel ?? c.header}
                    </dt>
                    <dd className="text-right text-sm text-foreground">{c.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            )}
            {footerCols.length > 0 && (
              <div
                className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-border/40 pt-3"
                onClick={(e) => e.stopPropagation()}
              >
                {footerCols.map((c) => (
                  <div key={c.id}>{c.cell(row)}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
