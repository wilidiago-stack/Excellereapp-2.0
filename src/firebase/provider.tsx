'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot } from 'firebase/firestore';
import { Auth, User, onIdTokenChanged, ParsedToken } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'

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

export interface FirebaseContextState extends UserAuthState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
}

export interface AuthHookResult {
  user: User | null;
  claims: ParsedToken | null;
  loading: boolean;
  error: Error | null;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

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
        setUserAuthState({ user: null, claims: null, isUserLoading: false, userError: error });
      }
    );
    return () => unsubscribe();
  }, [auth]);

  /**
   * SINCRONIZADOR DE ROLES EN TIEMPO REAL:
   * Escucha cambios en el documento del usuario en Firestore.
   * Si el rol cambia, fuerza la actualización del token de seguridad.
   */
  useEffect(() => {
    const user = userAuthState.user;
    if (!user || !firestore) return;

    const userDocRef = doc(firestore, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      const userData = snapshot.data();
      const currentClaimRole = userAuthState.claims?.role;
      
      if (userData?.role && userData.role !== currentClaimRole) {
        // El rol en DB no coincide con el Token. Forzamos actualización silenciosa.
        user.getIdToken(true);
      }
    });

    return () => unsubscribe();
  }, [userAuthState.user, userAuthState.claims?.role, firestore]);

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

export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  if (!firebaseApp) throw new Error('FirebaseApp instance not available');
  return firebaseApp;
};

export const useAuth = (): AuthHookResult => {
  const { user, claims, isUserLoading, userError } = useFirebase();
  return { user, claims, loading: isUserLoading, error: userError };
};

export const useUser = () => useAuth();

type MemoFirebase<T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  const memoized = useMemo(factory, deps);
  
  if (typeof memoized === 'object' && memoized !== null) {
    try {
      (memoized as any).__memo = true;
    } catch (e) {
      // Si el objeto está congelado (como algunos de Firestore), lo envolvemos
    }
  }
  
  return memoized;
}