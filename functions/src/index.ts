import {setGlobalOptions} from "firebase-functions/v2";
import {onUserCreated} from "firebase-functions/v2/auth";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Initialize Firebase Admin SDK.
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// Global configuration for functions.
setGlobalOptions({maxInstances: 10, region: "us-central1"});

/**
 * Triggered on new user creation in Firebase Authentication.
 * Sets initial roles and default modules.
 */
export const setupInitialUserRole = onUserCreated(async (event) => {
  const user = event.data;
  if (!user) return;

  const {uid, email, displayName} = user;
  logger.info(`[setupInitialUserRole] Processing UID: ${uid}`);

  const userDocRef = db.doc(`users/${uid}`);
  const metadataRef = db.doc("system/metadata");

  try {
    let isFirstUser = false;
    await db.runTransaction(async (transaction) => {
      const metadataDoc = await transaction.get(metadataRef);
      const currentCount = metadataDoc.exists ?
        (metadataDoc.data()?.userCount || 0) : 0;
      if (currentCount === 0) isFirstUser = true;
      const newCount = currentCount + 1;
      transaction.set(metadataRef, {userCount: newCount}, {merge: true});
    });

    const nameParts = displayName?.split(" ").filter((p) => p.length > 0) || [];
    const firstName = nameParts[0] || (email ? email.split("@")[0] : "New");
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "User";
    const role = isFirstUser ? "admin" : "viewer";
    const defaultModules = isFirstUser ? [
      "dashboard", "projects", "users", "contractors",
      "daily-report", "monthly-report", "safety-events",
      "project-team", "documents", "calendar", "map", "weather",
      "reports-analytics",
    ] : [];

    await userDocRef.set({
      firstName,
      lastName,
      email: email || "",
      role: role,
      status: "active",
      assignedModules: defaultModules,
      assignedProjects: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});

    await admin.auth().setCustomUserClaims(uid, {
      role: role,
      assignedModules: defaultModules,
      assignedProjects: [],
    });
  } catch (error) {
    logger.error(`[setupInitialUserRole] Error for ${uid}:`, error);
  }
});

/**
 * Syncs changes from the Firestore user document to Auth Custom Claims.
 */
export const onUserRoleChange = onDocumentUpdated("users/{userId}",
  async (event) => {
    const afterData = event.data?.after.data();
    if (!afterData) return;

    const uid = event.params.userId;
    try {
      await admin.auth().setCustomUserClaims(uid, {
        role: afterData.role || "viewer",
        assignedModules: afterData.assignedModules || [],
        assignedProjects: afterData.assignedProjects || [],
      });
    } catch (error) {
      logger.error(`[onUserRoleChange] Failed for ${uid}:`, error);
    }
  });
