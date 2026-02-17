import {setGlobalOptions} from "firebase-functions/v2";
import {onAuthUserCreate, onAuthUserDelete} from "firebase-functions/v2/auth";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ maxInstances: 10 });

/**
 * Configuración inicial para nuevos usuarios.
 */
export const setupInitialUserRole = onAuthUserCreate(async (event) => {
  const { uid, email, displayName } = event.data;
  const userDocRef = db.doc(`users/${uid}`);
  const metadataRef = db.doc("system/metadata");

  try {
    const role = "viewer";
    const nameParts = displayName?.split(' ') || [];
    const firstName = nameParts[0] || (email ? email.split('@')[0] : 'New');
    const lastName = nameParts.slice(1).join(' ') || 'User';

    const userData = {
      id: uid,
      firstName,
      lastName,
      email: email || '',
      role: role,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.runTransaction(async (transaction) => {
      const metadataDoc = await transaction.get(metadataRef);
      const userCount = metadataDoc.exists ? metadataDoc.data()?.userCount || 0 : 0;
      
      transaction.set(userDocRef, userData, { merge: true });
      transaction.set(metadataRef, { userCount: userCount + 1 }, { merge: true });
    });

    await admin.auth().setCustomUserClaims(uid, { role });
    logger.info(`[setupInitialUserRole] User ${uid} set up with role ${role}`);

  } catch (error) {
    logger.error(`[setupInitialUserRole] Error for ${uid}:`, error);
  }
});

/**
 * Sincronización DEFINITIVA de roles entre Firestore, Auth y Reglas de Seguridad.
 */
export const onUserRoleChange = onDocumentUpdated("users/{userId}", async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();

  if (beforeData?.role === afterData?.role) return;

  const userId = event.params.userId;
  const newRole = afterData?.role;

  if (!newRole) return;

  try {
    // 1. Actualizar Custom Claims (para acceso en UI y reglas .token.role)
    await admin.auth().setCustomUserClaims(userId, { role: newRole });
    
    // 2. Sincronizar marcador de Admin (para independencia de autorización en reglas exists())
    const adminMarkerRef = db.doc(`system_roles_admin/${userId}`);
    if (newRole === 'admin') {
      await adminMarkerRef.set({ 
        assignedAt: admin.firestore.FieldValue.serverTimestamp(),
        email: afterData.email 
      });
    } else {
      await adminMarkerRef.delete();
    }

    logger.info(`[onUserRoleChange] Role synced for ${userId}: ${newRole}`);
  } catch (error) {
    logger.error(`[onUserRoleChange] Sync failed for ${userId}:`, error);
  }
});

export const cleanupUser = onAuthUserDelete(async (event) => {
  const { uid } = event.data;
  const userDocRef = db.doc(`users/${uid}`);
  const adminMarkerRef = db.doc(`system_roles_admin/${uid}`);
  const metadataRef = db.doc('system/metadata');

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