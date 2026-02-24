import {setGlobalOptions} from "firebase-functions/v2";
import {onUserCreated, AuthEvent} from "firebase-functions/v2/auth";
import {
  onDocumentUpdated,
  FirestoreEvent,
  Change,
  QueryDocumentSnapshot,
} from "firebase-functions/v2/firestore";
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
export const setupInitialUserRole = onUserCreated(async (event: AuthEvent) => {
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

    const nameParts = displayName?.split(" ")
      .filter((p: string) => p.length > 0) || [];
    const firstName = nameParts[0] || (email ? email.split("@")[0] : "New");
    const lastName = nameParts.length > 1 ?
      nameParts.slice(1).join(" ") : (email ? "(from email)" : "User");

    const role = isFirstUser ? "admin" : "viewer";

    const defaultModules = isFirstUser ? [
      "dashboard", "projects", "users", "contractors",
      "daily-report", "monthly-report", "safety-events",
      "project-team", "documents", "calendar", "map", "weather",
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

    // CRITICAL: Set initial claims immediately including assignedProjects
    await admin.auth().setCustomUserClaims(uid, {
      role: role,
      assignedModules: defaultModules,
      assignedProjects: [],
    });

    logger.info(
      `[setupInitialUserRole] Setup complete for ${uid}. Role: ${role}`
    );
  } catch (error) {
    logger.error(`[setupInitialUserRole] Error for ${uid}:`, error);
  }
});

/**
 * Syncs changes from Firestore user document to Firebase Auth Custom Claims.
 */
export const onUserRoleChange = onDocumentUpdated(
  "users/{userId}",
  async (event: FirestoreEvent<Change<QueryDocumentSnapshot> | undefined>) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!afterData) return;

    const roleChanged = afterData.role !== beforeData?.role;
    const modulesChanged = JSON.stringify(afterData.assignedModules) !==
      JSON.stringify(beforeData?.assignedModules);
    const projectsChanged = JSON.stringify(afterData.assignedProjects) !==
      JSON.stringify(beforeData?.assignedProjects);

    if (!roleChanged && !modulesChanged && !projectsChanged) return;

    const uid = event.params.userId;
    logger.info(`[onUserRoleChange] Syncing claims for ${uid}.`);

    try {
      // Sync all critical security fields to the Auth Token
      await admin.auth().setCustomUserClaims(uid, {
        role: afterData.role || "viewer",
        assignedModules: afterData.assignedModules || [],
        assignedProjects: afterData.assignedProjects || [],
      });
    } catch (error) {
      logger.error(
        `[onUserRoleChange] Failed to set claims for ${uid}:`,
        error
      );
    }
  }
);
