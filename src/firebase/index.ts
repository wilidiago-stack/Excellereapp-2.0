'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Inicializa Firebase de forma robusta y silenciosa.
 * Evita errores en SSR y prefiere la configuración manual si la automática no está disponible.
 */
export function initializeFirebase() {
  // En el servidor (SSR), si ya hay una app, la usamos.
  const apps = getApps();
  if (apps.length > 0) {
    return getSdks(apps[0]);
  }

  let firebaseApp: FirebaseApp;
  
  // Intentamos inicialización manual directamente para evitar advertencias de "no-options"
  // a menos que estemos en un entorno que soporte explícitamente la inicialización automática.
  try {
    firebaseApp = initializeApp(firebaseConfig);
  } catch (e) {
    // Si falla (ej. por re-inicialización), intentamos obtener la app por defecto.
    firebaseApp = getApps()[0];
  }

  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
