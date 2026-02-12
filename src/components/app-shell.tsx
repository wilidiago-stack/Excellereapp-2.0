'use client';

import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { MainHeader } from '@/components/main-header';

const publicPaths = ['/login', '/sign-up'];

function FullScreenLoader() {
    return (
        <div className="flex h-screen w-screen items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
    )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicPath = publicPaths.some(p => pathname.startsWith(p));

  useEffect(() => {
    if (loading) {
      return; 
    }

    if (!user && !isPublicPath) {
      router.push('/login');
    }

    if (user && isPublicPath) {
      router.push('/');
    }
  }, [user, loading, isPublicPath, router, pathname]);

  if (loading || (!user && !isPublicPath) || (user && isPublicPath)) {
    return <FullScreenLoader />;
  }

  if (isPublicPath && !user) {
    return <>{children}</>;
  }

  if (!isPublicPath && user) {
    return (
        <div className="flex flex-col min-h-screen">
            <MainHeader />
            <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
    );
  }
  
  return <FullScreenLoader />;
}
