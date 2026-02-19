'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, FirebaseApp, getApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, Firestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider, AppCheck } from 'firebase/app-check';
import { RECAPTCHA_V3_SITE_KEY } from './app-check-config';

// Global singletons to ensure one-time initialization on the client
let firebaseApp: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let appCheck: AppCheck | null = null;

/**
 * Initializes Firebase robustly using a singleton pattern.
 * This prevents "internal assertion failed" errors during hot-reloads.
 */
export function initializeFirebase() {
  // SSR Guard
  if (typeof window === 'undefined') {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    return {
      firebaseApp: app,
      auth: getAuth(app),
      firestore: getFirestore(app)
    };
  }

  // Client-side singleton initialization
  if (!firebaseApp) {
    try {
      firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    } catch (e) {
      firebaseApp = getApp();
    }
  }

  if (!firestore) {
    try {
      /**
       * CRITICAL: Use long polling for stability in workstation/proxy environments.
       * This must be called via initializeFirestore, and only ONCE per app instance.
       */
      firestore = initializeFirestore(firebaseApp, {
        experimentalForceLongPolling: true,
      });
      console.log('Firestore initialized with Long Polling enabled.');
    } catch (e) {
      // If already initialized, get the existing instance
      firestore = getFirestore(firebaseApp);
    }
  }

  if (!auth) {
    auth = getAuth(firebaseApp);
  }

  // App Check Initialization
  if (!appCheck) {
    try {
      const isLocalhost = 
        window.location.hostname === 'localhost' || 
        window.location.hostname.includes('cloudworkstations.dev');
      
      if (isLocalhost) {
        (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = '23477EE3-783C-4752-9AAA-3FB79B28CE7C';
      }
      
      appCheck = initializeAppCheck(firebaseApp, {
        provider: new ReCaptchaV3Provider(RECAPTCHA_V3_SITE_KEY),
        isTokenAutoRefreshEnabled: true,
      });
      console.log('Firebase App Check initialized.');
    } catch (err) {
      // Silently fail if already initialized or other error
    }
  }

  return { firebaseApp, auth, firestore };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
