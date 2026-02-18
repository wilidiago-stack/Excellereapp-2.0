'use client';

import { usePathname, useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { useAuth } from '@/firebase';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { APP_MODULES } from '@/lib/modules';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { signOut } from 'firebase/auth';
import { useAuthInstance } from '@/firebase';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, role, assignedModules } = useAuth();
  const auth = useAuthInstance();
  const pathname = usePathname();
  const router = useRouter();
  const publicPaths = ['/login', '/sign-up'];
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));

  const [isRestricted, setIsRestricted] = useState(false);

  // Automatic redirection if not authenticated and not a public route
  useEffect(() => {
    if (!loading && !user && !isPublicPath) {
      router.push('/login');
    }
  }, [loading, user, isPublicPath, router]);

  // Access Control Logic
  useEffect(() => {
    if (loading || !user || isPublicPath) return;

    const isAdmin = role === 'admin';
    
    // 1. If user is a Viewer and has NO assigned modules, they are restricted.
    if (role === 'viewer' && (!assignedModules || assignedModules.length === 0)) {
      setIsRestricted(true);
      return;
    }

    // 2. Check if the current route belongs to a module the user DOES NOT have.
    // Dashboard (/) is always allowed if they have at least one module, or if they are admin.
    if (pathname === '/') {
      setIsRestricted(false);
      return;
    }

    const currentModule = APP_MODULES.find(m => pathname.startsWith(m.href) && m.href !== '/');
    if (currentModule && !isAdmin && !assignedModules?.includes(currentModule.id)) {
      setIsRestricted(true);
    } else {
      setIsRestricted(false);
    }
  }, [loading, user, isPublicPath, role, assignedModules, pathname]);

  const handleLogout = () => {
    if (auth) {
      signOut(auth).then(() => {
        router.push('/login');
        setIsRestricted(false);
      });
    }
  };

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

  if (!user) {
    return null;
  }

  return (
    <>
      <AppShell>{children}</AppShell>
      
      <AlertDialog open={isRestricted}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader className="items-center text-center">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl">Access Restricted</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              You do not have permission to view this module or your account has not been configured yet.
              <br /><br />
              <span className="font-semibold text-foreground">Please contact the administrator</span> to request access to the required modules.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction onClick={handleLogout}>
              Return to Login
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
