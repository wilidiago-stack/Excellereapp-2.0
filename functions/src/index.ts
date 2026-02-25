import {setGlobalOptions} from "firebase-functions/v2";
import {onAuthUserCreate} from "firebase-functions/v2/auth";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({maxInstances: 10});

/**
 * Triggered on new user creation in Firebase Authentication.
 */
export const setupInitialUserRole = onAuthUserCreate(async (event) => {
  const {uid, email, displayName} = event.data;
  logger.info(`[setupInitialUserRole] UID: ${uid}`);

  const userDocRef = db.doc(`users/${uid}`);
  const metadataRef = db.doc("system/metadata");

  try {
    let isFirstUser = false;
    await db.runTransaction(async (transaction) => {
      const metadataDoc = await transaction.get(metadataRef);
      const data = metadataDoc.data();
      const currentCount = metadataDoc.exists ? data?.userCount || 0 : 0;
      if (currentCount === 0) isFirstUser = true;
      const newCount = currentCount + 1;
      if (metadataDoc.exists) {
        transaction.update(metadataRef, {userCount: newCount});
      } else {
        transaction.set(metadataRef, {userCount: newCount});
      }
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

    const newUserDocument = {
      firstName,
      lastName,
      email: email || "",
      role: role,
      status: "active",
      assignedModules: defaultModules,
      assignedProjects: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await userDocRef.set(newUserDocument);
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
 * Syncs changes from the Firestore user document to Custom Claims.
 */
export const onUserRoleChange = onDocumentUpdated("users/{userId}",
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!afterData) return;

    const rChanged = afterData.role !== beforeData?.role;
    const mChanged = JSON.stringify(afterData.assignedModules) !==
      JSON.stringify(beforeData?.assignedModules);
    const pChanged = JSON.stringify(afterData.assignedProjects) !==
      JSON.stringify(beforeData?.assignedProjects);

    if (!rChanged && !mChanged && !pChanged) return;
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
