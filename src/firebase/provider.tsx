'use client';
import { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { Auth, User, IdTokenResult } from 'firebase/auth';
import { onIdTokenChanged, getIdTokenResult } from 'firebase/auth';
import {
  type Firestore,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { usePathname, useRouter } from 'next/navigation';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

function FullScreenLoader() {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

interface FirebaseContextType {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  user: User | null;
  claims: IdTokenResult['claims'] | null;
  authLoading: boolean;
  isAdmin: boolean;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

interface FirebaseProviderProps {
  children: ReactNode;
  value: {
    firebaseApp: FirebaseApp;
    auth: Auth;
    firestore: Firestore;
  };
}

export function FirebaseProvider({ children, value }: FirebaseProviderProps) {
  const { auth, firestore, firebaseApp } = value;
  const [user, setUser] = useState<User | null>(null);
  const [claims, setClaims] = useState<IdTokenResult['claims'] | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      setAuthLoading(true);
      if (user) {
        try {
          // Force refresh the token to get the latest custom claims.
          // This is crucial for reflecting role changes without a logout/login.
          const idTokenResult = await getIdTokenResult(user, true); 
          setUser(user);
          setClaims(idTokenResult.claims);
        } catch (error) {
          console.error("Error fetching user claims in provider:", error);
          // Still set the user, but claims will be null.
          setUser(user);
          setClaims(null);
        }
      } else {
        // User is signed out
        setUser(null);
        setClaims(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  // Heartbeat to update user's lastSeen status
  useEffect(() => {
    if (!firestore || !user) {
      return;
    }

    const userDocRef = doc(firestore, 'users', user.uid);

    // Use setDoc with merge to prevent error if doc doesn't exist yet.
    // This can happen on first login due to a race condition with the
    // backend function that creates the user document.
    setDoc(userDocRef, { lastSeen: serverTimestamp() }, { merge: true }).catch(
      (error) => {
        console.error('Failed to update lastSeen on load:', error);
      }
    );

    // Update lastSeen every 30 seconds as a heartbeat
    const intervalId = setInterval(() => {
      setDoc(userDocRef, { lastSeen: serverTimestamp() }, { merge: true }).catch(
        (error) => {
          // This might fail if user is offline, which is fine.
          console.log(
            'Heartbeat update for lastSeen failed (likely offline):',
            error.message
          );
        }
      );
    }, 30 * 1000); // every 30 seconds

    return () => {
      clearInterval(intervalId);
    };
  }, [firestore, user]);
  
  const publicPaths = ['/login', '/sign-up'];
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));
  
  useEffect(() => {
    if (authLoading) return; // Don't do anything while loading

    if (!user && !isPublicPath) {
      router.push('/login');
    }

    if (user && isPublicPath) {
      router.push('/');
    }

  }, [user, authLoading, isPublicPath, router, pathname]);
  
  const memoizedValue = useMemo(() => ({
    firebaseApp,
    auth,
    firestore,
    user,
    claims,
    authLoading,
    isAdmin: claims?.role === 'admin'
  }), [firebaseApp, auth, firestore, user, claims, authLoading]);

  // Render a loader while auth state is resolving or redirects are happening
  if (authLoading || (!user && !isPublicPath) || (user && isPublicPath)) {
    return <FullScreenLoader />;
  }
  
  if(isPublicPath && !user){
    return <FirebaseContext.Provider value={memoizedValue}>{children}</FirebaseContext.Provider>;
  }

  return (
    <FirebaseContext.Provider value={memoizedValue}>
      {children}
      <FirebaseErrorListener />
    </FirebaseContext.Provider>
  );
}

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};

// Main hook for accessing auth state
export const useAuth = () => {
  const { user, claims, authLoading, isAdmin } = useFirebase();
  return { user, claims, loading: authLoading, isAdmin };
}

// Hooks for accessing specific firebase instances
export const useFirebaseApp = () => useFirebase().firebaseApp;
export const useAuthInstance = () => useFirebase().auth;
export const useFirestore = () => useFirebase().firestore;
