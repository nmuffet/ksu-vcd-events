import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Path for file-based persistence
const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'events.json');
const ADMIN_CONFIG_FILE = path.join(DATA_DIR, 'admin.json');

function getAdminPassword() {
  if (process.env.ADMIN_PASSWORD) {
    return process.env.ADMIN_PASSWORD;
  }
  try {
    if (fs.existsSync(ADMIN_CONFIG_FILE)) {
      const content = fs.readFileSync(ADMIN_CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed.password === 'string') {
        return parsed.password;
      }
    }
  } catch (err) {
    console.warn('Error reading admin config', err);
  }
  return 'nick2025';
}

function saveAdminPassword(password: string) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(ADMIN_CONFIG_FILE, JSON.stringify({ password }, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write admin config', err);
  }
}

// Initial seed events
const SEED_EVENTS = [
  {
    id: 'evt-101',
    title: 'Downtown Farmers & Artisans Market',
    date: '2026-10-24',
    time: '8:30 AM – 1:30 PM',
    location: 'Historic Downtown Plaza, 4th & Main St',
    description: 'Weekly gathering of local organic growers, bakers, ceramicists, and honey makers. Live acoustic music at the gazebo from 10 AM to noon. Bring your reusable bags and produce containers. Free admission.',
    contactEmail: 'organizers@downtownmarket.org',
    status: 'approved',
    createdAt: '2026-10-14T09:15:00.000Z',
    reviewedAt: '2026-10-14T11:20:00.000Z',
    reviewedBy: 'Nick'
  },
  {
    id: 'evt-102',
    title: 'Community Garden Workday & Native Seed Swap',
    date: '2026-10-25',
    time: '10:00 AM – 1:00 PM',
    location: 'Oak Ridge Community Gardens, Plot 14 (South Gate)',
    description: 'Help prepare the winter garden beds, prune berry canes, and exchange heirloom vegetable and wildflower seeds. Free compost tea demonstration at 11:30 AM. Gardening tools and gloves provided, or bring your favorites.',
    contactEmail: 'greenthumb@oakridgegarden.org',
    status: 'approved',
    createdAt: '2026-10-15T14:30:00.000Z',
    reviewedAt: '2026-10-15T16:00:00.000Z',
    reviewedBy: 'Nick'
  },
  {
    id: 'evt-103',
    title: 'Acoustic Porch Concert & Open Mic',
    date: '2026-10-27',
    time: '6:30 PM – 9:00 PM',
    location: 'The Old Mill Pavilion, Riverside Way',
    description: 'A cozy evening of unplugged folk, bluegrass, poetry, and storytelling. 10-minute sign-up slots available at the door starting at 6:00 PM. Hot cider and herbal tea provided by the Riverside Neighborhood Guild. Folding chairs welcome.',
    contactEmail: 'music@riversidearts.org',
    status: 'approved',
    createdAt: '2026-10-16T11:00:00.000Z',
    reviewedAt: '2026-10-16T13:45:00.000Z',
    reviewedBy: 'Nick'
  },
  {
    id: 'evt-104',
    title: 'Free Intro to Web Building & Coding Workshop',
    date: '2026-10-29',
    time: '6:00 PM – 8:00 PM',
    location: 'Public Library Tech Center, 2nd Floor Room B',
    description: 'Hands-on beginner workshop for teens and adults curious about building web pages, community sites, and simple apps. No coding background required. Library laptops available or bring your own wifi-enabled laptop.',
    contactEmail: 'programs@citylibrary.lib.org',
    status: 'approved',
    createdAt: '2026-10-16T15:20:00.000Z',
    reviewedAt: '2026-10-17T09:10:00.000Z',
    reviewedBy: 'Nick'
  },
  {
    id: 'evt-105',
    title: 'Sunset Outdoor Cinema: The Princess Bride',
    date: '2026-10-31',
    time: '6:45 PM – 9:00 PM',
    location: 'Heritage Park Great Lawn, near the amphitheater',
    description: 'Annual autumn family movie night under the open sky! Bring blankets, low lawn chairs, and warm layers. Free popcorn provided by the Parks Association. Film begins promptly at dusk (around 7:10 PM).',
    contactEmail: 'events@heritageparkfriends.org',
    status: 'approved',
    createdAt: '2026-10-17T08:00:00.000Z',
    reviewedAt: '2026-10-17T10:15:00.000Z',
    reviewedBy: 'Nick'
  },
  {
    id: 'evt-106',
    title: 'Riverside Trail Cleanup & Willow Tree Planting',
    date: '2026-11-03',
    time: '9:00 AM – 12:30 PM',
    location: 'North Bank Trailhead, River Mile Marker 3',
    description: 'Volunteer riverbank restoration morning. We will be clearing storm debris and planting 80 native willow saplings along the erosion barrier. Trash grabbers, bags, and water refills provided. Wear sturdy boots.',
    contactEmail: 'stewardship@riveralliance.org',
    status: 'approved',
    createdAt: '2026-10-17T18:00:00.000Z',
    reviewedAt: '2026-10-18T08:30:00.000Z',
    reviewedBy: 'Nick'
  },
  {
    id: 'evt-107',
    title: 'All-Ages Community Board Game & Puzzle Night',
    date: '2026-11-06',
    time: '6:00 PM – 9:30 PM',
    location: 'St. Jude Fellowship Hall, 220 Elm St',
    description: 'Casual community game night with over 60 tabletop games available: Catan, Ticket to Ride, Wingspan, chess, backgammon, and cooperative games. Feel free to bring your own favorites. Coffee, tea, and cookies available.',
    contactEmail: 'gamenight@stjudecenter.org',
    status: 'approved',
    createdAt: '2026-10-18T10:00:00.000Z',
    reviewedAt: '2026-10-18T12:00:00.000Z',
    reviewedBy: 'Nick'
  },
  {
    id: 'evt-108',
    title: 'Neighborhood Fall Book Swap & Story Circle',
    date: '2026-11-09',
    time: '11:00 AM – 2:00 PM',
    location: 'Cornerstone Cafe Courtyard, 18 Maple Ave',
    description: 'Take a book, leave a book! Fiction, non-fiction, cookbooks, and kids books. Children storytime circle at 11:30 AM led by retired educator Maria Gomez. 10% discount on warm drinks for swap participants.',
    contactEmail: 'books@maplestreetguild.org',
    status: 'approved',
    createdAt: '2026-10-18T11:45:00.000Z',
    reviewedAt: '2026-10-18T13:30:00.000Z',
    reviewedBy: 'Nick'
  },
  {
    id: 'evt-109',
    title: 'Artisan Sourdough Baking & Starter Workshop',
    date: '2026-11-12',
    time: '2:00 PM – 4:30 PM',
    location: 'Community Center Commercial Kitchen, 300 Center St',
    description: 'Learn the fundamentals of wild yeast fermentation, stretch-and-fold technique, scoring, and baking in Dutch ovens. Every participant takes home an active 100-year-old starter jar and a proofing basket.',
    contactEmail: 'clara.sourdough@example.com',
    status: 'pending',
    createdAt: '2026-10-18T14:10:00.000Z'
  },
  {
    id: 'evt-110',
    title: 'Bicycle Winterization & Brake Tuning Clinic',
    date: '2026-11-15',
    time: '10:00 AM – 1:00 PM',
    location: 'Eastside Bike Path Pavillion, 800 East Ave',
    description: 'Free volunteer-run bicycle safety checks: chain degreasing, cable tensioning, brake pad alignment, and wet-weather tire pressure tips. Donations of spare tubes and lights welcome.',
    contactEmail: 'pedal.dan@commutercollective.org',
    status: 'pending',
    createdAt: '2026-10-18T14:35:00.000Z'
  }
];

