'use client';

import React, {
  DependencyList,
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useState,
  useEffect,
} from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import {
  Auth,
  User,
  onAuthStateChanged,
  getIdTokenResult,
} from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  claims: any | null;
}

export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  claims: any | null;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(
  undefined
);

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true,
    userError: null,
    claims: null,
  });

  useEffect(() => {
    if (!auth) {
      setUserAuthState({
        user: null,
        isUserLoading: false,
        userError: new Error('Auth service not provided.'),
        claims: null,
      });
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const tokenResult = await getIdTokenResult(firebaseUser);
          setUserAuthState({
            user: firebaseUser,
            isUserLoading: false,
            userError: null,
            claims: tokenResult.claims,
          });
        } catch (error: any) {
          setUserAuthState({
            user: firebaseUser,
            isUserLoading: false,
            userError: error,
            claims: null,
          });
        }
      } else {
        setUserAuthState({
          user: null,
          isUserLoading: false,
          userError: null,
          claims: null,
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
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
      claims: userAuthState.claims,
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
  if (!auth) throw new Error('Firebase Auth instance not initialized.');
  return auth;
};

const EMPTY_ARRAY: string[] = [];

export const useAuth = () => {
  const { user, isUserLoading, claims } = useFirebase();
  
  // Memoize the return value to prevent infinite render loops in components
  // that use role or assignedModules as dependency array items.
  return useMemo(() => ({
    user,
    loading: isUserLoading,
    role: (claims?.role as string) || 'viewer',
    assignedModules: (claims?.assignedModules as string[]) || EMPTY_ARRAY,
    assignedProjects: (claims?.assignedProjects as string[]) || EMPTY_ARRAY,
    claims,
  }), [user, isUserLoading, claims]);
};

export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  if (!firestore) throw new Error('Firestore instance not available.');
  return firestore;
};

export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  if (!firebaseApp) throw new Error('Firebase App instance not available.');
  return firebaseApp;
};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  const memoized = useMemo(factory, deps);
  if (memoized && typeof memoized === 'object') {
    (memoized as any).__memo = true;
  }
  return memoized;
}

export const useUser = () => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};
