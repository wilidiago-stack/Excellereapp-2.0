'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User, onIdTokenChanged, ParsedToken } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

// Internal state for user authentication and claims
interface UserAuthState {
  user: User | null;
  claims: ParsedToken | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Combined state for the Firebase context
export interface FirebaseContextState extends UserAuthState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
}

// Return type for useAuth() - specific to user auth state
export interface AuthHookResult {
  user: User | null;
  claims: ParsedToken | null;
  loading: boolean;
  error: Error | null;
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
    claims: null,
    isUserLoading: true,
    userError: null,
  });

  // Effect to subscribe to Firebase auth state and token changes
  useEffect(() => {
    if (!auth) {
      setUserAuthState(prev => ({ ...prev, isUserLoading: false, userError: new Error("Auth service not provided.") }));
      return;
    }

    // onIdTokenChanged is better than onAuthStateChanged for role syncing
    const unsubscribe = onIdTokenChanged(
      auth,
      async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const tokenResult = await firebaseUser.getIdTokenResult();
            setUserAuthState({
              user: firebaseUser,
              claims: tokenResult.claims,
              isUserLoading: false,
              userError: null,
            });
          } catch (e: any) {
            setUserAuthState({
              user: firebaseUser,
              claims: null,
              isUserLoading: false,
              userError: e,
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
      },
      (error) => {
        console.error("FirebaseProvider: onIdTokenChanged error:", error);
        setUserAuthState({ user: null, claims: null, isUserLoading: false, userError: error });
      }
    );
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

/**
 * Hook to access core Firebase services and user authentication state.
 */
export const useFirebase = (): FirebaseContextState => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  return context;
};

/** Hook to access Firebase Auth instance. */
export const useAuthInstance = (): Auth => {
  const { auth } = useFirebase();
  if (!auth) throw new Error('Auth instance not available');
  return auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  if (!firestore) throw new Error('Firestore instance not available');
  return firestore;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  if (!firebaseApp) throw new Error('FirebaseApp instance not available');
  return firebaseApp;
};

/** Hook for accessing the authenticated user's state and claims. */
export const useAuth = (): AuthHookResult => {
  const { user, claims, isUserLoading, userError } = useFirebase();
  return { user, claims, loading: isUserLoading, error: userError };
};

/** Legacy hook for consistency */
export const useUser = () => useAuth();

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}
