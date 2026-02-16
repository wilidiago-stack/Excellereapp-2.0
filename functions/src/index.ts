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
 * This function assigns a role to the new user.
 * - A specific user is designated as 'admin' by their email.
 * - The very first user to sign up is also granted 'admin' role as a fallback.
 * - All other users are assigned the 'viewer' role.
 */
export const setupInitialUserRole = onAuthUserCreate(async (event) => {
  const { uid, email } = event.data;
  logger.info(`New Auth user created, UID: ${uid}, Email: ${email}. Setting up role.`);

  const userDocRef = db.doc(`users/${uid}`);
  const metadataRef = db.doc("system/metadata");

  try {
    const role = await db.runTransaction(async (transaction) => {
      const metadataDoc = await transaction.get(metadataRef);
      const userCount = metadataDoc.exists ? metadataDoc.data()?.userCount || 0 : 0;
      
      const newRole = "admin";

      logger.info(`User count is ${userCount}. Assigning role '${newRole}' to user ${uid}.`);

      // Using set with merge is safe because it creates or merges fields without overwriting the whole document.
      // The client is responsible for adding other profile details (firstName, lastName, etc.).
      transaction.set(userDocRef, { 
        role: newRole, 
        status: 'active' 
      }, { merge: true });

      // Increment the total user count.
      const newUserCount = userCount + 1;
      if (metadataDoc.exists) {
        transaction.update(metadataRef, { userCount: newUserCount });
      } else {
        transaction.set(metadataRef, { userCount: newUserCount });
      }
      
      return newRole;
    });

    // AFTER the transaction is successful, set the custom claim.
    logger.info(`Transaction successful. Setting custom claim '${role}' for user ${uid}.`);
    await admin.auth().setCustomUserClaims(uid, { role });

    logger.info(`Successfully set up role, metadata, and custom claim for user ${uid}.`);

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
