import {setGlobalOptions} from "firebase-functions/v2";
import {onAuthUserCreate} from "firebase-functions/v2/auth";
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
  const { uid } = event.data;
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
      // This is more robust as it creates the doc if it doesn't exist (handling race conditions)
      // or merges the role if the client created the doc first.
      transaction.set(userDocRef, { role, status: 'active' }, { merge: true });

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
