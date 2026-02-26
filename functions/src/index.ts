
import { setGlobalOptions } from "firebase-functions/v2";
import { onAuthUserCreated } from "firebase-functions/v2/identity";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

setGlobalOptions({ maxInstances: 10, region: "us-central1" });

export const setupInitialUserRole = onAuthUserCreated(async (event: any) => {
  const data = event.data;
  if (!data) {
    logger.error("No user data found in event");
    return;
  }

  const { uid, email, displayName } = data;
  logger.info(`[setupInitialUserRole] Processing UID: ${uid}`);

  const userDocRef = db.collection("users").doc(uid);
  const metadataRef = db.collection("system").doc("metadata");

  try {
    let isFirstUser = false;

    await db.runTransaction(async (transaction) => {
      const metadataDoc = await transaction.get(metadataRef);
      const mData = metadataDoc.data();
      const currentCount = metadataDoc.exists ? (mData?.userCount || 0) : 0;

      if (currentCount === 0) {
        isFirstUser = true;
      }

      const newCount = currentCount + 1;
      transaction.set(metadataRef, { userCount: newCount }, { merge: true });
    });

    const nameParts = (displayName || "").split(" ").filter((p: string) => 
      p.length > 0
    );
    const firstName = nameParts[0] || (email ? email.split("@")[0] : "New");
    const lastName = nameParts.length > 1 
      ? nameParts.slice(1).join(" ") 
      : "User";
    
    const role = isFirstUser ? "admin" : "viewer";
    
    const defaultModules = isFirstUser ? [
      "dashboard", "projects", "users", "contractors",
      "daily-report", "monthly-report", "safety-events",
      "project-team", "documents", "project-aerial-view",
      "calendar", "map", "capex", "reports-analytics",
      "schedule", "weather"
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

    await userDocRef.set(newUserDocument, { merge: true });

    await admin.auth().setCustomUserClaims(uid, {
      role: role,
      assignedModules: defaultModules,
      assignedProjects: [],
    });

    logger.info(`[setupInitialUserRole] Successfully set up ${uid} as ${role}`);
  } catch (error) {
    logger.error(`[setupInitialUserRole] Error for ${uid}:`, error);
  }
});

export const onUserRoleChange = onDocumentUpdated("users/{userId}", 
  async (event: any) => {
    const change = event.data;
    if (!change) return;

    const beforeData = change.before.data();
    const afterData = change.after.data();
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
      logger.info(`[onUserRoleChange] Updated claims for UID: ${uid}`);
    } catch (error) {
      logger.error(`[onUserRoleChange] Failed for ${uid}:`, error);
    }
});
