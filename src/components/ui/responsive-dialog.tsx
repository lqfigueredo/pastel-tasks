import * as React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

/**
 * ResponsiveDialog renders a centered Dialog on desktop and a bottom Drawer on mobile.
 * Use the same shape as Dialog: <ResponsiveDialog open onOpenChange>...
 *   <ResponsiveDialogHeader><ResponsiveDialogTitle/>...</ResponsiveDialogHeader>
 *   {body}
 *   <ResponsiveDialogFooter>...</ResponsiveDialogFooter>
 * </ResponsiveDialog>
 */

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  /** Max width on desktop. Default: max-w-lg */
  contentClassName?: string;
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  children,
  contentClassName,
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent
          className={cn(
            'max-h-[92vh] overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]',
            contentClassName,
          )}
        >
          {children}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-w-lg max-h-[90vh] overflow-y-auto', contentClassName)}>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function ResponsiveDialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const isMobile = useIsMobile();
  return isMobile ? (
    <DrawerHeader className={cn('text-left px-0', className)} {...props} />
  ) : (
    <DialogHeader className={className} {...props} />
  );
}

export function ResponsiveDialogTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  const isMobile = useIsMobile();
  return isMobile ? (
    <DrawerTitle className={className} {...props} />
  ) : (
    <DialogTitle className={className} {...props} />
  );
}

export function ResponsiveDialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  const isMobile = useIsMobile();
  return isMobile ? (
    <DrawerDescription className={className} {...props} />
  ) : (
    <DialogDescription className={className} {...props} />
  );
}

export function ResponsiveDialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const isMobile = useIsMobile();
  return isMobile ? (
    <DrawerFooter className={cn('px-0', className)} {...props} />
  ) : (
    <DialogFooter className={className} {...props} />
  );
}
