'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { RECAPTCHA_V3_SITE_KEY } from './app-check-config';

/**
 * Inicializa Firebase de forma robusta y silenciosa.
 * Incluye la activación de App Check para proteger Authentication y Firestore.
 */
export function initializeFirebase() {
  // En el servidor (SSR), si ya hay una app, la usamos.
  const apps = getApps();
  if (apps.length > 0) {
    return getSdks(apps[0]);
  }

  let firebaseApp: FirebaseApp;
  
  try {
    firebaseApp = initializeApp(firebaseConfig);
  } catch (e) {
    firebaseApp = getApps()[0];
  }

  // Inicialización de App Check (Solo en el cliente)
  if (typeof window !== 'undefined') {
    try {
      // Nota: Si estás en desarrollo local, podrías necesitar activar el token de depuración:
      // (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      
      initializeAppCheck(firebaseApp, {
        provider: new ReCaptchaV3Provider(RECAPTCHA_V3_SITE_KEY),
        isTokenAutoRefreshEnabled: true,
      });
      console.log('Firebase App Check activado correctamente.');
    } catch (err) {
      // Fallará silenciosamente si ya está inicializado o si la llave es inválida
      console.warn('App Check no pudo inicializarse (esto es normal en algunos flujos de re-renderizado):', err);
    }
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
