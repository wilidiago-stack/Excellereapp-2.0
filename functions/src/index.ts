import {setGlobalOptions} from "firebase-functions/v2";
import {onAuthUserCreate, onAuthUserDelete} from "firebase-functions/v2/auth";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({maxInstances: 10});

interface AuthEvent {
  data: {
    uid: string;
    email?: string;
    displayName?: string;
  };
}

export const setupInitialUserRole = onAuthUserCreate(async (event: AuthEvent) => {
  const {uid, email, displayName} = event.data;
  const userDocRef = db.doc(`users/${uid}`);
  try {
    const nameParts = (displayName || "").split(" ").filter((p) => p.length > 0);
    const firstName = nameParts[0] || (email ? email.split("@")[0] : "New");
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "User";
    const newUser = {
      firstName,
      lastName,
      email: email || "",
      role: "viewer",
      status: "active",
      assignedModules: [],
      assignedProjects: [],
    };
    await userDocRef.set(newUser);
    await admin.auth().setCustomUserClaims(uid, {
      role: "viewer",
      assignedModules: [],
      assignedProjects: [],
    });
    const metadataRef = db.doc("system/metadata");
    await db.runTransaction(async (t) => {
      const doc = await t.get(metadataRef);
      const count = doc.exists ? doc.data()?.userCount || 0 : 0;
      t.set(metadataRef, {userCount: count + 1}, {merge: true});
    });
  } catch (error) {
    logger.error("setupInitialUserRole error", error);
  }
});

export const cleanupUser = onAuthUserDelete(async (event: AuthEvent) => {
  const {uid} = event.data;
  const userDocRef = db.doc(`users/${uid}`);
  const metadataRef = db.doc("system/metadata");
  try {
    await db.runTransaction(async (t) => {
      const doc = await t.get(metadataRef);
      const count = doc.exists ? doc.data()?.userCount || 0 : 0;
      t.delete(userDocRef);
      if (count > 0) {
        t.update(metadataRef, {userCount: count - 1});
      }
    });
  } catch (error) {
    logger.error("cleanupUser error", error);
  }
});

export const onUserRoleChange = onDocumentUpdated("users/{userId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after || JSON.stringify(before) === JSON.stringify(after)) return;
    const uid = event.params.userId;
    const claims = {
      role: after.role || "viewer",
      assignedModules: after.assignedModules || [],
      assignedProjects: after.assignedProjects || [],
    };
    try {
      await admin.auth().setCustomUserClaims(uid, claims);
    } catch (error) {
      logger.error("onUserRoleChange error", error);
    }
  });
