'use client';

import { usePathname } from 'next/navigation';
import { AppShell } from '@/components/app-shell';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const publicPaths = ['/login', '/sign-up'];
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));

  if (isPublicPath) {
    // For public pages like login/signup, we don't want the main AppShell.
    // The FirebaseProvider handles redirects, so we'll only get here
    // if the user is unauthenticated.
    return <>{children}</>;
  }

  // For all other pages, wrap the content in the AppShell.
  return <AppShell>{children}</AppShell>;
}
