'use client';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { firebaseConfig } from './config';
import { RECAPTCHA_V3_SITE_KEY } from './app-check-config';

// To prevent initialization on server components or multiple times
let appCheckInitialized = false;

function initializeFirebase() {
  let firebaseApp: FirebaseApp;
  let auth: Auth;
  let firestore: Firestore;

  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    firestore = getFirestore(firebaseApp);
  } else {
    firebaseApp = getApp();
    auth = getAuth(firebaseApp);
    firestore = getFirestore(firebaseApp);
  }

  // Temporarily disabling App Check to unblock user registration.
  // The root cause is Enforcement being turned on in the Firebase Console.
  // The sign-up page will now guide the user to disable it.
  /*
  if (typeof window !== 'undefined' && !appCheckInitialized) {
    (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = process.env.NODE_ENV !== 'production';

    initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaV3Provider(RECAPTCHA_V3_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
    appCheckInitialized = true;
  }
  */

  return { firebaseApp, auth, firestore };
}

export { initializeFirebase };
export * from './provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
