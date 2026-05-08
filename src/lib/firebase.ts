import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer, getDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Robust initializeFirestore call using the latest SDK pattern
const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, databaseId);

// Test connection on boot and log status for debugging
const testConnection = async () => {
  try {
    // Attempt a lightweight server read with a timeout to confirm connectivity
    const checkDoc = doc(db, '_system_', 'connectivity_check');
    await getDocFromServer(checkDoc);
    console.log('[Firestore] Connection verified to database:', databaseId);
  } catch (error: any) {
    // If we get "permission-denied", it actually means we SUCCESSFULLY connected to the backend
    // but the rules rejected us (which is still proof of connectivity).
    if (error?.code === 'permission-denied') {
      console.log('[Firestore] Connection verified via server rejection (Permission Denied).');
      return;
    }

    if (error?.code === 'unavailable' || error?.message?.includes('offline') || error?.code === 'failed-precondition') {
      console.warn(`[Firestore] Connectivity warning (${error?.code}): Backend unreachable. check databaseId: ${databaseId}`);
    } else {
      console.error('[Firestore] Connection error:', error);
    }
  }
};

// Execute test connection but don't block boot
testConnection();

export const auth = getAuth(app);
export const storage = getStorage(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
