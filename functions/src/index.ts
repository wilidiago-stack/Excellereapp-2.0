import {setGlobalOptions} from "firebase-functions/v2";
import {
  onAuthUserCreated,
  onAuthUserDeleted,
} from "firebase-functions/v2/identity";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({maxInstances: 10});

/**
 * Initial setup for new users.
 */
export const setupInitialUserRole = onAuthUserCreated(async (event) => {
  if (!event.data) {
    logger.error("No user data in event");
    return;
  }

  const {uid, email, displayName} = event.data;
  const userDocRef = db.doc(`users/${uid}`);
  const metadataRef = db.doc("system/metadata");

  try {
    const nameParts = displayName?.split(" ") || [];
    const firstName = nameParts[0] || (email ? email.split("@")[0] : "New");
    const lastName = nameParts.slice(1).join(" ") || "User";

    await db.runTransaction(async (transaction) => {
      const metadataDoc = await transaction.get(metadataRef);
      const userCount = metadataDoc.exists ?
        metadataDoc.data()?.userCount || 0 : 0;

      const assignedRole = userCount === 0 ? "admin" : "viewer";

      const userData = {
        firstName,
        lastName,
        email: email || "",
        role: assignedRole,
        status: "active",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      transaction.set(userDocRef, userData, {merge: true});
      transaction.set(metadataRef, {userCount: userCount + 1}, {merge: true});

      await admin.auth().setCustomUserClaims(uid, {role: assignedRole});
    });

    logger.info(`[setupInitialUserRole] User ${uid} set up successfully.`);
  } catch (error) {
    logger.error(`[setupInitialUserRole] Error for ${uid}:`, error);
  }
});

/**
 * Sync role to Auth claims on Firestore update.
 */
export const onUserRoleChange = onDocumentUpdated(
  "users/{userId}",
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (beforeData?.role === afterData?.role) return;

    const userId = event.params.userId;
    const newRole = afterData?.role;

    if (!newRole) return;

    try {
      await admin.auth().setCustomUserClaims(userId, {role: newRole});
      logger.info(`[onUserRoleChange] Role synced for ${userId}: ${newRole}`);
    } catch (error) {
      logger.error(`[onUserRoleChange] Sync failed for ${userId}:`, error);
    }
  });

/**
 * Cleanup when a user is deleted.
 */
export const cleanupUser = onAuthUserDeleted(async (event) => {
  if (!event.data) return;
  const {uid} = event.data;
  const userDocRef = db.doc(`users/${uid}`);
  const metadataRef = db.doc("system/metadata");

  try {
    const batch = db.batch();
    batch.delete(userDocRef);
    batch.update(metadataRef, {
      userCount: admin.firestore.FieldValue.increment(-1),
    });
    await batch.commit();
  } catch (error) {
    logger.error(`[cleanupUser] Error for ${uid}:`, error);
  }
});
