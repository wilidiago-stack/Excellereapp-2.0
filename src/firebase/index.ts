'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { RECAPTCHA_V3_SITE_KEY } from './app-check-config';

/**
 * Initializes Firebase robustly and silently.
 * Includes App Check activation to protect Authentication and Firestore.
 */
export function initializeFirebase() {
  // On server (SSR), if there's already an app, use it.
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

  // App Check Initialization (Client-side only)
  if (typeof window !== 'undefined') {
    try {
      /**
       * DEBUG MODE CONFIGURATION:
       * Using the specific token provided for the local environment.
       */
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname.includes('cloudworkstations.dev');
      if (isLocalhost) {
        (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = '23477EE3-783C-4752-9AAA-3FB79B28CE7C';
      }
      
      initializeAppCheck(firebaseApp, {
        provider: new ReCaptchaV3Provider(RECAPTCHA_V3_SITE_KEY),
        isTokenAutoRefreshEnabled: true,
      });
      console.log('Firebase App Check initialized with specific Debug Token.');
    } catch (err) {
      console.warn('App Check failed to initialize:', err);
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
