'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

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

  // 1. Initial Auth State and Token Load
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
            const tokenResult = await getIdTokenResult(firebaseUser);
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

  // 2. Real-time DB Profile Synchronization
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
        console.warn("Live profile sync error:", error);
      }
    );

    return () => unsubscribeDoc();
  }, [firestore, authState.user?.uid]);

  // 3. Proactive Token Refresh Logic
  // This ensures that when DB data changes, the Token (claims) catch up immediately.
  useEffect(() => {
    const user = authState.user;
    if (!user || !authState.dbProfile) return;

    const dbRole = authState.dbProfile.role;
    const tokenRole = authState.claims?.role;
    
    const dbModules = JSON.stringify(authState.dbProfile.assignedModules || []);
    const tokenModules = JSON.stringify(authState.claims?.assignedModules || []);

    const dbProjects = JSON.stringify(authState.dbProfile.assignedProjects || []);
    const tokenProjects = JSON.stringify(authState.claims?.assignedProjects || []);

    // If there is any discrepancy between DB and Token, force a token refresh
    if (dbRole !== tokenRole || dbModules !== tokenModules || dbProjects !== tokenProjects) {
      console.log("[Auth] Security discrepancy detected. Refreshing ID Token...");
      getIdTokenResult(user, true).then(tokenResult => {
        setAuthState(prev => ({ ...prev, claims: tokenResult.claims }));
      }).catch(err => console.error("[Auth] Token refresh failed:", err));
    }
  }, [authState.user, authState.dbProfile, authState.claims]);

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
  
  // Prefer real-time DB data for UI, fallback to claims for initial state
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

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  const memoized = useMemo(factory, deps);
  if(typeof memoized === 'object' && memoized !== null) {
    (memoized as any).__memo = true;
  }
  return memoized;
}

export const useUser = () => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};
