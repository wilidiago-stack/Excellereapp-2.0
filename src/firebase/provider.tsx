'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect, useRef } from 'react';
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

  const lastRefreshRef = useRef<number>(0);

  // 1. Monitorización de Estado de Autenticación Inicial
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
            // Obtenemos el token y sus claims inmediatamente al loguear
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

  // 2. Sincronización del Perfil de DB en Tiempo Real
  // Esto permite que la UI responda instantáneamente a cambios de permisos
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
        console.warn("[FirebaseProvider] Live profile sync error:", error);
      }
    );

    return () => unsubscribeDoc();
  }, [firestore, authState.user?.uid]);

  // 3. Lógica de Sincronización Proactiva de Tokens
  // Compara la "Verdad de la DB" con la "Verdad del Token". Si hay desfase, refresca el token.
  useEffect(() => {
    const user = authState.user;
    const dbProfile = authState.dbProfile;
    if (!user || !dbProfile) return;

    // Normalizamos los campos para una comparación estricta
    const dbRole = dbProfile.role || 'viewer';
    const tokenRole = authState.claims?.role || 'viewer';
    
    const dbModules = JSON.stringify([...(dbProfile.assignedModules || [])].sort());
    const tokenModules = JSON.stringify([...(authState.claims?.assignedModules || [])].sort());

    const dbProjects = JSON.stringify([...(dbProfile.assignedProjects || [])].sort());
    const tokenProjects = JSON.stringify([...(authState.claims?.assignedProjects || [])].sort());

    // Si hay cualquier discrepancia, necesitamos un nuevo token para que Storage/SecurityRules funcionen
    const hasDiscrepancy = dbRole !== tokenRole || dbModules !== tokenModules || dbProjects !== tokenProjects;

    if (hasDiscrepancy) {
      const now = Date.now();
      // Throttle de 30 segundos para evitar bucles infinitos y proteger la cuota de Google
      if (now - lastRefreshRef.current > 30000) {
        console.log("[AuthSync] Se detectó un cambio de seguridad. Refrescando ID Token...");
        lastRefreshRef.current = now;
        
        getIdTokenResult(user, true)
          .then(tokenResult => {
            console.log("[AuthSync] Token actualizado con éxito.");
            setAuthState(prev => ({ ...prev, claims: tokenResult.claims }));
          })
          .catch(err => {
            if (err.code === 'auth/quota-exceeded') {
              console.error("[AuthSync] Cuota de refresco excedida. Reintentando más tarde.");
            } else {
              console.error("[AuthSync] Error al refrescar token:", err);
            }
          });
      }
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
  
  // Estrategia Híbrida:
  // Preferimos los datos de dbProfile para que la UI sea instantánea.
  // Usamos los claims como fallback para el estado inicial de la sesión.
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
