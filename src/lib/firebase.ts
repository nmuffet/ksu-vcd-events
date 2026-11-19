import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';
import { CommunityEvent, EventSubmissionInput } from '../types';

const configModules = import.meta.glob('../../firebase-applet-config.json', { eager: true }) as Record<string, { default?: any }>;
const rawConfig: any = Object.values(configModules)[0]?.default || Object.values(configModules)[0] || {};

const DEFAULT_PUBLIC_FIREBASE_CONFIG = {
  projectId: 'gen-lang-client-0459526146',
  appId: '1:1066846972176:web:9f875683ad2fff025d5d95',
  apiKey: 'AIzaSyAkSJ5znxH5VuwSuv1qkv8NcSUmMkvb02o',
  authDomain: 'gen-lang-client-0459526146.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-vcdevents-486e46a0-43fd-4f60-ba11-0b6d6280b2e7',
  storageBucket: 'gen-lang-client-0459526146.firebasestorage.app',
  messagingSenderId: '1066846972176',
};

const configuredAuthDomain =
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
  rawConfig?.authDomain ||
  DEFAULT_PUBLIC_FIREBASE_CONFIG.authDomain;

const shouldUseSameOriginAuthDomain = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (window.location.protocol !== 'https:') return false;
  const host = window.location.hostname.toLowerCase();
  if (!host || host === 'localhost' || host.startsWith('127.')) return false;
  return (
    host.endsWith('.run.app') ||
    host.endsWith('.ai.studio') ||
    host.endsWith('.firebaseapp.com') ||
    host.endsWith('.web.app')
  );
};

const envApiKey =
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_API_KEY !== 'AIzaSyCeLuCNdJp5LwTa5eUimk7caZCuMOUdgu8'
    ? import.meta.env.VITE_FIREBASE_API_KEY
    : '';

const envMeasurementId =
  import.meta.env.VITE_FIREBASE_MEASUREMENT_ID &&
  import.meta.env.VITE_FIREBASE_MEASUREMENT_ID !== 'none'
    ? import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
    : '';

// Merge firebase-applet-config.json with valid environment overrides and provisioned defaults
const firebaseConfig = {
  apiKey: rawConfig?.apiKey || envApiKey || DEFAULT_PUBLIC_FIREBASE_CONFIG.apiKey,
  authDomain: shouldUseSameOriginAuthDomain() ? window.location.host : configuredAuthDomain,
  projectId: rawConfig?.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_PUBLIC_FIREBASE_CONFIG.projectId,
  storageBucket: rawConfig?.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || DEFAULT_PUBLIC_FIREBASE_CONFIG.storageBucket,
  messagingSenderId: rawConfig?.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_PUBLIC_FIREBASE_CONFIG.messagingSenderId,
  appId: rawConfig?.appId || (envApiKey ? import.meta.env.VITE_FIREBASE_APP_ID : '') || DEFAULT_PUBLIC_FIREBASE_CONFIG.appId,
  measurementId: rawConfig?.measurementId || envMeasurementId || '',
  firestoreDatabaseId: rawConfig?.firestoreDatabaseId || import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || DEFAULT_PUBLIC_FIREBASE_CONFIG.firestoreDatabaseId,
};

// Check if valid API key exists
const hasValidConfig = typeof firebaseConfig.apiKey === 'string' &&
  firebaseConfig.apiKey.length > 10 &&
  !firebaseConfig.apiKey.includes('YOUR_');

// Initialize Firebase App safely
export const app = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

export const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

let authInstance: Auth | null = null;
try {
  if (hasValidConfig) {
    authInstance = getAuth(app);
  }
} catch (err) {
  console.warn('Firebase Auth failed to initialize:', err);
}
export const auth = authInstance;

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const ADMIN_EMAILS: string[] = [
  'nmuffet@gmail.com',
];

export const isAuthorizedAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.some((adminEmail) => adminEmail.toLowerCase() === email.trim().toLowerCase());
};

export const ADMIN_EMAIL = ADMIN_EMAILS[0];

export async function waitForAuthReady(): Promise<void> {
  if (!auth) return;
  try {
    if (typeof auth.authStateReady === 'function') {
      await auth.authStateReady();
    }
  } catch {
    // ignore
  }
}

