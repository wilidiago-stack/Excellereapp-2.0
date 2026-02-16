'use client';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { firebaseConfig } from './config';
import { RECAPTCHA_V3_SITE_KEY } from './app-check-config';

let firebaseApp: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

// To prevent initialization on server components or multiple times
let appCheckInitialized = false;

function initializeFirebase() {
  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    firestore = getFirestore(firebaseApp);
  } else {
    firebaseApp = getApp();
    auth = getAuth(firebaseApp);
    firestore = getFirestore(firebaseApp);
  }

  // Initialize App Check only on the client and only once
  if (typeof window !== 'undefined' && !appCheckInitialized) {
    // IMPORTANT: Set the debug token flag BEFORE initializing App Check.
    // This will print a debug token to the console for development.
    (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;

    if (
      RECAPTCHA_V3_SITE_KEY &&
      RECAPTCHA_V3_SITE_KEY !== 'REPLACE_WITH_YOUR_RECAPTCHA_V3_SITE_KEY'
    ) {
      initializeAppCheck(firebaseApp, {
        provider: new ReCaptchaV3Provider(RECAPTCHA_V3_SITE_KEY),
        isTokenAutoRefreshEnabled: true,
      });
      appCheckInitialized = true;
    }
  }

  return { firebaseApp, auth, firestore };
}

export { initializeFirebase };
export * from './provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
