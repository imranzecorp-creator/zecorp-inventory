import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Robust initialization for proxied environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId || '(default)');

// Test connection on boot
const testConnection = async () => {
  try {
    console.log('[Firestore] Testing connectivity to:', firebaseConfig.firestoreDatabaseId);
    const checkDoc = doc(db, '_system_', 'connectivity_check');
    await getDocFromServer(checkDoc);
    console.log('[Firestore] Connection SUCCESS');
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.log('[Firestore] Connection verified (Permission Denied).');
    } else {
      console.warn('[Firestore] Connectivity failure:', error?.code, error?.message);
    }
  }
};

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
  const message = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: message,
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
  
  // Do not throw for connectivity issues to avoid crashing the entire app UI
  // Connectivity issues are often transient or environment-specific (proxies)
  const isConnectivityIssue = 
    message.includes('unavailable') || 
    message.includes('offline') || 
    message.includes('Could not reach Cloud Firestore backend');
    
  if (isConnectivityIssue) {
    console.warn('[Firestore] Suppressing throw for connectivity issue to prevent crash loop.');
    return;
  }
  
  throw new Error(JSON.stringify(errInfo));
}
