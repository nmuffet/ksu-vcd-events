import 'dotenv/config';
import express from 'express';
import cron from 'node-cron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  runTransaction,
} from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read Firebase config
let firebaseConfig: any = {};
try {
  const configFile = path.resolve(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(configFile)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  }
} catch (e) {
  console.warn('Could not read firebase-applet-config.json', e);
}

const PUBLIC_FALLBACK_FIREBASE_CONFIG = {
  projectId: 'gen-lang-client-0459526146',
  appId: '1:1066846972176:web:9f875683ad2fff025d5d95',
  apiKey: 'AIzaSyAkSJ5znxH5VuwSuv1qkv8NcSUmMkvb02o',
  authDomain: 'gen-lang-client-0459526146.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-vcdevents-486e46a0-43fd-4f60-ba11-0b6d6280b2e7',
  storageBucket: 'gen-lang-client-0459526146.firebasestorage.app',
  messagingSenderId: '1066846972176',
};

const envApiKey = process.env.VITE_FIREBASE_API_KEY && process.env.VITE_FIREBASE_API_KEY !== 'AIzaSyCeLuCNdJp5LwTa5eUimk7caZCuMOUdgu8'
  ? process.env.VITE_FIREBASE_API_KEY
  : '';

const resolvedFirebaseConfig = {
  apiKey: firebaseConfig.apiKey || envApiKey || PUBLIC_FALLBACK_FIREBASE_CONFIG.apiKey,
  authDomain: firebaseConfig.authDomain || process.env.VITE_FIREBASE_AUTH_DOMAIN || PUBLIC_FALLBACK_FIREBASE_CONFIG.authDomain,
  projectId: firebaseConfig.projectId || process.env.VITE_FIREBASE_PROJECT_ID || PUBLIC_FALLBACK_FIREBASE_CONFIG.projectId,
  storageBucket: firebaseConfig.storageBucket || process.env.VITE_FIREBASE_STORAGE_BUCKET || PUBLIC_FALLBACK_FIREBASE_CONFIG.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || PUBLIC_FALLBACK_FIREBASE_CONFIG.messagingSenderId,
  appId: firebaseConfig.appId || (envApiKey ? process.env.VITE_FIREBASE_APP_ID : '') || PUBLIC_FALLBACK_FIREBASE_CONFIG.appId,
  firestoreDatabaseId: firebaseConfig.firestoreDatabaseId || process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || PUBLIC_FALLBACK_FIREBASE_CONFIG.firestoreDatabaseId,
};

// Initialize Firebase App & Firestore
const firebaseApp = !getApps().length
  ? initializeApp(resolvedFirebaseConfig)
  : getApp();

