import {setGlobalOptions} from "firebase-functions/v2";
import {onAuthUserCreate, onAuthUserDelete} from "firebase-functions/v2/auth";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({maxInstances: 10});

const ADMIN_EMAILS = ["andres.diago@outlook.com"];

/**
 * Initial setup for new users.
 * Automatically makes the first user an administrator.
 */
export const setupInitialUserRole = onAuthUserCreate(async (event) => {
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

      // Make the first registered user or dev emails admin automatically
      const isInitialAdmin = userCount === 0 ||
        (email && ADMIN_EMAILS.includes(email));
      const assignedRole = isInitialAdmin ? "admin" : "viewer";

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

      // Sync to claims immediately after transaction
      await admin.auth().setCustomUserClaims(uid, {role: assignedRole});

      // If admin, add to the fast-check collection
      if (assignedRole === "admin") {
        const adminMarkerRef = db.doc(`system_roles_admin/${uid}`);
        transaction.set(adminMarkerRef, {
          assignedAt: admin.firestore.FieldValue.serverTimestamp(),
          email: email,
        });
      }
    });

    logger.info(`[setupInitialUserRole] User ${uid} set up successfully.`);
  } catch (error) {
    logger.error(`[setupInitialUserRole] Error for ${uid}:`, error);
  }
});

/**
 * DEFINITIVE sync of roles between Firestore and Auth.
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

      const adminMarkerRef = db.doc(`system_roles_admin/${userId}`);
      if (newRole === "admin") {
        await adminMarkerRef.set({
          assignedAt: admin.firestore.FieldValue.serverTimestamp(),
          email: afterData.email,
        });
      } else {
        await adminMarkerRef.delete();
      }

      logger.info(`[onUserRoleChange] Role synced for ${userId}: ${newRole}`);
    } catch (error) {
      logger.error(`[onUserRoleChange] Sync failed for ${userId}:`, error);
    }
  });

/**
 * Cleanup when a user is deleted.
 */
export const cleanupUser = onAuthUserDelete(async (event) => {
  const {uid} = event.data;
  const userDocRef = db.doc(`users/${uid}`);
  const adminMarkerRef = db.doc(`system_roles_admin/${uid}`);
  const metadataRef = db.doc("system/metadata");

  try {
    const batch = db.batch();
    batch.delete(userDocRef);
    batch.delete(adminMarkerRef);
    batch.update(metadataRef, {
      userCount: admin.firestore.FieldValue.increment(-1),
    });
    await batch.commit();
  } catch (error) {
    logger.error(`[cleanupUser] Error for ${uid}:`, error);
  }
});
