'use client';

import { MainHeader } from '@/components/main-header';
import { ShortcutSidebar } from '@/components/shortcut-sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      <MainHeader />
      <div className="flex flex-1 overflow-hidden">
        <ShortcutSidebar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}
