'use client';

import { usePathname, useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { useAuth, useAuthInstance } from '@/firebase';
import { Loader2, ShieldAlert, LogOut } from 'lucide-react';
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
import { Button } from './ui/button';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, role, assignedModules } = useAuth();
  const auth = useAuthInstance();
  const pathname = usePathname();
  const router = useRouter();
  const publicPaths = ['/login', '/sign-up'];
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));

  const [isRestricted, setIsRestricted] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    if (!loading && !user && !isPublicPath) {
      router.push('/login');
    }
  }, [loading, user, isPublicPath, router]);

  useEffect(() => {
    if (loading || !user || isPublicPath) return;

    const isAdmin = role === 'admin';
    const hasModules = assignedModules && assignedModules.length > 0;
    
    // Check if the user is not an admin and has no modules assigned
    if (!isAdmin && !hasModules) {
      setIsNewUser(true);
      return;
    } else {
      setIsNewUser(false);
    }

    if (isAdmin) {
      setIsRestricted(false);
      return;
    }

    if (pathname === '/') {
      setIsRestricted(false);
      return;
    }

    const currentModule = APP_MODULES.find(
      m => pathname.startsWith(m.href) && m.href !== '/'
    );
    
    if (currentModule) {
      if (!assignedModules.includes(currentModule.id)) {
        setIsRestricted(true);
      } else {
        setIsRestricted(false);
      }
    }
  }, [loading, user, isPublicPath, role, assignedModules, pathname]);

  const handleLogout = () => {
    if (auth) {
      signOut(auth).then(() => {
        router.push('/login');
        setIsRestricted(false);
        setIsNewUser(false);
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">
          Establishing secure session...
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
      
      {/* NEW: Modal for Users without module assignments (New/Pending) */}
      <AlertDialog open={isNewUser}>
        <AlertDialogContent className="max-w-md border-none shadow-2xl">
          <AlertDialogHeader className="items-center text-center pb-4">
            <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center mb-6 ring-8 ring-slate-50/50">
              <ShieldAlert className="h-10 w-10 text-slate-400" />
            </div>
            <AlertDialogTitle className="text-2xl font-black tracking-tight text-slate-800">
              Access Pending Approval
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-slate-500 leading-relaxed mt-4">
              Welcome to the Excellere App. Your account is successfully 
              authenticated but currently lacks authorization to access 
              platform modules.
              <br /><br />
              Please <span className="font-bold text-slate-900">contact the system administrator</span> 
              to verify your profile and enable your workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center pt-2">
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="w-full sm:w-auto rounded-sm border-slate-200 font-bold uppercase tracking-widest text-[10px] h-11 gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out & Exit
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal for existing users trying to access unauthorized areas */}
      <AlertDialog open={isRestricted && !isNewUser}>
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
            <AlertDialogAction onClick={() => router.push('/')}>
              Back to Dashboard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
