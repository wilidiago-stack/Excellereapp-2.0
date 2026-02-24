import {setGlobalOptions} from "firebase-functions/v2";
import * as identity from "firebase-functions/v2/identity";
import * as firestore from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({maxInstances: 10});

/**
 * Registra el rol inicial y claims al crear un usuario.
 */
export const setupInitialUserRole = identity.onAuthUserCreated(
  async (event: identity.AuthEvent) => {
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

      const parts = displayName?.split(" ").filter((p) => p.length > 0) || [];
      const fName = parts[0] || (email ? email.split("@")[0] : "New");
      const lName = parts.length > 1 ? parts.slice(1).join(" ") : "User";

      const role = isFirstUser ? "admin" : "viewer";
      const modules = isFirstUser ? ["dashboard", "projects", "users"] : [];

      const newUser = {
        firstName: fName,
        lastName: lName,
        email: email || "",
        role: role,
        status: "active",
        assignedModules: modules,
        assignedProjects: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await userDocRef.set(newUser);
      await admin.auth().setCustomUserClaims(uid, {
        role: role,
        assignedModules: modules,
        assignedProjects: [],
      });

      logger.info(`[setupInitialUserRole] Done for ${uid}. Role: ${role}`);
    } catch (error) {
      logger.error(`[setupInitialUserRole] Error for ${uid}:`, error);
    }
  }
);

/**
 * Sincroniza cambios de Firestore a Custom Claims.
 */
export const onUserRoleChange = firestore.onDocumentUpdated(
  "users/{userId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!after) return;

    const rChanged = after.role !== before?.role;
    const mChanged = JSON.stringify(after.assignedModules) !==
                     JSON.stringify(before?.assignedModules);
    const pChanged = JSON.stringify(after.assignedProjects) !==
                     JSON.stringify(before?.assignedProjects);

    if (!rChanged && !mChanged && !pChanged) return;

    const uid = event.params.userId;
    logger.info(`[onUserRoleChange] Syncing claims for ${uid}.`);

    try {
      await admin.auth().setCustomUserClaims(uid, {
        role: after.role || "viewer",
        assignedModules: after.assignedModules || [],
        assignedProjects: after.assignedProjects || [],
      });
    } catch (error) {
      logger.error(`[onUserRoleChange] Failed for ${uid}:`, error);
    }
  }
);

export {menuSuggestion} from "./genkit-sample";
