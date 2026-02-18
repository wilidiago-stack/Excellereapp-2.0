'use client';

import { usePathname, useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { useAuth } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const publicPaths = ['/login', '/sign-up'];
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));

  // Automatic redirection if not authenticated and not a public route
  useEffect(() => {
    if (!loading && !user && !isPublicPath) {
      router.push('/login');
    }
  }, [loading, user, isPublicPath, router]);

  // While Firebase is initializing the authentication state,
  // we show a loading state to avoid requests with auth: null.
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Starting secure session...</p>
      </div>
    );
  }

  if (isPublicPath) {
    return <>{children}</>;
  }

  // If no user and not a public route, we render nothing (useEffect will redirect)
  if (!user) {
    return null;
  }

  // For all other pages, wrap content in AppShell.
  return <AppShell>{children}</AppShell>;
}
