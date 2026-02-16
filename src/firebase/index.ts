'use client';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, connectAuthEmulator } from 'firebase/auth';
import {
  getFirestore,
  type Firestore,
  connectFirestoreEmulator,
} from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { firebaseConfig } from './config';
import { RECAPTCHA_V3_SITE_KEY } from './app-check-config';

// To prevent initialization on server components or multiple times
let appCheckInitialized = false;
let emulatorsConnected = false; // Flag to prevent reconnecting

function initializeFirebase() {
  let firebaseApp: FirebaseApp;
  let auth: Auth;
  let firestore: Firestore;

  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApp();
  }

  auth = getAuth(firebaseApp);
  firestore = getFirestore(firebaseApp);

  // --- START EMULATOR CONNECTION ---
  // This block is crucial for local development. It tells the Firebase SDK
  // to connect to the local emulators for Auth and Firestore instead of the
  // live production services.
  if (typeof window !== 'undefined' && !emulatorsConnected) {
    console.log('Connecting to Firebase Emulators...');
    try {
      // Note: The host and port must match your local emulator setup.
      // The `disableAppCheck: true` is critical to prevent auth/network-request-failed
      // errors when using the Auth emulator.
      connectAuthEmulator(auth, 'http://localhost:9099', { disableAppCheck: true });
      connectFirestoreEmulator(firestore, 'localhost', 8080);
      emulatorsConnected = true;
      console.log('Successfully connected to Auth and Firestore Emulators.');
    } catch (e) {
      console.error('Error connecting to Firebase emulators:', e);
    }
  }
  // --- END EMULATOR CONNECTION ---

  // Temporarily disabling App Check to unblock user registration.
  // The root cause is Enforcement being turned on in the Firebase Console.
  // The sign-up page will now guide the user to disable it.
  /*
  if (typeof window !== 'undefined' && !appCheckInitialized) {
    // Set the debug token provider.
    (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = process.env.NODE_ENV !== 'production';

    // Initialize App Check
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
export * from './firestore/use-collection';
export * from './firestore/use-doc';