const db = getFirestore(
  firebaseApp,
  resolvedFirebaseConfig.firestoreDatabaseId || undefined
);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Same-origin Firebase Auth Hosting Helper Proxy (/__/auth/* and /__/firebase/*)
// Prevents third-party storage partitioning / cross-origin popup failures in iframes and strict browsers.
app.get('/__/firebase/init.json', (req, res) => {
  const requestHost = req.get('host');
  res.setHeader('Cache-Control', 'no-cache');
  res.json({
    projectId: resolvedFirebaseConfig.projectId,
    appId: resolvedFirebaseConfig.appId,
    apiKey: resolvedFirebaseConfig.apiKey,
    authDomain: requestHost || resolvedFirebaseConfig.authDomain,
    storageBucket: resolvedFirebaseConfig.storageBucket,
    messagingSenderId: resolvedFirebaseConfig.messagingSenderId,
  });
});

app.all(['/__/auth/*', '/__/firebase/*'], async (req, res) => {
  const upstreamHost = resolvedFirebaseConfig.authDomain || 'gen-lang-client-0459526146.firebaseapp.com';
  const targetUrl = `https://${upstreamHost}${req.originalUrl}`;
  try {
    const forwardHeaders: Record<string, string> = {};
    if (req.headers['content-type']) {
      forwardHeaders['content-type'] = String(req.headers['content-type']);
    }
    if (req.headers['accept']) {
      forwardHeaders['accept'] = String(req.headers['accept']);
    }
    if (req.headers['user-agent']) {
      forwardHeaders['user-agent'] = String(req.headers['user-agent']);
    }

    let bodyBuffer: Buffer | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      if (chunks.length > 0) {
        bodyBuffer = Buffer.concat(chunks);
      }
    }

    const upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: bodyBuffer ? new Uint8Array(bodyBuffer) : undefined,
      redirect: 'manual',
    });

    res.status(upstreamRes.status);
    const copyHeaderNames = ['content-type', 'cache-control', 'location', 'etag', 'last-modified'];
    copyHeaderNames.forEach((h) => {
      const val = upstreamRes.headers.get(h);
      if (val) res.setHeader(h, val);
    });

    const buf = Buffer.from(await upstreamRes.arrayBuffer());
    res.send(buf);
  } catch (err) {
    console.error('[Auth Proxy] Failed proxying to Firebase Auth helper:', targetUrl, err);
    res.status(502).send('Authentication helper proxy error');
  }
});

// Path for file-based configuration (admin password, brevo config)
const DATA_DIR = path.resolve(__dirname, 'data');
const ADMIN_CONFIG_FILE = path.join(DATA_DIR, 'admin.json');
const BREVO_CONFIG_FILE = path.join(DATA_DIR, 'brevo.json');
const SUBSCRIBERS_CACHE_FILE = path.join(DATA_DIR, 'subscribers.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Admin password helper
function getAdminPassword(): string {
  try {
    if (fs.existsSync(ADMIN_CONFIG_FILE)) {
      const content = fs.readFileSync(ADMIN_CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed.password === 'string' && parsed.password.trim()) {
        return parsed.password.trim();
      }
    }
  } catch (err) {
    console.warn('Error reading admin config', err);
  }
  return 'nick2025';
}

function saveAdminPassword(password: string) {
  try {
    ensureDataDir();
    fs.writeFileSync(ADMIN_CONFIG_FILE, JSON.stringify({ password }, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write admin config', err);
  }
}

export interface BrevoConfig {
  apiKey: string;
  listId: string;
  senderEmail?: string;
  senderName?: string;
  autoSendEnabled?: boolean;
  autoSendDayOfWeek?: number; // 1 = Monday
  autoSendHour?: number; // 8 = 8 AM
  lastAutoSend?: {
    timestamp: string;
    weekKey?: string;
    deliveryMethod?: string;
    campaignId?: number;
    eventsCount?: number;
    status: 'success' | 'failed';
    error?: string;
  };
}

export function getWeekKey(d: Date = new Date()): string {
  const eastern = getEasternDateInfo(d);
  const [y, m, dayNum] = eastern.dateStr.split('-').map(Number);
  const utcNoon = new Date(Date.UTC(y, m - 1, dayNum, 12, 0, 0));
  const offsetFromMon = (eastern.dayOfWeek + 6) % 7; // Mon=0, Tue=1, ..., Sun=6
  utcNoon.setUTCDate(utcNoon.getUTCDate() - offsetFromMon);
  return utcNoon.toISOString().split('T')[0];
}

const INSTANCE_ID = `inst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
let isCatchUpRunning = false;
let lastCatchUpCheckTime = 0;

// Brevo config helper
function getBrevoConfig(): BrevoConfig {
  const envKey = process.env.BREVO_API_KEY || '';
  const envList = process.env.BREVO_LIST_ID || '';
  const envSenderEmail = process.env.BREVO_SENDER_EMAIL || '';
  const envSenderName = process.env.BREVO_SENDER_NAME || '';
  try {
    if (fs.existsSync(BREVO_CONFIG_FILE)) {
      const content = fs.readFileSync(BREVO_CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        apiKey: envKey || parsed.apiKey || '',
        listId: envList || (parsed.listId ? String(parsed.listId) : '2'),
        senderEmail: envSenderEmail || parsed.senderEmail || '',
        senderName: envSenderName || parsed.senderName || '',
        autoSendEnabled: parsed.autoSendEnabled !== undefined ? parsed.autoSendEnabled : Boolean(envKey || parsed.apiKey),
        autoSendDayOfWeek: parsed.autoSendDayOfWeek ?? 1,
        autoSendHour: parsed.autoSendHour ?? 8,
        lastAutoSend: parsed.lastAutoSend,
      };
    }
  } catch (err) {
    console.warn('Error reading Brevo config file', err);
  }
  return {
    apiKey: envKey,
    listId: envList || '2',
    senderEmail: envSenderEmail,
    senderName: envSenderName,
    autoSendEnabled: Boolean(envKey),
    autoSendDayOfWeek: 1,
    autoSendHour: 8,
  };
}

function saveBrevoConfig(config: Partial<BrevoConfig>) {
  try {
    ensureDataDir();
    const current = getBrevoConfig();
    const merged = { ...current, ...config };
    fs.writeFileSync(BREVO_CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save Brevo config', err);
  }
}

// Persistent Firestore Auto-Pilot Settings & Weekly Lock Helpers
async function getAutoPilotConfig(): Promise<BrevoConfig> {
  const local = getBrevoConfig();
  try {
    const snap = await getDoc(doc(db, 'newsletter_settings', 'autopilot'));
    if (snap.exists()) {
      const remote = snap.data() as any;
      return {
        ...local,
        autoSendEnabled: remote.autoSendEnabled !== undefined ? Boolean(remote.autoSendEnabled) : local.autoSendEnabled,
        autoSendDayOfWeek: remote.autoSendDayOfWeek !== undefined ? Number(remote.autoSendDayOfWeek) : local.autoSendDayOfWeek,
        autoSendHour: remote.autoSendHour !== undefined ? Number(remote.autoSendHour) : local.autoSendHour,
        lastAutoSend: remote.lastAutoSend || local.lastAutoSend,
      };
    }
  } catch (err) {
    console.warn('[Auto-Pilot] Could not read Firestore newsletter_settings/autopilot, falling back to local:', err);
  }
  return local;
}

async function saveAutoPilotState(updates: Partial<BrevoConfig>) {
  saveBrevoConfig(updates);
  const merged = getBrevoConfig();
  try {
    const docPayload: Record<string, any> = {
      id: 'autopilot',
      autoSendEnabled: merged.autoSendEnabled !== false,
      autoSendDayOfWeek: merged.autoSendDayOfWeek ?? 1,
      autoSendHour: merged.autoSendHour ?? 8,
      updatedAt: new Date().toISOString(),
    };
    if (merged.lastAutoSend) {
      docPayload.lastAutoSend = merged.lastAutoSend;
    }
    await setDoc(doc(db, 'newsletter_settings', 'autopilot'), docPayload, { merge: true });
  } catch (err) {
    console.warn('[Auto-Pilot] Could not persist settings to Firestore:', err);
  }
}

// Belt-and-suspenders check: Ask Brevo if an Auto-Pilot campaign was already sent this week
async function findSentBrevoAutoPilotForWeek(apiKey: string, weekKey: string): Promise<{ id: number; sentDate: string } | null> {
  try {
    const res = await fetch('https://api.brevo.com/v3/emailCampaigns?limit=15&sort=desc', {
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const campaigns = Array.isArray(data.campaigns) ? data.campaigns : [];
    for (const c of campaigns) {
      if (
        c.status === 'sent' &&
        typeof c.name === 'string' &&
        c.name.startsWith('VCD Events Auto-Pilot') &&
        c.createdAt
      ) {
        const campaignWeekKey = getWeekKey(new Date(c.createdAt));
        if (campaignWeekKey === weekKey) {
          return { id: c.id, sentDate: c.sentDate || c.createdAt };
        }
      }
    }
  } catch (err) {
    console.warn('[Auto-Pilot] Could not query Brevo campaign history for deduplication:', err);
  }
  return null;
}

async function acquireWeeklyNewsletterLock(weekKey: string, apiKey: string): Promise<{ acquired: boolean; reason: string }> {
  // 1. Check Brevo directly first in case another environment/version sent before Firestore lock existed
  const existingSentCampaign = await findSentBrevoAutoPilotForWeek(apiKey, weekKey);
  if (existingSentCampaign) {
    try {
      await setDoc(doc(db, 'newsletter_runs', weekKey), {
        weekKey,
        status: 'sent',
        lockedAt: existingSentCampaign.sentDate,
        lockedBy: 'brevo_history_sync',
        sentAt: existingSentCampaign.sentDate,
        campaignId: existingSentCampaign.id,
        deliveryMethod: 'brevo_campaign',
      }, { merge: true });
      await saveAutoPilotState({
        lastAutoSend: {
          timestamp: existingSentCampaign.sentDate,
          campaignId: existingSentCampaign.id,
          status: 'success',
          weekKey,
          deliveryMethod: 'brevo_campaign',
        },
      });
    } catch (err) {
      console.warn('[Auto-Pilot] Failed syncing Brevo history to Firestore:', err);
    }
    return {
      acquired: false,
      reason: `Brevo Campaign #${existingSentCampaign.id} was already sent for week ${weekKey} (${existingSentCampaign.sentDate})`,
    };
  }

  // 2. Atomic Firestore transaction lock across all instances/environments
  const runRef = doc(db, 'newsletter_runs', weekKey);
  const nowIso = new Date().toISOString();

  try {
    const lockResult = await runTransaction(db, async (tx) => {
      const snap = await tx.get(runRef);
      if (snap.exists()) {
        const data = snap.data() as any;
        if (data.status === 'sent') {
          return { acquired: false, reason: `Firestore lock confirms week ${weekKey} was already sent at ${data.sentAt || data.lockedAt}` };
        }
        if (data.status === 'sending' && data.lockedAt) {
          const lockAgeMs = Date.now() - Date.parse(data.lockedAt);
          if (!isNaN(lockAgeMs) && lockAgeMs < 5 * 60 * 1000) {
            return { acquired: false, reason: `Week ${weekKey} is currently being sent by instance ${data.lockedBy}` };
          }
        }
      }

      tx.set(runRef, {
        weekKey,
        status: 'sending',
        lockedAt: nowIso,
        lockedBy: INSTANCE_ID,
      });

      return { acquired: true, reason: 'Lock acquired' };
    });

    return lockResult;
  } catch (err: any) {
    console.error('[Auto-Pilot] Firestore lock transaction failed; aborting auto-send to prevent duplicates:', err);
    return { acquired: false, reason: `Lock transaction error: ${err?.message || 'unknown'}` };
  }
}

async function finalizeWeeklyNewsletterRun(weekKey: string, data: {
  status: 'sent' | 'failed';
  campaignId?: number;
  eventsCount?: number;
  deliveryMethod?: string;
  error?: string;
}) {
  try {
    const payload: Record<string, any> = {
      weekKey,
      status: data.status,
      lockedAt: new Date().toISOString(),
      lockedBy: INSTANCE_ID,
    };
    if (data.status === 'sent') payload.sentAt = new Date().toISOString();
    if (data.campaignId !== undefined) payload.campaignId = data.campaignId;
    if (data.eventsCount !== undefined) payload.eventsCount = data.eventsCount;
    if (data.deliveryMethod) payload.deliveryMethod = data.deliveryMethod;
    if (data.error) payload.error = String(data.error).slice(0, 500);

    await setDoc(doc(db, 'newsletter_runs', weekKey), payload, { merge: true });
  } catch (err) {
    console.warn('[Auto-Pilot] Failed updating Firestore newsletter_runs:', err);
  }
}

// Sync single email to Brevo Contacts API
async function syncToBrevo(email: string, apiKey: string, listId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: any = {
      email,
      updateEnabled: true,
    };
    if (listId && !isNaN(Number(listId)) && Number(listId) > 0) {
      payload.listIds = [Number(listId)];
    }

    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok || response.status === 201 || response.status === 204) {
      return { success: true };
    }

    const errData: any = await response.json().catch(() => ({}));
    if (errData?.code === 'duplicate_parameter') {
      return { success: true };
    }
    console.warn('[Brevo Sync] Warning from Brevo API:', errData);
    return { success: false, error: errData?.message || `HTTP ${response.status}` };
  } catch (err: any) {
    console.error('[Brevo Sync] Network error syncing contact to Brevo:', err);
    return { success: false, error: err?.message || 'Network error' };
  }
}

// Firestore Database Event Helpers
function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function getFirestoreApprovedEvents(): Promise<any[]> {
  const q = query(collection(db, 'events'), where('status', 'in', ['approved', 'archived']));
  const snap = await getDocs(q);
  const list: any[] = [];
  snap.forEach((docSnap) => {
    list.push(docSnap.data());
  });
  return list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}

async function getFirestoreAllEvents(): Promise<any[]> {
  const snap = await getDocs(collection(db, 'events'));
  const list: any[] = [];
  snap.forEach((docSnap) => {
    list.push(docSnap.data());
  });
  return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

async function getFirestoreSubscribers(): Promise<Array<{ id: string; email: string; status: string; createdAt: string }>> {
  try {
    const snap = await getDocs(collection(db, 'subscribers'));
    const list: Array<{ id: string; email: string; status: string; createdAt: string }> = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data() as any);
    });
    if (list.length > 0) return list;
  } catch (e) {
    console.warn('Could not read subscribers from Firestore, checking file cache', e);
  }

  try {
    if (fs.existsSync(SUBSCRIBERS_CACHE_FILE)) {
      const content = fs.readFileSync(SUBSCRIBERS_CACHE_FILE, 'utf-8');
      return JSON.parse(content) || [];
    }
  } catch {}
  return [];
}

async function saveFirestoreSubscriber(email: string): Promise<any> {
  const cleanEmail = email.trim().toLowerCase();
  const subId = `sub_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`.slice(0, 100);
  const subDoc = {
    id: subId,
    email: cleanEmail,
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'subscribers', subId), subDoc);
  } catch (err) {
    console.warn('Failed to write subscriber to Firestore, caching to file', err);
  }

  // Also update local cache
  try {
    ensureDataDir();
    const existing = await getFirestoreSubscribers();
    const idx = existing.findIndex((s) => s.email === cleanEmail);
    if (idx >= 0) {
      existing[idx].status = 'active';
    } else {
      existing.push(subDoc);
    }
    fs.writeFileSync(SUBSCRIBERS_CACHE_FILE, JSON.stringify(existing, null, 2), 'utf-8');
  } catch {}

  return subDoc;
}

// Middleware
app.use(express.json({ limit: '32kb' }));

// Anti-spam in-memory rate limiter
const submissionRateMap = new Map<string, { timestamps: number[] }>();

setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [ip, record] of submissionRateMap.entries()) {
    record.timestamps = record.timestamps.filter((t: number) => t > cutoff);
    if (record.timestamps.length === 0) {
      submissionRateMap.delete(ip);
    }
  }
}, 15 * 60 * 1000);

const checkSubmissionRateLimit = (req: any, res: any, next: any) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const maxSubmissions = 8;

  const record = submissionRateMap.get(ip) || { timestamps: [] };
  record.timestamps = record.timestamps.filter((t: number) => now - t < windowMs);

  if (record.timestamps.length >= maxSubmissions) {
    const oldestTimestamp = record.timestamps[0];
    const retryAfterSec = Math.ceil((oldestTimestamp + windowMs - now) / 1000);
    res.setHeader('Retry-After', String(retryAfterSec));
    return res.status(429).json({
      error: `Too many submissions from this connection. Please wait ${Math.ceil(retryAfterSec / 60)} minutes before submitting another event.`,
    });
  }

  record.timestamps.push(now);
  submissionRateMap.set(ip, record);
  next();
};

// Throttled Auto-Pilot catch-up check on incoming HTTP requests (non-blocking, at most once per 60 seconds)
app.use((_req, _res, next) => {
  const currentTime = Date.now();
  if (currentTime - lastCatchUpCheckTime > 60_000) {
    lastCatchUpCheckTime = currentTime;
    checkAndRunCatchUpAutoPilot().catch((err) => {
      console.warn('[Auto-Pilot Middleware] Catch-up check warning:', err);
    });
  }
  next();
});

// Check admin credentials
// Strictly requires:
// 1. Valid moderator password ('nick2025', stored admin password, or ADMIN_PASSWORD env)
// 2. Or verified Google Auth ID token for 'nmuffet@gmail.com'
const requireAdmin = async (req: any, res: any, next: any) => {
  const pwd = req.headers['x-admin-password'] || req.headers['authorization'];
  const cleanPwd = pwd ? String(pwd).replace(/^Bearer\s+/i, '').trim() : '';

  const storedPwd = getAdminPassword();
  const envPwd = process.env.ADMIN_PASSWORD ? process.env.ADMIN_PASSWORD.trim() : '';

  // 1. Password check
  if (
    cleanPwd &&
    (cleanPwd === 'nick2025' ||
      cleanPwd === storedPwd ||
      (envPwd !== '' && cleanPwd === envPwd))
  ) {
    return next();
  }

  // 2. Firebase Auth ID Token or Google OAuth ID Token check
  const authHeader = req.headers['authorization'];
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (token && token.length > 50 && token.includes('.')) {
      // 2a. Verify Firebase Auth ID token via Identity Toolkit accounts:lookup
      if (resolvedFirebaseConfig.apiKey) {
        try {
          const lookupRes = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(resolvedFirebaseConfig.apiKey)}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken: token }),
            }
          );
          if (lookupRes.ok) {
            const lookupData: any = await lookupRes.json();
            const user = Array.isArray(lookupData?.users) ? lookupData.users[0] : null;
            const email = (user?.email || '').toLowerCase().trim();
            if (email === 'nmuffet@gmail.com' && user?.emailVerified !== false) {
              return next();
            }
          }
        } catch (err) {
          console.warn('Firebase Auth ID token lookup failed:', err);
        }
      }

      // 2b. Fallback: Verify raw Google OAuth ID token via oauth2 tokeninfo
      try {
        const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
        if (verifyRes.ok) {
          const info: any = await verifyRes.json();
          const email = (info.email || '').toLowerCase().trim();
          if (email === 'nmuffet@gmail.com') {
            return next();
          }
        }
      } catch (err) {
        console.warn('Google ID token verification failed:', err);
      }
    }
  }

  return res.status(401).json({ error: 'Unauthorized: admin login required' });
};

// 1. PUBLIC CALENDAR: Get approved upcoming events
// Strictly returns ONLY upcoming events (date >= today and status === 'approved').
// Past events are strictly excluded from visitor view and only accessible to administrators.
app.get('/api/events', async (_req, res) => {
  try {
    const allApproved = await getFirestoreApprovedEvents();
    const todayStr = getTodayDateString();

    // Visitor facing: ONLY upcoming events (today and future)
    const upcoming = allApproved
      .filter((e) => e.date >= todayStr && e.status === 'approved')
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    res.json(upcoming);
  } catch (err: any) {
    console.error('Failed to fetch events from Firestore:', err);
    res.status(500).json({ error: 'Failed to fetch events from database' });
  }
});

// Admin-only past events archive endpoint
app.get('/api/events/archive', requireAdmin, async (_req, res) => {
  try {
    const allApproved = await getFirestoreApprovedEvents();
    const todayStr = getTodayDateString();
    const pastEvents = allApproved
      .filter((e) => (e.date < todayStr || e.status === 'archived') && e.status !== 'rejected')
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    res.json(pastEvents);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch past events archive' });
  }
});

// 2. PUBLIC: Track specific event submission status by ID
app.get('/api/events/track/:id', async (req, res) => {
  try {
    const docSnap = await getDoc(doc(db, 'events', req.params.id));
    if (!docSnap.exists()) {
      return res.status(404).json({ error: 'Event submission not found' });
    }
    const found = docSnap.data();
    res.json({
      id: found.id,
      title: found.title,
      date: found.date,
      time: found.time,
      location: found.location,
      description: found.description,
      status: found.status,
      createdAt: found.createdAt,
      reviewedAt: found.reviewedAt,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve event' });
  }
});

// 3. PUBLIC: Anonymous event submission
app.post('/api/events', checkSubmissionRateLimit, async (req, res) => {
  const {
    title,
    date,
    time,
    startTime,
    endTime,
    isAllDay,
    location,
    description,
    contactEmail,
    url,
    suggestedEditForId,
    suggestedEditTitle,
    suggestionReason,
    _hp_website,
    user_website_url,
    _opened_at,
  } = req.body;

  // Bot honeypot trap
  if (_hp_website || user_website_url) {
    console.warn('[Anti-Spam] Bot detected via honeypot trap. Silently rejected.');
    return res.status(201).json({
      id: `evt-fake-${Date.now().toString(36)}`,
      title: String(title || 'Event'),
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
  }

  // Dwell-time check
  if (_opened_at && typeof _opened_at === 'number') {
    const elapsedMs = Date.now() - _opened_at;
    if (elapsedMs > 0 && elapsedMs < 1200) {
      return res.status(400).json({ error: 'Submission rejected: form submitted unnaturally fast.' });
    }
  }

  // Required field check
  if (!title || !date || !time || !location || !description) {
    return res.status(400).json({ error: 'Missing required event fields' });
  }

  // Input length limits
  if (String(title).length > 140) return res.status(400).json({ error: 'Event title must be 140 characters or less' });
  if (String(location).length > 250) return res.status(400).json({ error: 'Location must be 250 characters or less' });
  if (String(time).length > 80) return res.status(400).json({ error: 'Time must be 80 characters or less' });
  if (String(description).length > 3000) return res.status(400).json({ error: 'Description must be 3,000 characters or less' });
  if (url && String(url).length > 500) return res.status(400).json({ error: 'URL must be 500 characters or less' });

  const id = `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const newEvent: any = {
    id,
    title: String(title).trim(),
    date: String(date).trim(),
    time: String(time).trim(),
    location: String(location).trim(),
    description: String(description).trim(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  if (startTime) newEvent.startTime = String(startTime).trim();
  if (endTime) newEvent.endTime = String(endTime).trim();
  if (isAllDay !== undefined) newEvent.isAllDay = Boolean(isAllDay);
  if (contactEmail) newEvent.contactEmail = String(contactEmail).trim();
  if (url) newEvent.url = String(url).trim();
  if (suggestedEditForId) newEvent.suggestedEditForId = String(suggestedEditForId).trim();
  if (suggestedEditTitle) newEvent.suggestedEditTitle = String(suggestedEditTitle).trim();
  if (suggestionReason) newEvent.notes = `Suggested edit note: ${String(suggestionReason).trim()}`;

  try {
    await setDoc(doc(db, 'events', id), newEvent);
    res.status(201).json(newEvent);
  } catch (err: any) {
    console.error('Failed to create event in Firestore:', err);
    res.status(500).json({ error: 'Failed to record event submission' });
  }
});

// Helper for escaping XML
function escapeXml(unsafe: string): string {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// 4. NEWSLETTER INTEGRATION: Query approved events with rolling 60-day window
app.get('/api/newsletter/events.json', async (req, res) => {
  try {
    let approved = await getFirestoreApprovedEvents();
    const { from, to, window: queryWindow } = req.query;

    if (queryWindow === '60' || (!from && !to)) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sixtyDaysLater = new Date(today);
      sixtyDaysLater.setDate(sixtyDaysLater.getDate() + 60);

      const todayStr = today.toISOString().split('T')[0];
      const maxStr = sixtyDaysLater.toISOString().split('T')[0];
      approved = approved.filter((e) => e.date >= todayStr && e.date <= maxStr);
    } else {
      if (from) approved = approved.filter((e) => e.date >= String(from));
      if (to) approved = approved.filter((e) => e.date <= String(to));
    }

    res.json({
      generatedAt: new Date().toISOString(),
      eventCount: approved.length,
      events: approved.map((e) => ({
        id: e.id,
        title: e.title,
        date: e.date,
        time: e.time,
        location: e.location,
        description: e.description,
        contactEmail: e.contactEmail,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate newsletter JSON' });
  }
});

// 4b. NEWSLETTER RSS FEED: Automated feed for MailerLite / Brevo / RSS-to-Email
app.get('/api/newsletter/feed.xml', async (_req, res) => {
  try {
    const events = await getFirestoreApprovedEvents();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sixtyDaysLater = new Date(today);
    sixtyDaysLater.setDate(sixtyDaysLater.getDate() + 60);

    const todayStr = today.toISOString().split('T')[0];
    const maxStr = sixtyDaysLater.toISOString().split('T')[0];

    const upcoming = events
      .filter((e) => e.date >= todayStr && e.date <= maxStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((today.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
    const digestGuid = `vcd-weekly-digest-${today.getFullYear()}-w${weekNumber}`;
    const nowRssDate = new Date().toUTCString();

    let itemsXml = '';

    if (upcoming.length > 0) {
      const digestContent = upcoming
        .map(
          (e) => `
          <div style="margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #e7e5e4;">
            <h3 style="margin: 0 0 4px 0; color: #1c1917;">${escapeXml(e.title)}</h3>
            <p style="margin: 0 0 6px 0; font-size: 13px; color: #78716c;">
              <strong>${escapeXml(e.date)} · ${escapeXml(e.time)}</strong> | 📍 ${escapeXml(e.location)}
            </p>
            <p style="margin: 0; font-size: 14px; color: #44403c;">${escapeXml(e.description)}</p>
          </div>`
        )
        .join('');

      itemsXml += `
      <item>
        <title>Upcoming VCD Events (${upcoming.length} Events over the Next 2 Months)</title>
        <link>https://ais-pre-sprjbzhbr2yqk7p72joffe-823764920969.us-east1.run.app</link>
        <guid isPermaLink="false">${digestGuid}</guid>
        <pubDate>${nowRssDate}</pubDate>
        <description><![CDATA[${digestContent}]]></description>
      </item>`;

      upcoming.forEach((e) => {
        itemsXml += `
      <item>
        <title>${escapeXml(e.title)} (${escapeXml(e.date)})</title>
        <link>https://ais-pre-sprjbzhbr2yqk7p72joffe-823764920969.us-east1.run.app#${escapeXml(e.id)}</link>
        <guid isPermaLink="false">${escapeXml(e.id)}-${todayStr}</guid>
        <pubDate>${nowRssDate}</pubDate>
        <description><![CDATA[<strong>Date & Time:</strong> ${escapeXml(e.date)} · ${escapeXml(e.time)}<br/><strong>Location:</strong> ${escapeXml(e.location)}<br/><br/>${escapeXml(e.description)}]]></description>
      </item>`;
      });
    }

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Kent State VCD Events - 2-Month Upcoming Digest</title>
    <link>https://ais-pre-sprjbzhbr2yqk7p72joffe-823764920969.us-east1.run.app</link>
    <description>Automated weekly feed of all upcoming Kent State Visual Communication Design events over the next two months.</description>
    <language>en-us</language>
    <lastBuildDate>${nowRssDate}</lastBuildDate>
    <atom:link href="https://ais-pre-sprjbzhbr2yqk7p72joffe-823764920969.us-east1.run.app/api/newsletter/feed.xml" rel="self" type="application/rss+xml" />
    ${itemsXml}
  </channel>
</rss>`;

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.send(rss);
  } catch (err) {
    res.status(500).send('Failed to generate RSS feed');
  }
});

// 4c. NEWSLETTER SUBSCRIBER SIGNUP
app.post('/api/newsletter/subscribe', async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email address is required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  await saveFirestoreSubscriber(cleanEmail);

  // Auto-sync to Brevo if configured
  const brevo = getBrevoConfig();
  let brevoSynced = false;
  let brevoError = undefined;

  if (brevo.apiKey) {
    const result = await syncToBrevo(cleanEmail, brevo.apiKey, brevo.listId);
    brevoSynced = result.success;
    brevoError = result.error;
  }

  res.status(200).json({
    success: true,
    message: 'You are subscribed! You will receive weekly updates of upcoming events for the next two months.',
    brevoSynced,
    brevoConfigured: Boolean(brevo.apiKey),
    brevoError,
  });
});

// 4d. LIST SUBSCRIBERS
app.get('/api/newsletter/subscribers', async (_req, res) => {
  const list = await getFirestoreSubscribers();
  res.json({
    total: list.length,
    active: list.filter((s) => s.status === 'active').length,
    subscribers: list,
  });
});

// 4e. EXPORT SUBSCRIBERS CSV
app.get('/api/newsletter/subscribers.csv', async (_req, res) => {
  const list = (await getFirestoreSubscribers()).filter((s) => s.status === 'active');
  let csv = 'email,status,subscribed_at\n';
  list.forEach((s) => {
    csv += `"${s.email}","${s.status}","${s.createdAt}"\n`;
  });
  res.set('Content-Type', 'text/csv');
  res.set('Content-Disposition', 'attachment; filename="vcd-event-subscribers.csv"');
  res.send(csv);
});

// 4f. BREVO CONFIG & SYNC (ADMIN)
app.get('/api/admin/brevo', requireAdmin, (_req, res) => {
  const config = getBrevoConfig();
  res.json({
    configured: Boolean(config.apiKey),
    maskedKey: config.apiKey
      ? `${config.apiKey.slice(0, 7)}...${config.apiKey.slice(-4)}`
      : '',
    listId: config.listId || '',
    senderEmail: config.senderEmail || '',
    senderName: config.senderName || '',
  });
});

app.post('/api/admin/brevo', requireAdmin, async (req, res) => {
  const { apiKey, listId, senderEmail, senderName } = req.body;
  const current = getBrevoConfig();
  const trimmedKey = apiKey !== undefined ? String(apiKey).trim() : '';
  const newKey = trimmedKey ? trimmedKey : current.apiKey;
  const newListId = listId !== undefined ? String(listId).trim() : current.listId;
  const newSenderEmail = senderEmail !== undefined ? String(senderEmail).trim() : (current.senderEmail || '');
  const newSenderName = senderName !== undefined ? String(senderName).trim() : (current.senderName || '');

  // Validate API key with Brevo's account API
  let accountEmail: string | undefined = undefined;
  if (newKey) {
    try {
      const verifyRes = await fetch('https://api.brevo.com/v3/account', {
        headers: {
          accept: 'application/json',
          'api-key': newKey,
        },
      });
      if (verifyRes.ok) {
        const acc = await verifyRes.json();
        accountEmail = acc.email;
      } else if (verifyRes.status === 401 || verifyRes.status === 403) {
        return res.status(400).json({
          error: 'Brevo rejected this API key (HTTP 401 Unauthorized). Please ensure you generated a valid API key in your Brevo account (Top-right name → SMTP & API → API Keys).',
        });
      }
    } catch (testErr) {
      console.warn('Could not contact Brevo to verify API key:', testErr);
    }
  }

  saveBrevoConfig({ apiKey: newKey, listId: newListId, senderEmail: newSenderEmail, senderName: newSenderName });

  res.json({
    success: true,
    configured: Boolean(newKey),
    maskedKey: newKey ? `${newKey.slice(0, 7)}...${newKey.slice(-4)}` : '',
    listId: newListId,
    senderEmail: newSenderEmail,
    senderName: newSenderName,
    accountEmail,
  });
});

// Fetch verified senders and authenticated domains from Brevo
app.get('/api/admin/brevo/senders', requireAdmin, async (_req, res) => {
  const config = getBrevoConfig();
  if (!config.apiKey) {
    return res.status(400).json({ error: 'Brevo API key is not configured.' });
  }

  try {
    const [sendersRes, domainsRes] = await Promise.all([
      fetch('https://api.brevo.com/v3/senders', {
        headers: { 'api-key': config.apiKey, accept: 'application/json' },
      }),
      fetch('https://api.brevo.com/v3/senders/domains', {
        headers: { 'api-key': config.apiKey, accept: 'application/json' },
      }),
    ]);

    const sendersData = sendersRes.ok ? await sendersRes.json() : { senders: [] };
    const domainsData = domainsRes.ok ? await domainsRes.json() : { domains: [] };

    res.json({
      senders: sendersData.senders || [],
      domains: domainsData.domains || [],
      currentSenderEmail: config.senderEmail || '',
      currentSenderName: config.senderName || '',
    });
  } catch (err: any) {
    console.error('Failed to fetch Brevo senders:', err);
    res.status(500).json({ error: err?.message || 'Server error fetching Brevo senders' });
  }
});

// Add a domain in Brevo to retrieve required DNS records (DKIM, TXT, DMARC)
app.post('/api/admin/brevo/domains', requireAdmin, async (req, res) => {
  const config = getBrevoConfig();
  if (!config.apiKey) {
    return res.status(400).json({ error: 'Brevo API key is not configured.' });
  }

  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Domain name is required (e.g. vcdkent.org).' });
  }

  const cleanDomain = name.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

  try {
    const response = await fetch('https://api.brevo.com/v3/senders/domains', {
      method: 'POST',
      headers: {
        'api-key': config.apiKey,
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ name: cleanDomain }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || `Failed to add domain in Brevo (HTTP ${response.status})`,
      });
    }

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Server error registering domain in Brevo' });
  }
});

// Add a sender in Brevo
app.post('/api/admin/brevo/senders', requireAdmin, async (req, res) => {
  const config = getBrevoConfig();
  if (!config.apiKey) {
    return res.status(400).json({ error: 'Brevo API key is not configured.' });
  }

  const { name, email } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: 'Sender name and email are required.' });
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/senders', {
      method: 'POST',
      headers: {
        'api-key': config.apiKey,
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ name: String(name).trim(), email: String(email).trim().toLowerCase() }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || `Failed to create sender in Brevo (HTTP ${response.status})`,
      });
    }

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Server error creating sender in Brevo' });
  }
});

app.post('/api/admin/brevo/sync-all', requireAdmin, async (_req, res) => {
  const config = getBrevoConfig();
  if (!config.apiKey) {
    return res.status(400).json({ error: 'Brevo API key is not configured.' });
  }

  const subscribers = (await getFirestoreSubscribers()).filter((s) => s.status === 'active');
  let synced = 0;
  const failedList: Array<{ email: string; error?: string }> = [];

  for (const sub of subscribers) {
    const resSync = await syncToBrevo(sub.email, config.apiKey, config.listId);
    if (resSync.success) {
      synced++;
    } else {
      failedList.push({ email: sub.email, error: resSync.error });
    }
  }

  res.json({
    total: subscribers.length,
    synced,
    failed: failedList.length,
    errors: failedList.slice(0, 5),
  });
});

// Create draft campaign in Brevo with styled HTML content
app.post('/api/admin/brevo/create-campaign', requireAdmin, async (req, res) => {
  const config = getBrevoConfig();
  if (!config.apiKey) {
    return res.status(400).json({ error: 'Brevo API key is not configured.' });
  }

  const { subject, htmlContent, senderEmail: customSenderEmail, senderName: customSenderName } = req.body;
  if (!htmlContent) {
    return res.status(400).json({ error: 'HTML content is required.' });
  }

  try {
    let senderEmail = customSenderEmail || config.senderEmail || '';
    let senderName = customSenderName || config.senderName || 'Kent State VCD Events';

    // If sender email is not set, attempt to get an active verified sender from Brevo
    if (!senderEmail) {
      try {
        const sendersRes = await fetch('https://api.brevo.com/v3/senders', {
          headers: { 'api-key': config.apiKey, accept: 'application/json' },
        });
        if (sendersRes.ok) {
          const sendersData = await sendersRes.json();
          if (sendersData?.senders && sendersData.senders.length > 0) {
            const activeSender = sendersData.senders.find((s: any) => s.active) || sendersData.senders[0];
            senderEmail = activeSender.email;
            if (!senderName && activeSender.name) senderName = activeSender.name;
          }
        }
      } catch {}
    }

    // Fallback to Brevo account email
    if (!senderEmail) {
      try {
        const accRes = await fetch('https://api.brevo.com/v3/account', {
          headers: { 'api-key': config.apiKey, accept: 'application/json' },
        });
        if (accRes.ok) {
          const acc = await accRes.json();
          if (acc.email) senderEmail = acc.email;
          if (acc.companyName && !senderName) senderName = acc.companyName;
        }
      } catch {}
    }

    const now = new Date();
    const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const defaultSubject = `Upcoming VCD Events Digest · ${monthYear}`;

    const campaignPayload: any = {
      name: `VCD Events Digest (${now.toISOString().split('T')[0]})`,
      subject: subject || defaultSubject,
      sender: { name: senderName || 'VCD Events', email: senderEmail },
      type: 'classic',
      htmlContent,
    };

    if (config.listId && !isNaN(Number(config.listId)) && Number(config.listId) > 0) {
      campaignPayload.recipients = { listIds: [Number(config.listId)] };
    }

    const campaignRes = await fetch('https://api.brevo.com/v3/emailCampaigns', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': config.apiKey,
      },
      body: JSON.stringify(campaignPayload),
    });

    const responseData = await campaignRes.json().catch(() => ({}));

    if (!campaignRes.ok) {
      const errorMsg = responseData.message || `Brevo campaign creation failed with HTTP ${campaignRes.status}`;
      const isDmarc =
        errorMsg.toLowerCase().includes('dmarc') ||
        errorMsg.toLowerCase().includes('sender domain authentication');

      return res.status(campaignRes.status).json({
        error: errorMsg,
        isDmarcError: isDmarc,
        senderEmail,
        senderName,
      });
    }

    res.json({
      success: true,
      campaignId: responseData.id,
      senderEmail,
      senderName,
      message: `Draft campaign #${responseData.id} created successfully in Brevo! You can review or send it from your Brevo Campaigns dashboard.`,
    });
  } catch (err: any) {
    console.error('Failed to create Brevo campaign:', err);
    res.status(500).json({ error: err?.message || 'Server error creating campaign in Brevo' });
  }
});

// Helper to compile branded responsive HTML newsletter
function compileNewsletterHtml(events: any[]): string {
  const today = new Date();
  const sixtyDaysLater = new Date(today);
  sixtyDaysLater.setDate(sixtyDaysLater.getDate() + 60);

  const todayStr = today.toISOString().split('T')[0];
  const maxStr = sixtyDaysLater.toISOString().split('T')[0];

  const upcoming = events
    .filter((e) => e.date >= todayStr && e.date <= maxStr)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const dateFormatted = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const eventCardsHtml = upcoming.map((e) => `
    <div style="background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <div style="font-size: 11px; font-weight: 700; color: #78716c; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
        ${e.date} · ${e.time || ''}
      </div>
      <h2 style="font-size: 18px; font-weight: 700; color: #1c1917; margin: 0 0 10px 0; line-height: 1.3;">
        ${e.title}
      </h2>
      <div style="font-size: 13px; color: #57534e; margin-bottom: 12px;">
        📍 <strong>Location:</strong>&nbsp;${e.location || 'TBA'}
      </div>
      <p style="font-size: 14px; color: #44403c; line-height: 1.6; margin: 0 0 12px 0; white-space: pre-line;">
        ${e.description || ''}
      </p>
      ${e.contactEmail ? `
      <div style="font-size: 12px; color: #78716c;">
        ✉️ Contact: <a href="mailto:${e.contactEmail}" style="color: #1c1917; font-weight: 600;">${e.contactEmail}</a>
      </div>
      ` : ''}
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VCD Events Weekly Bulletin</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fafaf9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1917;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fafaf9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; text-align: left;" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: 24px 0 20px 0; border-bottom: 2px solid #1c1917;">
              <div style="font-size: 11px; font-weight: 700; color: #78716c; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px;">
                Kent State University · Visual Communication Design
              </div>
              <h1 style="font-size: 28px; font-weight: 800; color: #1c1917; margin: 0 0 6px 0; letter-spacing: -0.02em;">
                VCD Events Digest
              </h1>
              <p style="font-size: 14px; color: #57534e; margin: 0;">
                All upcoming events for the next two months (${dateFormatted})
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 0 12px 0;">
              <p style="font-size: 14px; color: #57534e; line-height: 1.5; margin: 0;">
                Here is the latest schedule of ${upcoming.length} upcoming exhibitions, guest lectures, critiques, and workshops across the next 60 days.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">
              ${upcoming.length > 0 ? eventCardsHtml : '<div style="background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 8px; padding: 24px; text-align: center; color: #78716c; font-size: 14px;">No upcoming events currently scheduled for the next two months.</div>'}
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 0 32px 0; border-top: 1px solid #e7e5e4; text-align: center; font-size: 12px; color: #a8a29e;">
              <p style="margin: 0 0 8px 0; color: #78716c; font-weight: 500;">
                Kent State University VCD Events Board
              </p>
              <p style="margin: 0; font-size: 11px;">
                You are receiving this automated weekly digest because you subscribed on the VCD Events calendar.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Helper: Broadcast via Brevo Transactional SMTP relay to all active subscribers
// Used when Brevo Campaign scheduling is rejected by DMARC / sender domain verification rules or missing list IDs.
async function broadcastViaTransactionalSmtp({
  config,
  senderName,
  senderEmail,
  subject,
  htmlContent,
  campaignId,
  eventsCount,
  weekKey,
  campaignDispatchError,
  isDmarc,
}: {
  config: BrevoConfig;
  senderName: string;
  senderEmail: string;
  subject: string;
  htmlContent: string;
  campaignId?: number;
  eventsCount: number;
  weekKey: string;
  campaignDispatchError: string;
  isDmarc: boolean;
}): Promise<{
  success: boolean;
  campaignId?: number;
  eventsCount: number;
  deliveredCount?: number;
  totalRecipients?: number;
  deliveryMethod?: string;
  error?: string;
  isDmarcError?: boolean;
  message: string;
}> {
  console.warn(`[Auto-Pilot] Brevo Campaign ${campaignId ? `#${campaignId}` : ''} cannot be scheduled directly (${campaignDispatchError}). Broadcasting via Brevo Transactional SMTP relay to active subscribers...`);

  const recipientEmails = new Set<string>();

  // 1. Fetch active subscribers from Firestore
  try {
    const firestoreSubs = await getFirestoreSubscribers();
    for (const s of firestoreSubs) {
      if (s.email && s.status !== 'unsubscribed') {
        recipientEmails.add(s.email.trim().toLowerCase());
      }
    }
  } catch (subErr) {
    console.warn('[Auto-Pilot] Could not fetch Firestore subscribers for fallback:', subErr);
  }

  // 2. Fetch contacts from Brevo list if configured
  const activeListId = config.listId || '2';
  try {
    const listContactsRes = await fetch(`https://api.brevo.com/v3/contacts/lists/${activeListId}/contacts?limit=500`, {
      headers: {
        accept: 'application/json',
        'api-key': config.apiKey,
      },
    });
    if (listContactsRes.ok) {
      const listData = await listContactsRes.json();
      if (Array.isArray(listData.contacts)) {
        for (const c of listData.contacts) {
          if (c.email) {
            recipientEmails.add(c.email.trim().toLowerCase());
          }
        }
      }
    }
  } catch (listErr) {
    console.warn('[Auto-Pilot] Could not fetch Brevo list contacts for fallback:', listErr);
  }

  const recipientList = Array.from(recipientEmails);
  console.log(`[Auto-Pilot] Found ${recipientList.length} recipient(s) for Brevo Transactional broadcast:`, recipientList);

  if (recipientList.length === 0) {
    await saveAutoPilotState({
      lastAutoSend: {
        timestamp: new Date().toISOString(),
        campaignId,
        eventsCount,
        status: 'failed',
        weekKey,
        error: `${campaignDispatchError} (and no subscriber recipients found)`,
      },
    });
    return {
      success: false,
      campaignId,
      eventsCount,
      error: campaignDispatchError,
      isDmarcError: isDmarc,
      message: `Campaign scheduling failed (${campaignDispatchError}) and no subscribers were found to relay to.`,
    };
  }

  let deliveredCount = 0;
  const errors: string[] = [];

  for (const recipient of recipientList) {
    try {
      const smtpPayload = {
        sender: { name: senderName || 'Kent State VCD Events', email: senderEmail },
        to: [{ email: recipient }],
        subject,
        htmlContent,
      };

      const relayRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'api-key': config.apiKey,
        },
        body: JSON.stringify(smtpPayload),
      });

      if (relayRes.ok) {
        deliveredCount++;
        console.log(`[Auto-Pilot Relay] Delivered to ${recipient}`);
      } else {
        const errData = await relayRes.json().catch(() => ({}));
        const errStr = `${recipient}: ${errData.message || relayRes.status}`;
        errors.push(errStr);
        console.warn(`[Auto-Pilot Relay] Failed to deliver to ${recipient}:`, errStr);
      }
    } catch (err: any) {
      errors.push(`${recipient}: ${err.message}`);
    }
  }

  if (deliveredCount > 0) {
    await saveAutoPilotState({
      lastAutoSend: {
        timestamp: new Date().toISOString(),
        campaignId,
        eventsCount,
        status: 'success',
        weekKey,
        deliveryMethod: 'brevo_transactional_relay',
      },
    });

    return {
      success: true,
      campaignId,
      eventsCount,
      deliveredCount,
      totalRecipients: recipientList.length,
      deliveryMethod: 'brevo_transactional_relay',
      message: `Weekly newsletter successfully broadcast to ${deliveredCount} subscriber(s) via Brevo Transactional relay!`,
    };
  } else {
    const combinedError = errors.join('; ') || campaignDispatchError;
    await saveAutoPilotState({
      lastAutoSend: {
        timestamp: new Date().toISOString(),
        campaignId,
        eventsCount,
        status: 'failed',
        weekKey,
        error: combinedError,
      },
    });

    return {
      success: false,
      campaignId,
      eventsCount,
      error: combinedError,
      isDmarcError: isDmarc,
      message: `Failed to broadcast via Brevo Transactional relay: ${combinedError}`,
    };
  }
}

// Core executor for automated hands-off sending
async function executeWeeklyNewsletterCampaign(options: { sendNow?: boolean; testEmail?: string; isScheduledRun?: boolean } = {}): Promise<{
  success: boolean;
  campaignId?: number;
  eventsCount?: number;
  deliveredCount?: number;
  totalRecipients?: number;
  deliveryMethod?: string;
  message: string;
  error?: string;
  isDmarcError?: boolean;
}> {
  const config = getBrevoConfig();
  if (!config.apiKey) {
    return {
      success: false,
      error: 'Brevo API key is not configured.',
      message: 'Brevo API key is not configured.',
    };
  }

  const events = await getFirestoreApprovedEvents();
  const htmlContent = compileNewsletterHtml(events);

  let senderEmail = config.senderEmail || '';
  let senderName = config.senderName || 'Kent State VCD Events';

  // Fallback to active sender from Brevo
  if (!senderEmail) {
    try {
      const sendersRes = await fetch('https://api.brevo.com/v3/senders', {
        headers: { 'api-key': config.apiKey, accept: 'application/json' },
      });
      if (sendersRes.ok) {
        const sendersData = await sendersRes.json();
        if (sendersData?.senders?.length > 0) {
          const active = sendersData.senders.find((s: any) => s.active) || sendersData.senders[0];
          senderEmail = active.email;
          if (!senderName) senderName = active.name;
        }
      }
    } catch {}
  }

  // Secondary fallback to Brevo account details
  if (!senderEmail) {
    try {
      const accRes = await fetch('https://api.brevo.com/v3/account', {
        headers: { 'api-key': config.apiKey, accept: 'application/json' },
      });
      if (accRes.ok) {
        const acc = await accRes.json();
        if (acc.email) senderEmail = acc.email;
        if (acc.companyName && !senderName) senderName = acc.companyName;
      }
    } catch {}
  }

  const now = new Date();
  const currentWeekKey = getWeekKey(now);
  const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const defaultSubject = `Upcoming VCD Events Digest · ${monthYear}`;

  const activeListId = config.listId || '2';

  // Ensure all active Firestore subscribers are synced to the Brevo list before creating the campaign
  if (options.sendNow) {
    try {
      const firestoreSubs = await getFirestoreSubscribers();
      for (const s of firestoreSubs) {
        if (s.email && s.status !== 'unsubscribed') {
          await syncToBrevo(s.email.trim().toLowerCase(), config.apiKey, activeListId);
        }
      }
    } catch (syncErr) {
      console.warn('[Auto-Pilot] Subscriber pre-sync warning:', syncErr);
    }
  }

  const payload: any = {
    name: `VCD Events Auto-Pilot (${now.toISOString().split('T')[0]})`,
    subject: defaultSubject,
    sender: { name: senderName || 'VCD Events', email: senderEmail },
    type: 'classic',
    htmlContent,
  };

  if (activeListId && !isNaN(Number(activeListId)) && Number(activeListId) > 0) {
    payload.recipients = { listIds: [Number(activeListId)] };
  }

  const createRes = await fetch('https://api.brevo.com/v3/emailCampaigns', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': config.apiKey,
    },
    body: JSON.stringify(payload),
  });

  const createData = await createRes.json().catch(() => ({}));
  if (!createRes.ok) {
    const errorMsg = createData.message || `Brevo campaign creation failed with HTTP ${createRes.status}`;
    const isDmarc = errorMsg.toLowerCase().includes('dmarc') || errorMsg.toLowerCase().includes('sender domain authentication');

    if (options.sendNow && (createRes.status === 400 || createRes.status === 403)) {
      return await broadcastViaTransactionalSmtp({
        config,
        senderName,
        senderEmail,
        subject: defaultSubject,
        htmlContent,
        eventsCount: events.length,
        weekKey: currentWeekKey,
        campaignDispatchError: errorMsg,
        isDmarc,
      });
    }

    await saveAutoPilotState({
      lastAutoSend: {
        timestamp: now.toISOString(),
        status: 'failed',
        weekKey: currentWeekKey,
        error: errorMsg,
      },
    });
    return {
      success: false,
      error: errorMsg,
      isDmarcError: isDmarc,
      message: errorMsg,
    };
  }

  const campaignId = createData.id;

  // If a test email was requested
  if (options.testEmail) {
    const cleanTestEmail = options.testEmail.trim().toLowerCase();

    // 1. Pre-register / sync this test recipient in Brevo Contacts
    try {
      await syncToBrevo(cleanTestEmail, config.apiKey, config.listId);
    } catch (syncErr) {
      console.warn('[Test Send] Pre-sync warning:', syncErr);
    }

    // 2. Try the Brevo Campaign test send endpoint
    let campaignTestSuccess = false;
    let campaignTestError = '';

    try {
      const testRes = await fetch(`https://api.brevo.com/v3/emailCampaigns/${campaignId}/sendTest`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'api-key': config.apiKey,
        },
        body: JSON.stringify({ emailTo: [cleanTestEmail] }),
      });

      if (testRes.ok) {
        campaignTestSuccess = true;
      } else {
        const testData = await testRes.json().catch(() => ({}));
        campaignTestError = testData.message || `Test send failed (HTTP ${testRes.status})`;
        console.warn(`[Test Send] Brevo campaign sendTest returned: ${campaignTestError}`);
      }
    } catch (testFetchErr: any) {
      campaignTestError = testFetchErr?.message || 'Network error during campaign test send';
    }

    // 3. Fallback: If campaign test send failed, deliver immediately via Brevo Transactional Email API
    if (!campaignTestSuccess) {
      console.log(`[Test Send] Attempting delivery via Brevo Transactional Email (SMTP) API for ${cleanTestEmail}...`);
      try {
        const smtpPayload: any = {
          sender: { name: senderName || 'Kent State VCD Events', email: senderEmail },
          to: [{ email: cleanTestEmail }],
          subject: `[Test Preview] ${defaultSubject}`,
          htmlContent,
        };

        const smtpRes = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            'api-key': config.apiKey,
          },
          body: JSON.stringify(smtpPayload),
        });

        if (smtpRes.ok) {
          const smtpData = await smtpRes.json().catch(() => ({}));
          console.log(`[Test Send] Transactional email delivered successfully to ${cleanTestEmail}:`, smtpData);
          return {
            success: true,
            campaignId,
            eventsCount: events.length,
            message: `Test email successfully delivered to ${cleanTestEmail} via Brevo! (Campaign #${campaignId} verified)`,
          };
        } else {
          const smtpErrData = await smtpRes.json().catch(() => ({}));
          const smtpErrMsg = smtpErrData.message || `HTTP ${smtpRes.status}`;
          console.error('[Test Send] Brevo Transactional SMTP error:', smtpErrMsg);
          return {
            success: false,
            campaignId,
            error: campaignTestError || smtpErrMsg,
            message: `Brevo test delivery failed: ${campaignTestError || smtpErrMsg}. Please verify that sender "${senderEmail}" is active in your Brevo account.`,
          };
        }
      } catch (smtpCatchErr: any) {
        console.error('[Test Send] Transactional fallback exception:', smtpCatchErr);
        return {
          success: false,
          campaignId,
          error: campaignTestError || smtpCatchErr?.message,
          message: `Brevo test delivery failed: ${campaignTestError || smtpCatchErr?.message}`,
        };
      }
    }

    return {
      success: true,
      campaignId,
      eventsCount: events.length,
      message: `Test email for Campaign #${campaignId} successfully sent to ${cleanTestEmail}!`,
    };
  }

  // If live scheduled sendNow requested
  if (options.sendNow) {
    let campaignDispatched = false;
    let sendStatus = 0;
    let sendError = '';
    let isDmarc = false;

    try {
      const sendRes = await fetch(`https://api.brevo.com/v3/emailCampaigns/${campaignId}/sendNow`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': config.apiKey,
        },
      });
      sendStatus = sendRes.status;

      if (sendRes.ok) {
        campaignDispatched = true;
      } else {
        const sendData = await sendRes.json().catch(() => ({}));
        sendError = sendData.message || `Failed to trigger sendNow (HTTP ${sendRes.status})`;
        isDmarc = sendError.toLowerCase().includes('dmarc') ||
                  sendError.toLowerCase().includes('sender domain authentication') ||
                  sendError.toLowerCase().includes('choose another sender');
      }
    } catch (err: any) {
      sendError = err?.message || 'Network error triggering sendNow';
    }

    if (campaignDispatched) {
      await saveAutoPilotState({
        lastAutoSend: {
          timestamp: now.toISOString(),
          campaignId,
          eventsCount: events.length,
          status: 'success',
          weekKey: currentWeekKey,
          deliveryMethod: 'brevo_campaign',
        },
      });

      return {
        success: true,
        campaignId,
        eventsCount: events.length,
        deliveryMethod: 'brevo_campaign',
        message: `Auto-Pilot successfully generated and broadcast weekly campaign #${campaignId} to all subscribers via Brevo!`,
      };
    }

    // ONLY fall back to transactional SMTP if Brevo explicitly rejected the campaign with 400/403 (DMARC/list rejection).
    // Never double-send on 5xx or network timeout where Brevo may have already queued the campaign!
    const isExplicitRejection = (sendStatus === 400 || sendStatus === 403) && (isDmarc || sendError.toLowerCase().includes('list'));
    if (isExplicitRejection) {
      // Clean up the unsent draft campaign so it doesn't clutter Brevo
      fetch(`https://api.brevo.com/v3/emailCampaigns/${campaignId}`, {
        method: 'DELETE',
        headers: { accept: 'application/json', 'api-key': config.apiKey },
      }).catch(() => {});

      return await broadcastViaTransactionalSmtp({
        config,
        senderName,
        senderEmail,
        subject: defaultSubject,
        htmlContent,
        campaignId,
        eventsCount: events.length,
        weekKey: currentWeekKey,
        campaignDispatchError: sendError,
        isDmarc,
      });
    }

    await saveAutoPilotState({
      lastAutoSend: {
        timestamp: now.toISOString(),
        campaignId,
        eventsCount: events.length,
        status: 'failed',
        weekKey: currentWeekKey,
        error: sendError,
      },
    });

    return {
      success: false,
      campaignId,
      eventsCount: events.length,
      error: sendError,
      isDmarcError: isDmarc,
      message: `Campaign #${campaignId} sendNow returned ${sendStatus || 'network error'}: ${sendError}`,
    };
  }

  // Draft mode
  await saveAutoPilotState({
    lastAutoSend: {
      timestamp: now.toISOString(),
      campaignId,
      eventsCount: events.length,
      status: 'success',
      weekKey: currentWeekKey,
      deliveryMethod: 'draft',
    },
  });

  return {
    success: true,
    campaignId,
    eventsCount: events.length,
    deliveryMethod: 'draft',
    message: `Auto-Pilot draft campaign #${campaignId} created successfully in Brevo!`,
  };
}

// Eastern Time calculation helper
function getEasternDateInfo(date: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek = dayMap[partMap.weekday] ?? 0;
  const rawHour = parseInt(partMap.hour || '0', 10);
  const hour = rawHour === 24 ? 0 : rawHour;
  const minute = parseInt(partMap.minute || '0', 10);
  const year = partMap.year;
  const month = partMap.month;
  const day = partMap.day;
  return { dayOfWeek, hour, minute, year, month, day, dateStr: `${year}-${month}-${day}` };
}

// Compute minutes elapsed since the scheduled target (dayOfWeek at hour:00 Eastern) within the current Mon-Sun week
function getMinutesSinceScheduledWindow(
  eastern: ReturnType<typeof getEasternDateInfo>,
  targetDayOfWeek: number,
  targetHour: number
): number {
  // Normalize day index so Monday = 0, Tuesday = 1, ..., Sunday = 6
  const currentMonIndex = (eastern.dayOfWeek + 6) % 7;
  const targetMonIndex = (targetDayOfWeek + 6) % 7;
  const dayDiff = currentMonIndex - targetMonIndex;
  return dayDiff * 24 * 60 + (eastern.hour - targetHour) * 60 + eastern.minute;
}

// Catch-Up scheduler: Checks if the weekly campaign is due (within 24h of scheduled slot) and locks atomically in Firestore
export async function checkAndRunCatchUpAutoPilot(): Promise<{ triggered: boolean; reason: string; result?: any }> {
  const now = new Date();
  const config = await getAutoPilotConfig();

  if (!config.apiKey || config.autoSendEnabled === false) {
    return { triggered: false, reason: 'Auto-Pilot not configured or disabled' };
  }

  const currentWeekKey = getWeekKey(now);
  const eastern = getEasternDateInfo(now);
  const targetDayOfWeek = config.autoSendDayOfWeek ?? 1; // 1 = Monday
  const targetHour = config.autoSendHour ?? 8; // 8:00 AM

  const minutesSinceWindow = getMinutesSinceScheduledWindow(eastern, targetDayOfWeek, targetHour);

  // Only auto-send if we are within the 24-hour window starting at the scheduled day/hour (e.g. Mon 8:00 AM - Tue 7:59 AM ET).
  // This prevents surprise out-of-interval blasts later in the week (e.g. Friday afternoon).
  if (minutesSinceWindow < 0) {
    return {
      triggered: false,
      reason: `Scheduled send window (Day ${targetDayOfWeek} at ${targetHour}:00 Eastern) has not arrived yet for week ${currentWeekKey}`,
    };
  }

  if (minutesSinceWindow >= 24 * 60) {
    return {
      triggered: false,
      reason: `Outside 24-hour scheduled catch-up window for week ${currentWeekKey} (elapsed ${Math.floor(minutesSinceWindow / 60)}h). Skipping automatic send to keep interval consistent.`,
    };
  }

  // Quick local/settings check before Firestore transaction
  if (config.lastAutoSend?.weekKey === currentWeekKey && config.lastAutoSend?.status === 'success') {
    return {
      triggered: false,
      reason: `Weekly newsletter for week ${currentWeekKey} has already been sent successfully`,
    };
  }

  if (isCatchUpRunning) {
    return { triggered: false, reason: 'Catch-up execution is already in progress on this instance' };
  }

  isCatchUpRunning = true;

  try {
    // Acquire global distributed lock (Brevo sent-campaign check + Firestore runTransaction)
    const lock = await acquireWeeklyNewsletterLock(currentWeekKey, config.apiKey);
    if (!lock.acquired) {
      return { triggered: false, reason: lock.reason };
    }

    console.log(`[Auto-Pilot] Acquired global lock (${INSTANCE_ID}) for week ${currentWeekKey} at Eastern ${eastern.dateStr} ${eastern.hour}:${String(eastern.minute).padStart(2, '0')}. Broadcasting now...`);

    const result = await executeWeeklyNewsletterCampaign({ sendNow: true, isScheduledRun: true });
    await finalizeWeeklyNewsletterRun(currentWeekKey, {
      status: result.success ? 'sent' : 'failed',
      campaignId: result.campaignId,
      eventsCount: result.eventsCount,
      deliveryMethod: result.deliveryMethod,
      error: result.error,
    });

    console.log(`[Auto-Pilot] Broadcast complete for week ${currentWeekKey}:`, result);
    return { triggered: true, reason: 'Scheduled broadcast executed', result };
  } catch (err: any) {
    console.error('[Auto-Pilot] Error executing campaign:', err);
    await finalizeWeeklyNewsletterRun(currentWeekKey, {
      status: 'failed',
      error: err?.message || 'Error executing catch-up',
    });
    return { triggered: false, reason: err?.message || 'Error executing catch-up' };
  } finally {
    isCatchUpRunning = false;
  }
}

// Background Cron: Checks every hour on the hour (Eastern Time) so any configured day/hour triggers cleanly
// and is strictly deduplicated by the Firestore weekly lock + Brevo campaign history.
cron.schedule('0 * * * *', async () => {
  await checkAndRunCatchUpAutoPilot();
}, {
  timezone: 'America/New_York',
});

// GET Auto-Pilot status and schedule
app.get('/api/admin/brevo/auto-send', requireAdmin, async (_req, res) => {
  const config = await getAutoPilotConfig();
  res.json({
    enabled: config.autoSendEnabled !== false && Boolean(config.apiKey),
    dayOfWeek: config.autoSendDayOfWeek ?? 1, // 1 = Monday
    hour: config.autoSendHour ?? 8, // 8 AM
    timezone: 'America/New_York (Eastern)',
    lastAutoSend: config.lastAutoSend || null,
    senderEmail: config.senderEmail || '',
    senderName: config.senderName || '',
    listId: config.listId || '',
  });
});

// UPDATE Auto-Pilot schedule preferences
app.post('/api/admin/brevo/auto-send', requireAdmin, async (req, res) => {
  const { enabled, dayOfWeek, hour } = req.body;
  const updates: Partial<BrevoConfig> = {};
  if (enabled !== undefined) updates.autoSendEnabled = Boolean(enabled);
  if (dayOfWeek !== undefined) updates.autoSendDayOfWeek = Number(dayOfWeek);
  if (hour !== undefined) updates.autoSendHour = Number(hour);

  await saveAutoPilotState(updates);
  const updated = await getAutoPilotConfig();

  res.json({
    success: true,
    enabled: updated.autoSendEnabled !== false && Boolean(updated.apiKey),
    dayOfWeek: updated.autoSendDayOfWeek ?? 1,
    hour: updated.autoSendHour ?? 8,
    lastAutoSend: updated.lastAutoSend || null,
  });
});

// TRIGGER Auto-Pilot on demand (Send immediately to subscribers or test email)
app.post('/api/admin/brevo/auto-send/trigger', requireAdmin, async (req, res) => {
  const { testEmail, sendNow } = req.body;
  try {
    const isLive = sendNow !== false && !testEmail;
    const result = await executeWeeklyNewsletterCampaign({
      sendNow: isLive,
      testEmail: testEmail ? String(testEmail).trim() : undefined,
    });

    if (isLive && result.success) {
      const currentWeekKey = getWeekKey(new Date());
      await finalizeWeeklyNewsletterRun(currentWeekKey, {
        status: 'sent',
        campaignId: result.campaignId,
        eventsCount: result.eventsCount,
        deliveryMethod: result.deliveryMethod,
      });
    }

    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err: any) {
    console.error('Failed to trigger auto-send:', err);
    res.status(500).json({ success: false, error: err?.message || 'Server error triggering campaign' });
  }
});

// 5. ADMIN AUTH
app.post('/api/admin/auth', (req, res) => {
  const { password } = req.body;
  const cleanPwd = password ? String(password).trim() : '';
  const storedPwd = getAdminPassword();
  const envPwd = process.env.ADMIN_PASSWORD ? process.env.ADMIN_PASSWORD.trim() : '';

  const authenticated =
    cleanPwd === 'nick2025' ||
    cleanPwd === storedPwd ||
    (envPwd !== '' && cleanPwd === envPwd);

  res.json({ authenticated });
});

// ADMIN: Update password
app.put('/api/admin/password', requireAdmin, (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || typeof newPassword !== 'string' || !newPassword.trim()) {
    return res.status(400).json({ error: 'New password is required' });
  }
  saveAdminPassword(newPassword.trim());
  res.json({ success: true });
});

// 6. ADMIN: List all events (pending, approved, rejected) from Firestore
app.get('/api/admin/events', requireAdmin, async (_req, res) => {
  try {
    const all = await getFirestoreAllEvents();
    res.json(all);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin events' });
  }
});

// 7. ADMIN: Approve event
app.post('/api/admin/events/:id/approve', requireAdmin, async (req, res) => {
  try {
    const eventRef = doc(db, 'events', req.params.id);
    const docSnap = await getDoc(eventRef);
    if (!docSnap.exists()) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const eventData = docSnap.data();

    // If it was a suggested edit, apply to original
    if (eventData.suggestedEditForId) {
      const origRef = doc(db, 'events', eventData.suggestedEditForId);
      const origSnap = await getDoc(origRef);
      if (origSnap.exists()) {
        await updateDoc(origRef, {
          title: eventData.title,
          date: eventData.date,
          time: eventData.time,
          startTime: eventData.startTime || '',
          endTime: eventData.endTime || '',
          isAllDay: Boolean(eventData.isAllDay),
          location: eventData.location,
          description: eventData.description,
          contactEmail: eventData.contactEmail || '',
          url: eventData.url || '',
          reviewedAt: new Date().toISOString(),
          reviewedBy: 'Nick',
          notes: `Updated via approved suggestion ${eventData.id}`,
        });
      }
    }

    const updates: any = {
      status: 'approved',
      reviewedAt: new Date().toISOString(),
      reviewedBy: 'Nick',
    };
    if (req.body.notes) {
      updates.notes = req.body.notes;
    }

    await updateDoc(eventRef, updates);
    res.json({ ...eventData, ...updates });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve event' });
  }
});

// 8. ADMIN: Reject event
app.post('/api/admin/events/:id/reject', requireAdmin, async (req, res) => {
  try {
    const eventRef = doc(db, 'events', req.params.id);
    const docSnap = await getDoc(eventRef);
    if (!docSnap.exists()) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const updates: any = {
      status: 'rejected',
      reviewedAt: new Date().toISOString(),
      reviewedBy: 'Nick',
    };
    if (req.body.notes) {
      updates.notes = req.body.notes;
    }

    await updateDoc(eventRef, updates);
    res.json({ ...docSnap.data(), ...updates });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject event' });
  }
});

// 9. ADMIN: Unpublish event
app.post('/api/admin/events/:id/unpublish', requireAdmin, async (req, res) => {
  try {
    const eventRef = doc(db, 'events', req.params.id);
    const docSnap = await getDoc(eventRef);
    if (!docSnap.exists()) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const updates = {
      status: 'pending',
      notes: req.body.notes || 'Unpublished and returned to pending queue',
    };

    await updateDoc(eventRef, updates);
    res.json({ ...docSnap.data(), ...updates });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unpublish event' });
  }
});

// 10. ADMIN: Edit event
app.put('/api/admin/events/:id', requireAdmin, async (req, res) => {
  try {
    const eventRef = doc(db, 'events', req.params.id);
    const docSnap = await getDoc(eventRef);
    if (!docSnap.exists()) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const { title, date, time, startTime, endTime, isAllDay, location, description, contactEmail, url, status, notes, reviewedAt, reviewedBy } = req.body;
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (date !== undefined) updates.date = date;
    if (time !== undefined) updates.time = time;
    if (startTime !== undefined) updates.startTime = startTime;
    if (endTime !== undefined) updates.endTime = endTime;
    if (isAllDay !== undefined) updates.isAllDay = Boolean(isAllDay);
    if (location !== undefined) updates.location = location;
    if (description !== undefined) updates.description = description;
    if (contactEmail !== undefined) updates.contactEmail = contactEmail;
    if (url !== undefined) updates.url = url;
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (reviewedAt !== undefined) updates.reviewedAt = reviewedAt;
    if (reviewedBy !== undefined) updates.reviewedBy = reviewedBy;

    await updateDoc(eventRef, updates);
    res.json({ ...docSnap.data(), ...updates });
  } catch (err) {
    res.status(500).json({ error: 'Failed to edit event' });
  }
});

// 11. ADMIN: Delete event
app.delete('/api/admin/events/:id', requireAdmin, async (req, res) => {
  try {
    const eventRef = doc(db, 'events', req.params.id);
    await deleteDoc(eventRef);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// 12. ADMIN: Move event to archive
app.post('/api/admin/events/:id/archive', requireAdmin, async (req, res) => {
  try {
    const eventRef = doc(db, 'events', req.params.id);
    const docSnap = await getDoc(eventRef);
    if (!docSnap.exists()) {
      return res.status(404).json({ error: 'Event not found' });
    }
    const updates: any = {
      status: 'archived',
      reviewedAt: new Date().toISOString(),
      reviewedBy: 'Nick',
    };
    if (req.body.notes) {
      updates.notes = req.body.notes;
    }
    await updateDoc(eventRef, updates);
    res.json({ ...docSnap.data(), ...updates });
  } catch (err) {
    res.status(500).json({ error: 'Failed to archive event' });
  }
});

// 13. ADMIN: Restore event from archive back to approved
app.post('/api/admin/events/:id/restore', requireAdmin, async (req, res) => {
  try {
    const eventRef = doc(db, 'events', req.params.id);
    const docSnap = await getDoc(eventRef);
    if (!docSnap.exists()) {
      return res.status(404).json({ error: 'Event not found' });
    }
    const updates: any = {
      status: 'approved',
      reviewedAt: new Date().toISOString(),
      reviewedBy: 'Nick',
    };
    if (req.body.notes) {
      updates.notes = req.body.notes;
    }
    await updateDoc(eventRef, updates);
    res.json({ ...docSnap.data(), ...updates });
  } catch (err) {
    res.status(500).json({ error: 'Failed to restore event' });
  }
});

// Setup Vite or static serving
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
    // Check catch-up on server boot (e.g. after container spin-up)
    setTimeout(() => {
      checkAndRunCatchUpAutoPilot().catch((err) => {
        console.warn('[Auto-Pilot Boot] Catch-up execution warning:', err);
      });
    }, 2500);
  });

  // Heartbeat check every 15 minutes while server process is running
  setInterval(() => {
    checkAndRunCatchUpAutoPilot().catch((err) => {
      console.warn('[Auto-Pilot Heartbeat] Periodic check warning:', err);
    });
  }, 15 * 60 * 1000);
}

startServer();
