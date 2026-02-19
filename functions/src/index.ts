import {setGlobalOptions} from "firebase-functions/v2";
import {onAuthUserCreated, onAuthUserDeleted} from "firebase-functions/v2/identity";
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
  if (!event.data) return;
  const {uid, email, displayName} = event.data;
  const userDocRef = db.doc(`users/${uid}`);
  const metadataRef = db.doc("system/metadata");

  try {
    const parts = displayName?.split(" ") || [];
    const firstName = parts[0] || (email ? email.split("@")[0] : "New");
    const lastName = parts.slice(1).join(" ") || "User";

    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(metadataRef);
      const count = snap.exists ? snap.data()?.userCount || 0 : 0;
      const role = count === 0 ? "admin" : "viewer";

      transaction.set(userDocRef, {
        firstName,
        lastName,
        email: email || "",
        role,
        status: "active",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});

      transaction.set(metadataRef, {userCount: count + 1}, {merge: true});
      await admin.auth().setCustomUserClaims(uid, {role});
    });
    logger.info(`[setupInitialUserRole] User ${uid} set up successfully.`);
  } catch (error) {
    logger.error(`[setupInitialUserRole] Error for ${uid}:`, error);
  }
});

/**
 * Sync role to Auth claims on Firestore update.
 */
export const onUserRoleChange = onDocumentUpdated("users/{userId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after?.role || before?.role === after.role) return;

    const uid = event.params.userId;
    try {
      await admin.auth().setCustomUserClaims(uid, {role: after.role});
      logger.info(`[onUserRoleChange] Role synced for ${uid}: ${after.role}`);
    } catch (error) {
      logger.error(`[onUserRoleChange] Sync failed for ${uid}:`, error);
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