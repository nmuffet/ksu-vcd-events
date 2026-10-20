import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
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
  writeBatch,
} from 'firebase/firestore';
import { CommunityEvent, EventSubmissionInput } from '../types';

// Safely resolve local config file if present in dev environment, otherwise rely on .env
const configModules: Record<string, any> = import.meta.glob('../../firebase-applet-config.json', { eager: true });
const envConfig = configModules['../../firebase-applet-config.json']?.default || {};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || (envConfig as any).apiKey || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || (envConfig as any).authDomain || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || (envConfig as any).projectId || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || (envConfig as any).storageBucket || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || (envConfig as any).messagingSenderId || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || (envConfig as any).appId || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || (envConfig as any).measurementId || '',
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || (envConfig as any).firestoreDatabaseId || ''
};

// Initialize Firebase SDK
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const ADMIN_EMAILS: string[] = [
  'nmuffet@gmail.com',
];

export const isAuthorizedAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.some((adminEmail) => adminEmail.toLowerCase() === email.trim().toLowerCase());
};

export const ADMIN_EMAIL = ADMIN_EMAILS[0];

export async function loginWithGoogle(): Promise<User | null> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
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
testConnection();

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
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
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
  // Fetch public approved events from Firestore
  async getApprovedEvents(): Promise<CommunityEvent[]> {
    const eventsPath = 'events';
    try {
      const q = query(collection(db, eventsPath), where('status', '==', 'approved'));
      const snapshot = await getDocs(q);
      const list: CommunityEvent[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as CommunityEvent);
      });

      // If database is brand new and empty, seed the initial approved events
      if (list.length === 0) {
        await firestoreApi.seedInitialDataIfEmpty();
        // Re-read
        const recheck = await getDocs(q);
        const recheckedList: CommunityEvent[] = [];
        recheck.forEach((docSnap) => {
          recheckedList.push(docSnap.data() as CommunityEvent);
        });
        return recheckedList.sort((a, b) => a.date.localeCompare(b.date));
      }

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
        reviewedBy: auth.currentUser?.displayName || 'Nick',
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
        reviewedBy: auth.currentUser?.displayName || 'Nick',
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

  // Admin: Reset / Reload sample data (removed)
  async resetDemoData(): Promise<void> {
    // Demo data and reset removed
  },
};
