
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

    // onIdTokenChanged is more robust than onAuthStateChanged for syncing claims
    const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
      setAuthLoading(true);
      if (currentUser) {
        try {
          // Force refresh the token to ensure we have the absolute latest custom claims
          const idTokenResult = await getIdTokenResult(currentUser, true); 
          setUser(currentUser);
          setClaims(idTokenResult.claims);
        } catch (error) {
          console.error("Error fetching user claims in provider:", error);
          setUser(currentUser);
          setClaims(null);
        }
      } else {
        setUser(null);
        setClaims(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  // Presence heartbeat
  useEffect(() => {
    if (!firestore || !user) return;

    const userDocRef = doc(firestore, 'users', user.uid);
    const updatePresence = () => {
      setDoc(userDocRef, { lastSeen: serverTimestamp() }, { merge: true })
        .catch(err => console.log('Presence update failed:', err.message));
    };

    updatePresence();
    const intervalId = setInterval(updatePresence, 30 * 1000); // 30s heartbeat

    return () => clearInterval(intervalId);
  }, [firestore, user]);
  
  const publicPaths = ['/login', '/sign-up'];
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));
  
  useEffect(() => {
    if (authLoading) return;

    if (!user && !isPublicPath) {
      router.push('/login');
    }

    if (user && isPublicPath) {
      router.push('/');
    }
  }, [user, authLoading, isPublicPath, router]);
  
  const memoizedValue = useMemo(() => ({
    firebaseApp,
    auth,
    firestore,
    user,
    claims,
    authLoading,
    isAdmin: claims?.role === 'admin'
  }), [firebaseApp, auth, firestore, user, claims, authLoading]);

  if (authLoading || (!user && !isPublicPath) || (user && isPublicPath)) {
    return <FullScreenLoader />;
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

export const useAuth = () => {
  const { user, claims, authLoading, isAdmin } = useFirebase();
  return { user, claims, loading: authLoading, isAdmin };
}

export const useFirebaseApp = () => useFirebase().firebaseApp;
export const useAuthInstance = () => useFirebase().auth;
export const useFirestore = () => useFirebase().firestore;