export async function getAdminIdToken(forceRefresh = false): Promise<string | null> {
  await waitForAuthReady();
  if (!auth?.currentUser || !isAuthorizedAdminEmail(auth.currentUser.email)) {
    return null;
  }
  try {
    return await auth.currentUser.getIdToken(forceRefresh);
  } catch {
    return null;
  }
}

export async function loginWithGoogle(): Promise<User | null> {
  if (!auth) {
    throw new Error('Firebase Auth is not available. Please use the Moderator Passphrase instead.');
  }
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function logoutUser(): Promise<void> {
  if (auth) {
    await signOut(auth);
  }
}

// Connection Test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
if (hasValidConfig) {
  testConnection();
}

// Standard Error Handling for Firestore
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
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Database APIs
export const firestoreApi = {
  // Fetch public approved upcoming events from Firestore
  async getApprovedEvents(): Promise<CommunityEvent[]> {
    const eventsPath = 'events';
    try {
      const q = query(collection(db, eventsPath), where('status', '==', 'approved'));
      const snapshot = await getDocs(q);
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      const list: CommunityEvent[] = [];
      snapshot.forEach((docSnap) => {
        const item = docSnap.data() as CommunityEvent;
        if (item.date >= todayStr) {
          list.push(item);
        }
      });

      return list.sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, eventsPath);
      return [];
    }
  },

  // Seed initial events into Firestore if none exist
  async seedInitialDataIfEmpty(): Promise<void> {
    // No demo data
  },

  // Submit new event (anonymous community submission directly to Firestore)
  async submitEvent(input: EventSubmissionInput): Promise<CommunityEvent> {
    const id = `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const newEvent: CommunityEvent = {
      id,
      title: input.title.trim(),
      date: input.date.trim(),
      time: input.time.trim(),
      startTime: input.startTime?.trim() || undefined,
      endTime: input.endTime?.trim() || undefined,
      isAllDay: input.isAllDay,
      location: input.location.trim(),
      description: input.description.trim(),
      contactEmail: input.contactEmail?.trim() || undefined,
      url: input.url?.trim() || undefined,
      suggestedEditForId: input.suggestedEditForId?.trim() || undefined,
      suggestedEditTitle: input.suggestedEditTitle?.trim() || undefined,
      notes: input.suggestionReason ? `Suggested edit note: ${input.suggestionReason.trim()}` : undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // Clean undefined fields for Firestore
    const payload: Record<string, any> = {
      id: newEvent.id,
      title: newEvent.title,
      date: newEvent.date,
      time: newEvent.time,
      location: newEvent.location,
      description: newEvent.description,
      status: newEvent.status,
      createdAt: newEvent.createdAt,
    };
    if (newEvent.startTime) payload.startTime = newEvent.startTime;
    if (newEvent.endTime) payload.endTime = newEvent.endTime;
    if (newEvent.isAllDay !== undefined) payload.isAllDay = newEvent.isAllDay;
    if (newEvent.contactEmail) payload.contactEmail = newEvent.contactEmail;
    if (newEvent.url) payload.url = newEvent.url;
    if (newEvent.suggestedEditForId) payload.suggestedEditForId = newEvent.suggestedEditForId;
    if (newEvent.suggestedEditTitle) payload.suggestedEditTitle = newEvent.suggestedEditTitle;
    if (newEvent.notes) payload.notes = newEvent.notes;

    const eventDocPath = `events/${id}`;
    try {
      await setDoc(doc(db, 'events', id), payload);
      return newEvent;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, eventDocPath);
      throw error;
    }
  },

  // Track event by ID
  async trackEvent(id: string): Promise<CommunityEvent | null> {
    const docPath = `events/${id}`;
    try {
      const docSnap = await getDoc(doc(db, 'events', id));
      if (docSnap.exists()) {
        return docSnap.data() as CommunityEvent;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, docPath);
      return null;
    }
  },

  // Admin: Get all events (pending, approved, rejected)
  async getAdminEvents(): Promise<CommunityEvent[]> {
    const eventsPath = 'events';
    try {
      const snapshot = await getDocs(collection(db, eventsPath));
      const list: CommunityEvent[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as CommunityEvent);
      });
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, eventsPath);
      return [];
    }
  },

  // Admin: Approve event
  async approveEvent(id: string, notes?: string): Promise<void> {
    const docPath = `events/${id}`;
    try {
      const updates: Record<string, any> = {
        status: 'approved',
        reviewedAt: new Date().toISOString(),
        reviewedBy: auth?.currentUser?.displayName || 'Nick',
      };
      if (notes) {
        updates.notes = notes;
      }
      await updateDoc(doc(db, 'events', id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  },

  // Admin: Reject event
  async rejectEvent(id: string, notes?: string): Promise<void> {
    const docPath = `events/${id}`;
    try {
      const updates: Record<string, any> = {
        status: 'rejected',
        reviewedAt: new Date().toISOString(),
        reviewedBy: auth?.currentUser?.displayName || 'Nick',
      };
      if (notes) {
        updates.notes = notes;
      }
      await updateDoc(doc(db, 'events', id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  },

  // Admin: Unpublish event (send back to pending)
  async unpublishEvent(id: string, notes?: string): Promise<void> {
    const docPath = `events/${id}`;
    try {
      const updates: Record<string, any> = {
        status: 'pending',
        notes: notes || 'Unpublished and returned to pending queue',
      };
      await updateDoc(doc(db, 'events', id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  },

  // Admin: Explicitly move event to archive
  async archiveEvent(id: string, notes?: string): Promise<void> {
    const docPath = `events/${id}`;
    try {
      const updates: Record<string, any> = {
        status: 'archived',
        reviewedAt: new Date().toISOString(),
        reviewedBy: auth?.currentUser?.displayName || 'Nick',
      };
      if (notes) {
        updates.notes = notes;
      }
      await updateDoc(doc(db, 'events', id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  },

  // Admin: Restore archived event to approved
  async restoreEvent(id: string, notes?: string): Promise<void> {
    const docPath = `events/${id}`;
    try {
      const updates: Record<string, any> = {
        status: 'approved',
        reviewedAt: new Date().toISOString(),
        reviewedBy: auth?.currentUser?.displayName || 'Nick',
      };
      if (notes) {
        updates.notes = notes;
      }
      await updateDoc(doc(db, 'events', id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  },

  // Admin: Edit event details
  async editEvent(id: string, updates: Partial<CommunityEvent>): Promise<void> {
    const docPath = `events/${id}`;
    try {
      const cleanUpdates: Record<string, any> = {};
      Object.entries(updates).forEach(([k, v]) => {
        if (v !== undefined) cleanUpdates[k] = v;
      });
      await updateDoc(doc(db, 'events', id), cleanUpdates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  },

  // Admin: Delete event permanently
  async deleteEvent(id: string): Promise<void> {
    const docPath = `events/${id}`;
    try {
      await deleteDoc(doc(db, 'events', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  },

  // Newsletter: Subscribe an email address
  async subscribeEmail(email: string): Promise<{ id: string; email: string; status: 'active'; createdAt: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const subId = `sub_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`.slice(0, 100);
    const docPath = `subscribers/${subId}`;
    try {
      const subscriberDoc = {
        id: subId,
        email: cleanEmail,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'subscribers', subId), subscriberDoc);
      return subscriberDoc;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
      throw error;
    }
  },

  // Newsletter: Get all subscribers
  async getSubscribers(): Promise<Array<{ id: string; email: string; status: string; createdAt: string }>> {
    const subPath = 'subscribers';
    try {
      const snap = await getDocs(collection(db, 'subscribers'));
      const list: Array<{ id: string; email: string; status: string; createdAt: string }> = [];
      snap.forEach((docSnap) => {
        list.push(docSnap.data() as any);
      });
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, subPath);
      return [];
    }
  },

  // Newsletter: Unsubscribe
  async unsubscribeEmail(email: string): Promise<void> {
    const cleanEmail = email.trim().toLowerCase();
    const subId = `sub_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`.slice(0, 100);
    const docPath = `subscribers/${subId}`;
    try {
      await updateDoc(doc(db, 'subscribers', subId), {
        status: 'unsubscribed',
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  },

  // Admin: Reset / Reload sample data
  async resetDemoData(): Promise<void> {
    // Demo data and reset removed
  },
};
