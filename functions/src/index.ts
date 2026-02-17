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
 * This function creates a user document in Firestore with basic profile information
 * and assigns a role.
 * - The very first user is made an 'admin'.
 * - Subsequent users are made 'viewers'.
 * - It populates the user document with name and email if available from the auth provider.
 */
export const setupInitialUserRole = onAuthUserCreate(async (event) => {
  const { uid, email, displayName } = event.data;
  logger.info(`New Auth user created, UID: ${uid}, Email: ${email}. Setting up user document and role.`);

  const userDocRef = db.doc(`users/${uid}`);
  const metadataRef = db.doc("system/metadata");

  try {
    const role = await db.runTransaction(async (transaction) => {
      const metadataDoc = await transaction.get(metadataRef);
      const userCount = metadataDoc.exists ? metadataDoc.data()?.userCount || 0 : 0;
      
      const isFirstUser = userCount === 0;
      const newRole = isFirstUser ? "admin" : "viewer";

      logger.info(`User count is ${userCount}. Assigning role '${newRole}' to user ${uid}.`);
      
      const nameParts = displayName?.split(' ') || [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const userData: { [key: string]: any } = {
        role: newRole,
        status: 'active',
      };

      if (email) userData.email = email;
      // Only set name if displayName exists. For email/pass sign up, the client provides a more detailed
      // user document, and this function will simply merge the role and status.
      // For social sign up, this creates the initial document with the name from the provider.
      if (displayName) {
        userData.firstName = firstName;
        userData.lastName = lastName;
      }

      transaction.set(userDocRef, userData, { merge: true });

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
