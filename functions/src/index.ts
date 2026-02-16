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

  const nameParts = (displayName || '').split(' ');
  const firstName = nameParts.shift() || '';
  const lastName = nameParts.join(' ');

  try {
    // Determine the role and update Firestore within a single transaction.
    const role = await db.runTransaction(async (transaction) => {
      const metadataDoc = await transaction.get(metadataRef);
      const userCount = metadataDoc.exists ? metadataDoc.data()?.userCount || 0 : 0;
      
      const isFirstUser = userCount === 0;
      const newRole = isFirstUser ? "admin" : "viewer";

      logger.info(`User count is ${userCount}. Assigning role '${newRole}' to user ${uid}.`);

      // Firestore write operations
      // The client-side sign-up will also write user details. Using merge: true ensures
      // that this function safely adds the role and status without overwriting client-side data
      // and can also create the document if the client-side write hasn't happened yet.
      transaction.set(userDocRef, { 
        firstName,
        lastName,
        email: email || '',
        role: newRole, 
        status: 'active' 
      }, { merge: true });

      const newUserCount = userCount + 1;
      if (metadataDoc.exists) {
        transaction.update(metadataRef, { userCount: newUserCount });
      } else {
        transaction.set(metadataRef, { userCount: newUserCount });
      }
      
      // Return the determined role to be used outside the transaction
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
