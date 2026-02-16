'use client';
import {setGlobalOptions} from "firebase-functions/v2";
import {onAuthUserCreate, onAuthUserDelete} from "firebase-functions/v2/auth";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Set global options for the function
setGlobalOptions({ maxInstances: 10 });

/**
 * Triggered on new user creation in Firebase Authentication.
 * This function determines if the user is the first user ever created.
 * - If so, it assigns them the 'admin' role.
 * - Otherwise, it assigns them the 'viewer' role.
 * It also sets a custom claim and updates their Firestore document.
 */
export const setupInitialUserRole = onAuthUserCreate(async (event) => {
  const { uid, email, displayName } = event.data;
  logger.info(`New Auth user created, UID: ${uid}. Setting up Firestore document and role.`);

  const userDocRef = db.doc(`users/${uid}`);
  const metadataRef = db.doc("system/metadata");

  try {
    await db.runTransaction(async (transaction) => {
      const metadataDoc = await transaction.get(metadataRef);
      const userCount = metadataDoc.exists ? metadataDoc.data()?.userCount || 0 : 0;
      
      const isFirstUser = userCount === 0;
      const role = isFirstUser ? "admin" : "viewer";

      logger.info(`User count is ${userCount}. Assigning role '${role}' to user ${uid}.`);

      // 1. Set Custom Claim for backend access control
      await admin.auth().setCustomUserClaims(uid, { role });

      // 2. Create/merge the user's document in Firestore with the correct role and active status
      // Using set with merge:true handles the race condition where the client might create the doc first.
      transaction.set(userDocRef, { 
        name: displayName || '',
        email: email || '',
        role, 
        status: 'active' 
      }, { merge: true });

      // 3. Update the system metadata user count
      const newUserCount = userCount + 1;
      if (metadataDoc.exists) {
        transaction.update(metadataRef, { userCount: newUserCount });
      } else {
        transaction.set(metadataRef, { userCount: newUserCount });
      }
    });
    logger.info(`Successfully set up role and metadata for user ${uid}.`);

  } catch (error) {
    logger.error(`Error during initial user setup for ${uid}:`, error);
  }
});

/**
 * Triggered on user deletion from Firebase Authentication.
 * This function deletes the user's Firestore document and decrements the total user count.
 */
export const cleanupUser = onAuthUserDelete(async (event) => {
  const { uid } = event.data;
  logger.info(`Auth user deleted, UID: ${uid}. Cleaning up Firestore data.`);

  const userDocRef = db.doc(`users/${uid}`);
  const metadataRef = db.doc('system/metadata');

  try {
    // Get the metadata document first to check if it exists
    const metadataDoc = await metadataRef.get();

    const batch = db.batch();

    // 1. Delete the user's document from Firestore
    batch.delete(userDocRef);

    // 2. Atomically decrement the user count only if the metadata doc exists
    // and the count is greater than 0. This prevents errors on a non-existent doc.
    if (metadataDoc.exists && (metadataDoc.data()?.userCount || 0) > 0) {
      batch.update(metadataRef, {
        userCount: admin.firestore.FieldValue.increment(-1),
      });
    }

    await batch.commit();
    logger.info(`Successfully cleaned up data for user ${uid}.`);
  } catch (error) {
    logger.error(`Error during user cleanup for ${uid}:`, error, "This may happen if the userCount document doesn't exist or the user doc was already deleted. It's usually safe to ignore in development if the user count is being decremented.");
  }
});
