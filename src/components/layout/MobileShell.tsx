import { ReactNode } from 'react';
import { MobileTopBar } from './MobileTopBar';
import { MobileBottomNav } from './MobileBottomNav';

interface Props {
  pageTitle?: string;
  onOpenSearch: () => void;
  children: ReactNode;
}

export function MobileShell({ pageTitle, onOpenSearch, children }: Props) {
  return (
    <div className="min-h-screen flex flex-col w-full bg-background">
      <MobileTopBar pageTitle={pageTitle} onOpenSearch={onOpenSearch} />
      <main
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
      >
        {children}
      </main>
      <MobileBottomNav />
    </div>
  );
}
