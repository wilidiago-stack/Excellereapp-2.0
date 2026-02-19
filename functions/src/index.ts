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
 */
export const setupInitialUserRole = onAuthUserCreate(async (event) => {
  const {uid, email, displayName} = event.data;
  logger.info(`[setupInitialUserRole] UID: ${uid}`);

  const userDocRef = db.doc(`users/${uid}`);

  try {
    const nameParts = displayName?.split(" ").filter((p) => p.length > 0) || [];
    const firstName = nameParts[0] || (email ? email.split("@")[0] : "New");
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") :
      (email ? "(from email)" : "User");

    const newUserDocument = {
      firstName,
      lastName,
      email: email || "",
      role: "viewer",
      status: "active",
    };

    await userDocRef.set(newUserDocument);
    await admin.auth().setCustomUserClaims(uid, {role: "viewer"});

    const metadataRef = db.doc("system/metadata");
    await db.runTransaction(async (transaction) => {
      const metadataDoc = await transaction.get(metadataRef);
      const currentCount = metadataDoc.exists ?
        metadataDoc.data()?.userCount || 0 : 0;
      const newCount = currentCount + 1;

      if (metadataDoc.exists) {
        transaction.update(metadataRef, {userCount: newCount});
      } else {
        transaction.set(metadataRef, {userCount: newCount});
      }
    });

    logger.info(`[setupInitialUserRole] Setup complete for ${uid}.`);
  } catch (error) {
    logger.error(`[setupInitialUserRole] Error for ${uid}:`, error);
  }
});

/**
 * Triggered on user deletion from Firebase Authentication.
 */
export const cleanupUser = onAuthUserDelete(async (event) => {
  const {uid} = event.data;
  logger.info(`[cleanupUser] UID: ${uid}`);

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
    logger.info(`[cleanupUser] Cleanup complete for ${uid}.`);
  } catch (error) {
    logger.error(`[cleanupUser] Error for ${uid}:`, error);
  }
});

/**
 * Syncs the 'role' from Firestore document to Firebase Auth custom claims.
 */
export const onUserRoleChange = onDocumentUpdated("users/{userId}",
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!afterData?.role || typeof afterData.role !== "string" ||
        (beforeData && beforeData.role === afterData.role)) {
      return;
    }

    const uid = event.params.userId;
    const newRole = afterData.role;

    try {
      await admin.auth().setCustomUserClaims(uid, {role: newRole});
      logger.info(`[onUserRoleChange] Synced role '${newRole}' for ${uid}.`);
    } catch (error) {
      logger.error(`[onUserRoleChange] Sync failed for ${uid}:`, error);
    }
  });
