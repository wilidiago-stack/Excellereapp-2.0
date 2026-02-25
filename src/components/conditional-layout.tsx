'use client';

import { usePathname, useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { useAuth, useAuthInstance } from '@/firebase';
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

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, role, assignedModules } = useAuth();
  const auth = useAuthInstance();
  const pathname = usePathname();
  const router = useRouter();
  const publicPaths = ['/login', '/sign-up'];
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));

  const [isRestricted, setIsRestricted] = useState(false);

  useEffect(() => {
    if (!loading && !user && !isPublicPath) {
      router.push('/login');
    }
  }, [loading, user, isPublicPath, router]);

  useEffect(() => {
    if (loading || !user || isPublicPath) return;

    const isAdmin = role === 'admin';
    
    if (isAdmin) {
      setIsRestricted(false);
      return;
    }

    // Allow dashboard for all authenticated users during claim sync
    if (pathname === '/') {
      setIsRestricted(false);
      return;
    }

    // Check module permissions
    const currentModule = APP_MODULES.find(
      m => pathname.startsWith(m.href) && m.href !== '/'
    );
    
    if (currentModule && assignedModules && assignedModules.length > 0) {
      if (!assignedModules.includes(currentModule.id)) {
        setIsRestricted(true);
      } else {
        setIsRestricted(false);
      }
    } else {
      // Default to allowed if no module mapping exists or claims haven't loaded
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
        <p className="text-sm text-muted-foreground animate-pulse">
          Starting secure session...
        </p>
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
            <AlertDialogTitle className="text-xl">
              Access Restricted
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              You do not have permission to view this module.
              <br /><br />
              <span className="font-semibold text-foreground">
                Please contact the administrator
              </span> to request access.
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
