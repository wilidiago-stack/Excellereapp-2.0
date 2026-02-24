import {setGlobalOptions} from "firebase-functions/v2";
import {onAuthUserCreated} from "firebase-functions/v2/identity";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Initialize Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Set global options
setGlobalOptions({maxInstances: 10});

/**
 * Triggered on new user creation in Firebase Authentication.
 */
export const setupInitialUserRole = onAuthUserCreated(
  async (event) => {
    const {uid, email, displayName} = event.data;
    logger.info(`[setupInitialUserRole] UID: ${uid}`);

    const userDocRef = db.doc(`users/${uid}`);
    const metadataRef = db.doc("system/metadata");

    try {
      let isFirstUser = false;
      await db.runTransaction(async (transaction) => {
        const metadataDoc = await transaction.get(metadataRef);
        const currentCount = metadataDoc.exists ?
          metadataDoc.data()?.userCount || 0 : 0;

        if (currentCount === 0) {
          isFirstUser = true;
        }

        const newCount = currentCount + 1;
        if (metadataDoc.exists) {
          transaction.update(metadataRef, {userCount: newCount});
        } else {
          transaction.set(metadataRef, {userCount: newCount});
        }
      });

      const parts = displayName?.split(" ").filter((p: string) =>
        p.length > 0) || [];
      const fName = parts[0] || (email ? email.split("@")[0] : "New");
      const lName = parts.length > 1 ? parts.slice(1).join(" ") : "User";

      const role = isFirstUser ? "admin" : "viewer";

      const mods = isFirstUser ? [
        "dashboard", "projects", "users", "contractors",
        "daily-report", "monthly-report", "safety-events",
        "project-team", "documents", "calendar", "map", "weather",
        "reports-analytics",
      ] : [];

      const newUserDocument = {
        firstName: fName,
        lastName: lName,
        email: email || "",
        role: role,
        status: "active",
        assignedModules: mods,
        assignedProjects: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await userDocRef.set(newUserDocument);

      await admin.auth().setCustomUserClaims(uid, {
        role: role,
        assignedModules: mods,
        assignedProjects: [],
      });

      logger.info(`[setupInitialUserRole] Complete for ${uid}. Role: ${role}`);
    } catch (error) {
      logger.error(`[setupInitialUserRole] Error for ${uid}:`, error);
    }
  },
);

/**
 * Syncs changes from the Firestore user document to Custom Claims.
 */
export const onUserRoleChange = onDocumentUpdated(
  "users/{userId}",
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
    logger.info(`[onUserRoleChange] Syncing claims for ${uid}`);

    try {
      await admin.auth().setCustomUserClaims(uid, {
        role: afterData.role || "viewer",
        assignedModules: afterData.assignedModules || [],
        assignedProjects: afterData.assignedProjects || [],
      });
    } catch (error) {
      logger.error(`[onUserRoleChange] Failed for ${uid}:`, error);
    }
  },
);
