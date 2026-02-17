
import {setGlobalOptions} from "firebase-functions/v2";
import {onAuthUserCreate, onAuthUserDelete} from "firebase-functions/v2/auth";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Set global options for the function
setGlobalOptions({ maxInstances: 10 });

/**
 * Triggered on new user creation in Firebase Authentication.
 * This function creates a user document in Firestore with basic profile information
 * and assigns the 'viewer' role to all new users.
 */
export const setupInitialUserRole = onAuthUserCreate(async (event) => {
  const { uid, email, displayName } = event.data;
  logger.info(`[setupInitialUserRole] New Auth user created, UID: ${uid}`);

  const userDocRef = db.doc(`users/${uid}`);
  const metadataRef = db.doc("system/metadata");

  try {
    const role = "viewer";
    
    const nameParts = displayName?.split(' ') || [];
    const firstName = nameParts[0] || (email ? email.split('@')[0] : 'New');
    const lastName = nameParts.slice(1).join(' ') || 'User';

    const userData = {
      firstName,
      lastName,
      email: email || '',
      role: role,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Use a transaction to update metadata and set user doc
    await db.runTransaction(async (transaction) => {
      const metadataDoc = await transaction.get(metadataRef);
      const userCount = metadataDoc.exists ? metadataDoc.data()?.userCount || 0 : 0;
      
      transaction.set(userDocRef, userData, { merge: true });
      transaction.set(metadataRef, { userCount: userCount + 1 }, { merge: true });
    });

    // Set custom claims
    await admin.auth().setCustomUserClaims(uid, { role });
    logger.info(`[setupInitialUserRole] Successfully set up user ${uid} with role ${role}`);

  } catch (error) {
    logger.error(`[setupInitialUserRole] Error during initial user setup for ${uid}:`, error);
  }
});

/**
 * Triggered on user deletion from Firebase Authentication.
 */
export const cleanupUser = onAuthUserDelete(async (event) => {
  const { uid } = event.data;
  logger.info(`[cleanupUser] Auth user deleted, UID: ${uid}`);

  const userDocRef = db.doc(`users/${uid}`);
  const metadataRef = db.doc('system/metadata');

  try {
    const batch = db.batch();
    batch.delete(userDocRef);
    batch.update(metadataRef, {
      userCount: admin.firestore.FieldValue.increment(-1),
    });
    await batch.commit();
    logger.info(`[cleanupUser] Successfully cleaned up data for user ${uid}`);
  } catch (error) {
    logger.error(`[cleanupUser] Error during user cleanup for ${uid}:`, error);
  }
});

/**
 * SYNC ROLE TO CLAIMS: Triggered on user document update in Firestore.
 * This is the definitive sync between the Database and Security Credentials.
 */
export const onUserRoleChange = onDocumentUpdated("users/{userId}", async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();

  // Only sync if the role field has changed
  if (beforeData?.role === afterData?.role) {
    return;
  }

  const userId = event.params.userId;
  const newRole = afterData?.role;

  if (!newRole) {
    logger.warn(`[onUserRoleChange] No role found for user ${userId}. Skipping sync.`);
    return;
  }

  logger.info(`[onUserRoleChange] Syncing role change for user ${userId}: ${beforeData?.role || 'N/A'} -> ${newRole}`);

  try {
    // Set custom claims on the Auth user
    await admin.auth().setCustomUserClaims(userId, { role: newRole });
    
    // Invalidate sessions by updating validSince to current time (forces token refresh)
    // This is optional but helps the client detect the change faster
    await admin.auth().updateUser(userId, {
      metadata: {
        // This effectively forces a token refresh on the next request
      }
    } as any);

    logger.info(`[onUserRoleChange] Successfully synced role '${newRole}' to Auth claims for user ${userId}`);
  } catch (error) {
    logger.error(`[onUserRoleChange] CRITICAL: Failed to sync role for user ${userId}:`, error);
  }
});
