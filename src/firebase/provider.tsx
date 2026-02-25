'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

// Internal state for user authentication including claims
interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  claims: any | null;
}

// Combined state for the Firebase context
export interface FirebaseContextState {
  areServicesAvailable: boolean; // True if core services are provided
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null; // The Auth service instance
  // User authentication state
  user: User | null;
  isUserLoading: boolean; // True during initial auth check
  userError: Error | null; // Error from auth listener
  claims: any | null; // Custom claims
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true, // Start loading until first auth event
    userError: null,
    claims: null,
  });

  // Effect to subscribe to Firebase auth state changes and fetch claims
  useEffect(() => {
    if (!auth) {
      setUserAuthState({
        user: null,
        isUserLoading: false,
        userError: new Error("Auth service not provided."),
        claims: null,
      });
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch custom claims from the token
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
        setUserAuthState({ user: null, isUserLoading: false, userError: null, claims: null });
      }
    });

    return () => unsubscribe();
  }, [auth]);

  // Memoize the context value
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

/**
 * Hook to access core Firebase services and user authentication state.
 */
export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  return context;
};

/** Hook to access Firebase Auth service instance. */
export const useAuthInstance = (): Auth => {
  const { auth } = useFirebase();
  if (!auth) throw new Error("Firebase Auth instance not initialized.");
  return auth;
};

/** 
 * Hook to access user authentication state, role, and assigned permissions.
 * Returns an object with user, loading, and specific claims.
 */
export const useAuth = () => {
  const { user, isUserLoading, claims } = useFirebase();
  return {
    user,
    loading: isUserLoading,
    role: (claims?.role as string) || 'viewer',
    assignedModules: (claims?.assignedModules as string[]) || [],
    assignedProjects: (claims?.assignedProjects as string[]) || [],
    claims,
  };
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  if (!firestore) throw new Error("Firestore instance not available.");
  return firestore;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  if (!firebaseApp) throw new Error("Firebase App instance not available.");
  return firebaseApp;
};

/**
 * Stabilizes Firebase references and queries for use in hooks.
 * Automatically adds the __memo flag required by useCollection and useDoc.
 */
export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  const memoized = useMemo(factory, deps);
  if (memoized && typeof memoized === 'object') {
    (memoized as any).__memo = true;
  }
  return memoized;
}

/**
 * Hook specifically for accessing the authenticated user's profile state.
 */
export const useUser = () => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};
