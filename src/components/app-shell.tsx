'use client';

import { MainHeader } from '@/components/main-header';

export function AppShell({ children }: { children: React.ReactNode }) {
  // All authentication, loading, and redirect logic is now handled by the
  // FirebaseProvider which wraps this component. AppShell can now be a simple
  // layout component.
  return (
    <div className="flex flex-col min-h-screen">
      <MainHeader />
      <main className="flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
