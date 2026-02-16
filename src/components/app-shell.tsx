'use client';

import { useUser, useUserClaims } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { MainHeader } from '@/components/main-header';

const publicPaths = ['/login', '/sign-up'];

function FullScreenLoader() {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading: userLoading } = useUser();
  const { claims, loading: claimsLoading } = useUserClaims();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));

  // The app is loading if we are waiting for the user OR if we are on a private path and waiting for claims.
  const isLoading = userLoading || (!isPublicPath && user && claimsLoading);

  useEffect(() => {
    // Wait until user loading is finished before making routing decisions
    if (userLoading) {
      return;
    }

    // If no user and not on a public path, redirect to login
    if (!user && !isPublicPath) {
      router.push('/login');
    }

    // If user is logged in and on a public path, redirect to home
    if (user && isPublicPath) {
      router.push('/');
    }
  }, [user, userLoading, isPublicPath, router, pathname]);

  // Show loader while loading user/claims, or while redirecting
  if (isLoading || (!user && !isPublicPath) || (user && isPublicPath)) {
    return <FullScreenLoader />;
  }

  // If on a public path and not logged in, show the page (e.g., Login, Sign Up)
  if (isPublicPath && !user) {
    return <>{children}</>;
  }

  // If on a private path and logged in (which means claims are also loaded due to isLoading logic)
  if (!isPublicPath && user) {
    return (
      <div className="flex flex-col min-h-screen">
        <MainHeader />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    );
  }

  // Fallback loader, should not be reached in normal flow
  return <FullScreenLoader />;
}
