'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LogOut, User, Settings, Mail, ShieldCheck } from 'lucide-react';
import { useAuth, useAuthInstance } from '@/firebase';
import { signOut, getIdTokenResult } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Skeleton } from './ui/skeleton';
import Link from 'next/link';

export function UserNav() {
  const { user, claims, loading: authLoading } = useAuth();
  const auth = useAuthInstance();
  const router = useRouter();
  const [isTokenDialogOpen, setIsTokenDialogOpen] = useState(false);
  const [visibleClaims, setVisibleClaims] = useState<any>(null);

  const handleLogout = () => {
    if (auth) {
      signOut(auth).then(() => {
        router.push('/login');
      });
    }
  };

  const handleViewToken = async () => {
    if (user) {
      // Get fresh token info
      const tokenResult = await getIdTokenResult(user);
      setVisibleClaims(tokenResult.claims);
      setIsTokenDialogOpen(true);
    }
  };
  
  const handleForceRefresh = async () => {
    if (user) {
      const tokenResult = await getIdTokenResult(user, true); // Force refresh
      setVisibleClaims(tokenResult.claims);
    }
  };

  if (authLoading) {
    return <Skeleton className="h-9 w-9 rounded-full" />;
  }

  if (!user) {
    return (
      <Button asChild>
        <Link href="/login">Login</Link>
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-9 w-9">
              {user.photoURL && (
                <AvatarImage src={user.photoURL} alt={user.displayName || ''} />
              )}
              <AvatarFallback>
                {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user.displayName}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Mail className="mr-2 h-4 w-4" />
              <span>Inbox</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleViewToken}>
            <ShieldCheck className="mr-2 h-4 w-4" />
            <span>View My Token</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <AlertDialog open={isTokenDialogOpen} onOpenChange={setIsTokenDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Current User Permissions</AlertDialogTitle>
            <AlertDialogDescription>
              These are the custom claims present in your current authentication token. The 'role' claim is used by security rules to grant permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2 w-full rounded-md bg-slate-950 p-4">
            <pre><code className="text-white text-xs">{JSON.stringify(visibleClaims, null, 2)}</code></pre>
          </div>
          <AlertDialogFooter>
             <Button variant="secondary" onClick={handleForceRefresh}>
              Force Refresh Token
            </Button>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
