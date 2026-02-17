
import {setGlobalOptions} from "firebase-functions/v2";
import {onAuthUserCreate, onAuthUserDelete} from "firebase-functions/v2/auth";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
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
 * and assigns the 'viewer' role to all new users, ensuring every user has a DB record.
 */
export const setupInitialUserRole = onAuthUserCreate(async (event) => {
  const { uid, email, displayName } = event.data;
  logger.info(`[setupInitialUserRole] Triggered for new user UID: ${uid}`);

  const userDocRef = db.doc(`users/${uid}`);

  try {
    // 1. Determine user's name, with fallbacks.
    const nameParts = displayName?.split(' ').filter(p => p.length > 0) || [];
    const firstName = nameParts[0] || (email ? email.split('@')[0] : 'New');
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : (email ? '(from email)' : 'User');
    
    // 2. Prepare the user document. This is the definitive record.
    const newUserDocument = {
      firstName,
      lastName,
      email: email || '',
      role: 'viewer', // All new users start as viewers
      status: 'active',
    };

    logger.info(`[setupInitialUserRole] Preparing to create user document for ${uid}:`, newUserDocument);
    
    // 3. Create the user document in Firestore.
    await userDocRef.set(newUserDocument);
    logger.info(`[setupInitialUserRole] Successfully created Firestore document for user ${uid}.`);

    // 4. Set the custom authentication claim for the user's role.
    await admin.auth().setCustomUserClaims(uid, { role: 'viewer' });
    logger.info(`[setupInitialUserRole] Successfully set custom claim 'role: viewer' for user ${uid}.`);

    // 5. Increment the total user count in a separate, safe transaction.
    const metadataRef = db.doc('system/metadata');
    await db.runTransaction(async (transaction) => {
      const metadataDoc = await transaction.get(metadataRef);
      const currentCount = metadataDoc.exists ? metadataDoc.data()?.userCount || 0 : 0;
      const newCount = currentCount + 1;
      
      if (metadataDoc.exists) {
        transaction.update(metadataRef, { userCount: newCount });
      } else {
        transaction.set(metadataRef, { userCount: newCount });
      }
      logger.info(`[setupInitialUserRole] User count incremented to ${newCount}.`);
    });

    logger.info(`[setupInitialUserRole] Successfully completed all setup for user ${uid}.`);

  } catch (error) {
    logger.error(`[setupInitialUserRole] CRITICAL ERROR during initial setup for ${uid}:`, error);
  }
});


/**
 * Triggered on user deletion from Firebase Authentication.
 * This function deletes the user's Firestore document and decrements the total user count.
 */
export const cleanupUser = onAuthUserDelete(async (event) => {
  const { uid } = event.data;
  logger.info(`[cleanupUser] Triggered for deleted user UID: ${uid}. Cleaning up Firestore data.`);

  const userDocRef = db.doc(`users/${uid}`);
  const metadataRef = db.doc('system/metadata');

  try {
    const metadataDoc = await metadataRef.get();
    const batch = db.batch();

    // 1. Delete the user's document from Firestore.
    batch.delete(userDocRef);
    logger.info(`[cleanupUser] Queued deletion for user document ${uid}.`);

    // 2. Atomically decrement the user count only if it exists and is > 0.
    if (metadataDoc.exists && (metadataDoc.data()?.userCount || 0) > 0) {
      batch.update(metadataRef, {
        userCount: admin.firestore.FieldValue.increment(-1),
      });
      logger.info(`[cleanupUser] Queued decrement of user count.`);
    }

    await batch.commit();
    logger.info(`[cleanupUser] Successfully cleaned up data for user ${uid}.`);
  } catch (error) {
    logger.error(`[cleanupUser] Error during user cleanup for ${uid}:`, error, "This may happen if the userCount document doesn't exist or the user doc was already deleted. It's usually safe to ignore in development if the user count is being decremented.");
  }
});

/**
 * Triggered on user document update in Firestore.
 * This function syncs the 'role' from the Firestore document to Firebase Auth custom claims.
 * This ensures that a user's permissions are always up-to-date with their document.
 */
export const onUserRoleChange = onDocumentUpdated("users/{userId}", async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    // If role hasn't changed or data is missing, do nothing.
    if (!beforeData || !afterData || beforeData.role === afterData.role) {
        return;
    }
    
    const uid = event.params.userId;
    const newRole = afterData.role;
    
    logger.info(`Role for ${uid} changed from '${beforeData.role}' to '${newRole}'. Syncing to Auth claims.`);

    try {
        // Set the custom claim on the user's Auth record.
        await admin.auth().setCustomUserClaims(uid, { role: newRole });
        logger.info(`Successfully set custom claim 'role: ${newRole}' for user ${uid}. The user may need to re-login for the claim to take effect.`);
    } catch (error) {
        logger.error(`Error setting custom claims for ${uid}:`, error);
    }
});
