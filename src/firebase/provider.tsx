'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage?: any;
}

interface UserAuthState {
  user: User | null;
  claims: any | null;
  isUserLoading: boolean;
  userError: Error | null;
  // Live profile data from Firestore to avoid Auth Token lag
  dbProfile: any | null;
}

export interface FirebaseContextState extends UserAuthState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  storage: any | null;
}

export interface AuthState extends UserAuthState {
  loading: boolean;
  role: string | null;
  assignedModules: string[] | null;
  assignedProjects: string[] | null;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
  storage,
}) => {
  const [authState, setAuthState] = useState<UserAuthState>({
    user: null,
    claims: null,
    isUserLoading: true,
    userError: null,
    dbProfile: null,
  });

  useEffect(() => {
    if (!auth) {
      setAuthState(prev => ({ ...prev, isUserLoading: false, userError: new Error("Auth service not provided.") }));
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        if (firebaseUser) {
          try {
            // Force refresh if the user just signed in to get latest custom claims
            const tokenResult = await getIdTokenResult(firebaseUser, true);
            setAuthState(prev => ({
              ...prev,
              user: firebaseUser,
              claims: tokenResult.claims,
              isUserLoading: false,
              userError: null,
            }));
          } catch (e: any) {
            setAuthState(prev => ({
              ...prev,
              user: firebaseUser,
              claims: null,
              isUserLoading: false,
              userError: e,
            }));
          }
        } else {
          setAuthState({
            user: null,
            claims: null,
            isUserLoading: false,
            userError: null,
            dbProfile: null,
          });
        }
      },
      (error) => {
        setAuthState(prev => ({ ...prev, user: null, claims: null, isUserLoading: false, userError: error }));
      }
    );

    return () => unsubscribeAuth();
  }, [auth]);

  // Real-time synchronization with the Firestore User document
  // This is critical because Auth Claims take time to propagate, but Firestore is instant.
  useEffect(() => {
    if (!firestore || !authState.user) {
      setAuthState(prev => ({ ...prev, dbProfile: null }));
      return;
    }

    const userDocRef = doc(firestore, 'users', authState.user.uid);
    const unsubscribeDoc = onSnapshot(
      userDocRef, 
      (docSnap) => {
        if (docSnap.exists()) {
          setAuthState(prev => ({ ...prev, dbProfile: docSnap.data() }));
        } else {
          setAuthState(prev => ({ ...prev, dbProfile: null }));
        }
      },
      (error) => {
        console.warn("Live profile sync failed. Relying on Auth claims.", error);
      }
    );

    return () => unsubscribeDoc();
  }, [firestore, authState.user?.uid]);

  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      storage: storage || null,
      ...authState,
    };
  }, [firebaseApp, firestore, auth, storage, authState]);

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

export const useAuth = (): AuthState => {
  const { user, claims, isUserLoading, userError, dbProfile } = useFirebase();
  
  // Prefer live data from Firestore (dbProfile) over cached data in Auth claims
  // This allows immediate UI updates when an Admin changes a user's role.
  const role = dbProfile?.role || claims?.role || null;
  const assignedModules = dbProfile?.assignedModules || claims?.assignedModules || null;
  const assignedProjects = dbProfile?.assignedProjects || claims?.assignedProjects || null;

  return {
    user,
    claims,
    dbProfile,
    isUserLoading,
    loading: isUserLoading,
    userError,
    role,
    assignedModules,
    assignedProjects,
  };
};

export const useAuthInstance = (): Auth => {
  const { auth } = useFirebase();
  if (!auth) throw new Error('Auth service not available');
  return auth;
};

export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  if (!firestore) throw new Error('Firestore service not available');
  return firestore;
};

export const useStorage = (): any => {
  const { storage } = useFirebase();
  if (!storage) throw new Error('Storage service not available');
  return storage;
};

export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  if (!firebaseApp) throw new Error('Firebase App not available');
  return firebaseApp;
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  return memoized;
}

export const useUser = () => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};