function loadEvents() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading events file, fallback to seed', err);
  }
  saveEvents(SEED_EVENTS);
  return [...SEED_EVENTS];
}

function saveEvents(events: any[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(events, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write events file', err);
  }
}

app.use(express.json({ limit: '32kb' }));

// Anti-spam in-memory rate limiter (limits submissions per IP over 10 minutes)
const submissionRateMap = new Map();

// Clean up expired rate limiter timestamps every 15 minutes
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
  const windowMs = 10 * 60 * 1000; // 10 minutes window
  const maxSubmissions = 6; // max 6 submissions per 10 minutes per IP

  const record = submissionRateMap.get(ip) || { timestamps: [] };
  // Keep only timestamps within the window
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

// Check admin password middleware
const requireAdmin = (req: any, res: any, next: any) => {
  const pwd = req.headers['x-admin-password'];
  const currentAdminPwd = getAdminPassword();
  if (pwd && String(pwd).trim() === currentAdminPwd.trim()) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized: invalid admin credentials' });
};

// 1. PUBLIC CALENDAR: Get all approved events
app.get('/api/events', (_req, res) => {
  const events = loadEvents();
  const approved = events
    .filter((e) => e.status === 'approved')
    .sort((a, b) => a.date.localeCompare(b.date));
  res.json(approved);
});

// 2. PUBLIC: Track specific event submission status (no internal notes revealed)
app.get('/api/events/track/:id', (req, res) => {
  const events = loadEvents();
  const found = events.find((e) => e.id === req.params.id);
  if (!found) {
    return res.status(404).json({ error: 'Event submission not found' });
  }
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
});

// 3. PUBLIC: Anonymous event submission (Protected with rate limiting, honeypot, & speed check)
app.post('/api/events', checkSubmissionRateLimit, (req, res) => {
  const {
    title,
    date,
    time,
    location,
    description,
    contactEmail,
    suggestedEditForId,
    suggestedEditTitle,
    suggestionReason,
    _hp_website,
    user_website_url,
    _opened_at,
  } = req.body;

  // 1. Honeypot check: If hidden field is filled, automated bot detected -> drop silently
  if (_hp_website || user_website_url) {
    console.warn('[Anti-Spam] Bot detected via honeypot trap. Silently rejected.');
    // Return standard success to fool the bot without saving anything
    return res.status(201).json({
      id: `evt-fake-${Date.now().toString(36)}`,
      title: String(title || 'Event'),
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
  }

  // 2. Dwell-time check: Humans take at least 1.2s to fill a form; bots submit instantaneously
  if (_opened_at && typeof _opened_at === 'number') {
    const elapsedMs = Date.now() - _opened_at;
    if (elapsedMs > 0 && elapsedMs < 1200) {
      console.warn(`[Anti-Spam] Form submitted impossibly fast (${elapsedMs}ms). Rejected.`);
      return res.status(400).json({ error: 'Submission rejected: form submitted unnaturally fast.' });
    }
  }

  // 3. Required field check
  if (!title || !date || !time || !location || !description) {
    return res.status(400).json({ error: 'Missing required event fields' });
  }

  // 4. Input size boundaries (guards against memory bloat)
  if (String(title).length > 140) {
    return res.status(400).json({ error: 'Event title must be 140 characters or less' });
  }
  if (String(location).length > 250) {
    return res.status(400).json({ error: 'Location must be 250 characters or less' });
  }
  if (String(time).length > 80) {
    return res.status(400).json({ error: 'Time must be 80 characters or less' });
  }
  if (String(description).length > 3000) {
    return res.status(400).json({ error: 'Description must be 3,000 characters or less' });
  }


  const events = loadEvents();
  const newEvent = {
    id: `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title: String(title).trim(),
    date: String(date).trim(),
    time: String(time).trim(),
    location: String(location).trim(),
    description: String(description).trim(),
    contactEmail: contactEmail ? String(contactEmail).trim() : undefined,
    suggestedEditForId: suggestedEditForId ? String(suggestedEditForId).trim() : undefined,
    suggestedEditTitle: suggestedEditTitle ? String(suggestedEditTitle).trim() : undefined,
    notes: suggestionReason ? `Suggested edit note: ${String(suggestionReason).trim()}` : undefined,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  events.unshift(newEvent);
  saveEvents(events);

  res.status(201).json(newEvent);
});

// 4. NEWSLETTER INTEGRATION: Query approved events with date filtering
app.get('/api/newsletter/events.json', (req, res) => {
  const events = loadEvents();
  let approved = events.filter((e) => e.status === 'approved').sort((a, b) => a.date.localeCompare(b.date));

  const { from, to } = req.query;
  if (from) {
    approved = approved.filter((e) => e.date >= String(from));
  }
  if (to) {
    approved = approved.filter((e) => e.date <= String(to));
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
});

// 5. ADMIN AUTH
app.post('/api/admin/auth', (req, res) => {
  const { password } = req.body;
  const currentAdminPwd = getAdminPassword();
  const authenticated = Boolean(password && String(password).trim() === currentAdminPwd.trim());
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

// 6. ADMIN: List all events (pending, approved, rejected)
app.get('/api/admin/events', requireAdmin, (_req, res) => {
  const events = loadEvents();
  res.json(events);
});

// 7. ADMIN: Approve event
app.post('/api/admin/events/:id/approve', requireAdmin, (req, res) => {
  const events = loadEvents();
  const idx = events.findIndex((e) => e.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Event not found' });
  }

  const suggestion = events[idx];
  if (suggestion.suggestedEditForId) {
    const origIdx = events.findIndex((e) => e.id === suggestion.suggestedEditForId);
    if (origIdx !== -1) {
      // Update original event details with the approved suggested changes
      events[origIdx].title = suggestion.title;
      events[origIdx].date = suggestion.date;
      events[origIdx].time = suggestion.time;
      events[origIdx].location = suggestion.location;
      events[origIdx].description = suggestion.description;
      if (suggestion.contactEmail) {
        events[origIdx].contactEmail = suggestion.contactEmail;
      }
      events[origIdx].reviewedAt = new Date().toISOString();
      events[origIdx].reviewedBy = 'Nick';
      events[origIdx].notes = `Updated via approved suggestion ${suggestion.id}`;
    }
  }

  events[idx].status = 'approved';
  events[idx].reviewedAt = new Date().toISOString();
  events[idx].reviewedBy = 'Nick';
  if (req.body.notes) {
    events[idx].notes = req.body.notes;
  }
  saveEvents(events);
  res.json(events[idx]);
});

// 8. ADMIN: Reject event
app.post('/api/admin/events/:id/reject', requireAdmin, (req, res) => {
  const events = loadEvents();
  const idx = events.findIndex((e) => e.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Event not found' });
  }

  events[idx].status = 'rejected';
  events[idx].reviewedAt = new Date().toISOString();
  events[idx].reviewedBy = 'Nick';
  if (req.body.notes) {
    events[idx].notes = req.body.notes;
  }
  saveEvents(events);
  res.json(events[idx]);
});

// 9. ADMIN: Unpublish event (send back to pending queue)
app.post('/api/admin/events/:id/unpublish', requireAdmin, (req, res) => {
  const events = loadEvents();
  const idx = events.findIndex((e) => e.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Event not found' });
  }

  events[idx].status = 'pending';
  events[idx].notes = req.body.notes || 'Unpublished and returned to pending queue';
  saveEvents(events);
  res.json(events[idx]);
});

// 10. ADMIN: Edit event
app.put('/api/admin/events/:id', requireAdmin, (req, res) => {
  const events = loadEvents();
  const idx = events.findIndex((e) => e.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Event not found' });
  }

  const { title, date, time, location, description, contactEmail, status, notes } = req.body;
  if (title) events[idx].title = title;
  if (date) events[idx].date = date;
  if (time) events[idx].time = time;
  if (location) events[idx].location = location;
  if (description) events[idx].description = description;
  if (contactEmail !== undefined) events[idx].contactEmail = contactEmail;
  if (status) events[idx].status = status;
  if (notes !== undefined) events[idx].notes = notes;

  saveEvents(events);
  res.json(events[idx]);
});

// 10. ADMIN: Delete event
app.delete('/api/admin/events/:id', requireAdmin, (req, res) => {
  let events = loadEvents();
  const beforeLen = events.length;
  events = events.filter((e) => e.id !== req.params.id);
  if (events.length === beforeLen) {
    return res.status(404).json({ error: 'Event not found' });
  }
  saveEvents(events);
  res.json({ success: true });
});

// 11. ADMIN: Reset Demo Data
app.post('/api/admin/reset-data', requireAdmin, (_req, res) => {
  saveEvents(SEED_EVENTS);
  res.json(SEED_EVENTS);
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
  });
}

startServer();
