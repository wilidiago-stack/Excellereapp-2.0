import {setGlobalOptions} from "firebase-functions/v2";
import {onAuthUserCreate, onAuthUserDelete} from "firebase-functions/v2/auth";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Set global options for the function
setGlobalOptions({maxInstances: 10});

/**
 * Triggered on new user creation in Firebase Authentication.
 * This function creates a user document in Firestore with basic profile information.
 * It automatically assigns the 'admin' role to the very first user of the system.
 */
export const setupInitialUserRole = onAuthUserCreate(async (event) => {
  const {uid, email, displayName} = event.data;
  logger.info(`[setupInitialUserRole] Triggered for new user UID: ${uid}`);

  const userDocRef = db.doc(`users/${uid}`);
  const metadataRef = db.doc("system/metadata");

  try {
    // 1. Determine if this is the first user in a transaction to be thread-safe
    let isFirstUser = false;
    await db.runTransaction(async (transaction) => {
      const metadataDoc = await transaction.get(metadataRef);
      const currentCount = metadataDoc.exists ? metadataDoc.data()?.userCount || 0 : 0;
      
      if (currentCount === 0) {
        isFirstUser = true;
      }
      
      const newCount = currentCount + 1;
      if (metadataDoc.exists) {
        transaction.update(metadataRef, {userCount: newCount});
      } else {
        transaction.set(metadataRef, {userCount: newCount});
      }
    });

    // 2. Determine user's name
    const nameParts = displayName?.split(" ").filter((p) => p.length > 0) || [];
    const firstName = nameParts[0] || (email ? email.split("@")[0] : "New");
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : (email ? "(from email)" : "User");
    
    // 3. Prepare the user document
    const role = isFirstUser ? "admin" : "viewer";
    
    // For the first admin, we assign all core modules by default to avoid empty UI
    const defaultModules = isFirstUser ? [
      "dashboard", "projects", "users", "contractors", 
      "daily-report", "monthly-report", "safety-events", 
      "project-team", "documents", "calendar", "map", "weather"
    ] : [];

    const newUserDocument = {
      firstName,
      lastName,
      email: email || "",
      role: role,
      status: "active",
      assignedModules: defaultModules,
      assignedProjects: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    logger.info(`[setupInitialUserRole] Creating ${role} document for ${uid}`);
    await userDocRef.set(newUserDocument);

    // 4. Set the custom authentication claim for the user's role and modules
    // This is used by security rules and the UI (via token refresh)
    await admin.auth().setCustomUserClaims(uid, {
      role: role,
      assignedModules: defaultModules,
    });

    logger.info(`[setupInitialUserRole] Setup completed for ${uid}. First user: ${isFirstUser}`);

  } catch (error) {
    logger.error(`[setupInitialUserRole] Error for ${uid}:`, error);
  }
});

/**
 * Triggered on user deletion from Firebase Authentication.
 */
export const cleanupUser = onAuthUserDelete(async (event) => {
  const {uid} = event.data;
  const userDocRef = db.doc(`users/${uid}`);
  const metadataRef = db.doc("system/metadata");

  try {
    const metadataDoc = await metadataRef.get();
    const batch = db.batch();
    batch.delete(userDocRef);
    if (metadataDoc.exists && (metadataDoc.data()?.userCount || 0) > 0) {
      batch.update(metadataRef, {
        userCount: admin.firestore.FieldValue.increment(-1),
      });
    }
    await batch.commit();
    logger.info(`[cleanupUser] Data removed for ${uid}.`);
  } catch (error) {
    logger.error(`[cleanupUser] Error for ${uid}:`, error);
  }
});

/**
 * Syncs changes from the Firestore user document to Firebase Auth Custom Claims.
 * This ensures security rules and the UI stay in sync with the database.
 */
export const onUserRoleChange = onDocumentUpdated("users/{userId}", async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();

  if (!afterData) return;

  // Only sync if the role or assigned modules have changed
  const roleChanged = afterData.role !== beforeData?.role;
  const modulesChanged = JSON.stringify(afterData.assignedModules) !== JSON.stringify(beforeData?.assignedModules);

  if (!roleChanged && !modulesChanged) return;
  
  const uid = event.params.userId;
  logger.info(`[onUserRoleChange] Syncing claims for ${uid}. Role: ${afterData.role}`);

  try {
    await admin.auth().setCustomUserClaims(uid, {
      role: afterData.role || "viewer",
      assignedModules: afterData.assignedModules || [],
    });
  } catch (error) {
    logger.error(`[onUserRoleChange] Failed to set claims for ${uid}:`, error);
  }
});
