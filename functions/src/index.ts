import {setGlobalOptions} from "firebase-functions/v2";
import {onAuthUserCreated} from "firebase-functions/v2/auth";
import type {AuthEvent} from "firebase-functions/v2/auth";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import type {
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
export const setupInitialUserRole = onAuthUserCreated(
  async (event: AuthEvent) => {
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
      const fName = nameParts[0] || (email ? email.split("@")[0] : "New");
      const lName = nameParts.length > 1 ?
        nameParts.slice(1).join(" ") : (email ? "(email)" : "User");

      const role = isFirstUser ? "admin" : "viewer";

      const defaultModules = isFirstUser ? [
        "dashboard", "projects", "users", "contractors",
        "daily-report", "monthly-report", "safety-events",
        "project-team", "documents", "calendar", "map", "weather",
      ] : [];

      const newUserDocument = {
        firstName: fName,
        lastName: lName,
        email: email || "",
        role: role,
        status: "active",
        assignedModules: defaultModules,
        assignedProjects: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await userDocRef.set(newUserDocument);

      // CRITICAL: Set initial claims immediately
      await admin.auth().setCustomUserClaims(uid, {
        role: role,
        assignedModules: defaultModules,
        assignedProjects: [],
      });

      logger.info(
        `[setupInitialUserRole] Setup for ${uid} complete. Role: ${role}`
      );
    } catch (error) {
      logger.error(`[setupInitialUserRole] Error for ${uid}:`, error);
    }
  }
);

/**
 * Syncs changes from Firestore user document to Custom Claims.
 */
export const onUserRoleChange = onDocumentUpdated(
  "users/{userId}",
  async (event: FirestoreEvent<
    Change<QueryDocumentSnapshot> | undefined
  >) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!afterData) return;

    const rChanged = afterData.role !== beforeData?.role;
    const mB = JSON.stringify(beforeData?.assignedModules || []);
    const mA = JSON.stringify(afterData.assignedModules || []);
    const pB = JSON.stringify(beforeData?.assignedProjects || []);
    const pA = JSON.stringify(afterData.assignedProjects || []);

    const mChanged = mB !== mA;
    const pChanged = pB !== pA;

    if (!rChanged && !mChanged && !pChanged) return;

    const uid = event.params.userId;
    logger.info(`[onUserRoleChange] Syncing claims for ${uid}.`);

    try {
      await admin.auth().setCustomUserClaims(uid, {
        role: afterData.role || "viewer",
        assignedModules: afterData.assignedModules || [],
        assignedProjects: afterData.assignedProjects || [],
      });
    } catch (error) {
      logger.error(`[onUserRoleChange] Failed for ${uid}:`, error);
    }
  }
);

export {menuSuggestion} from "./genkit-sample";
