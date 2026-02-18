'use client';

import { MainHeader } from '@/components/main-header';
import { ShortcutSidebar } from '@/components/shortcut-sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <MainHeader />
      <div className="flex flex-1 overflow-hidden">
        <ShortcutSidebar />
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
