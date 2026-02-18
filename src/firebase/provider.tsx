'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot } from 'firebase/firestore';
import { Auth, User, onIdTokenChanged, ParsedToken } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

interface UserAuthState {
  user: User | null;
  claims: ParsedToken | null;
  userData: any | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface FirebaseContextState extends UserAuthState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
}

export interface AuthHookResult {
  user: User | null;
  claims: ParsedToken | null;
  userData: any | null;
  role: string;
  assignedModules: string[];
  loading: boolean;
  error: Error | null;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

// WeakSet to track memoized objects safely on the client.
const firebaseMemoTags = new WeakSet<object>();

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    claims: null,
    userData: null,
    isUserLoading: true,
    userError: null,
  });

  // Auth session and Claims management
  useEffect(() => {
    if (!auth) {
      setUserAuthState(prev => ({ ...prev, isUserLoading: false, userError: new Error("Auth service not provided.") }));
      return;
    }

    const unsubscribe = onIdTokenChanged(
      auth,
      async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const tokenResult = await firebaseUser.getIdTokenResult();
            setUserAuthState(prev => ({
              ...prev,
              user: firebaseUser,
              claims: tokenResult.claims,
              isUserLoading: prev.userData ? false : true,
              userError: null,
            }));
          } catch (e: any) {
            setUserAuthState(prev => ({ ...prev, user: firebaseUser, claims: null, isUserLoading: false, userError: e }));
          }
        } else {
          setUserAuthState({ user: null, claims: null, userData: null, isUserLoading: false, userError: null });
        }
      },
      (error) => {
        setUserAuthState({ user: null, claims: null, userData: null, isUserLoading: false, userError: error });
      }
    );
    return () => unsubscribe();
  }, [auth]);

  // Firestore-First: Real-time sync of role and permissions from the user document
  useEffect(() => {
    const user = userAuthState.user;
    if (!user || !firestore) return;

    const userDocRef = doc(firestore, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      const data = snapshot.data();
      setUserAuthState(prev => ({
        ...prev,
        userData: data || null,
        isUserLoading: false,
      }));
    }, (error) => {
        setUserAuthState(prev => ({ ...prev, isUserLoading: false }));
    });

    return () => unsubscribe();
  }, [userAuthState.user, firestore]);

  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      ...userAuthState,
    };
  }, [firebaseApp, firestore, auth, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseContextState => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  return context;
};

export const useAuthInstance = (): Auth => {
  const { auth } = useFirebase();
  if (!auth) throw new Error('Auth instance not available');
  return auth;
};

export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  if (!firestore) throw new Error('Firestore instance not available');
  return firestore;
};

export const useAuth = (): AuthHookResult => {
  const { user, claims, userData, isUserLoading, userError } = useFirebase();
  
  const role = userData?.role || (claims?.role as string) || 'viewer';
  const assignedModules = userData?.assignedModules || [];
  
  return { 
    user, 
    claims, 
    userData, 
    role, 
    assignedModules,
    loading: isUserLoading, 
    error: userError 
  };
};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  const memoized = useMemo(factory, deps);
  if (typeof window !== 'undefined' && typeof memoized === 'object' && memoized !== null) {
    firebaseMemoTags.add(memoized);
  }
  return memoized;
}

export const isMemoized = (obj: any) => {
  if (typeof window === 'undefined') return true;
  return obj && firebaseMemoTags.has(obj);
};
