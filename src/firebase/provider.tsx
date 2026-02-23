
'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User, onIdTokenChanged, getIdTokenResult, ParsedToken } from 'firebase/auth';
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
  isUserLoading: boolean;
  userError: Error | null;
}

export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  claims: ParsedToken | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

const EMPTY_ARRAY: string[] = [];

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    claims: null,
    isUserLoading: true,
    userError: null,
  });

  useEffect(() => {
    if (!auth) {
      setUserAuthState(prev => ({ ...prev, isUserLoading: false, userError: new Error("Auth service not provided.") }));
      return;
    }

    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const tokenResult = await getIdTokenResult(firebaseUser);
          setUserAuthState({
            user: firebaseUser,
            claims: tokenResult.claims,
            isUserLoading: false,
            userError: null,
          });
        } catch (error: any) {
          setUserAuthState({
            user: firebaseUser,
            claims: null,
            isUserLoading: false,
            userError: error,
          });
        }
      } else {
        setUserAuthState({
          user: null,
          claims: null,
          isUserLoading: false,
          userError: null,
        });
      }
    });

    return () => unsubscribe();
  }, [auth]);

  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: userAuthState.user,
      claims: userAuthState.claims,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
    };
  }, [firebaseApp, firestore, auth, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  return context;
};

export const useAuthInstance = (): Auth => {
  const { auth } = useFirebase();
  if (!auth) throw new Error('Auth not initialized');
  return auth;
};

export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  if (!firestore) throw new Error('Firestore not initialized');
  return firestore;
};

export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  if (!firebaseApp) throw new Error('FirebaseApp not initialized');
  return firebaseApp;
};

export const useAuth = () => {
  const { user, isUserLoading, claims, userError } = useFirebase();
  
  const role = useMemo(() => {
    const isAdminEmail = user?.email?.toLowerCase() === 'andres.diago@outlook.com';
    return isAdminEmail ? 'admin' : (claims?.role as string) || 'viewer';
  }, [user?.email, claims?.role]);

  const assignedModules = useMemo(() => {
    return (claims?.assignedModules as string[]) || EMPTY_ARRAY;
  }, [claims?.assignedModules]);

  return useMemo(() => ({
    user,
    claims,
    loading: isUserLoading,
    error: userError,
    role,
    assignedModules,
  }), [user, claims, isUserLoading, userError, role, assignedModules]);
};

export const useUser = () => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  return memoized;
}
