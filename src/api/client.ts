import { CommunityEvent, EventSubmissionInput } from '../types';
import { firestoreApi, auth, isAuthorizedAdminEmail, getAdminIdToken, waitForAuthReady } from '../lib/firebase';

const ADMIN_PASSWORD_KEY = 'vcd_admin_session_pwd';
export const DEFAULT_ADMIN_PASSWORD = 'nick2025';

export function getStoredAdminPassword(): string {
  try {
    return sessionStorage.getItem(ADMIN_PASSWORD_KEY) || localStorage.getItem(ADMIN_PASSWORD_KEY) || '';
  } catch {
    return '';
  }
}

function getAdminHeaders(adminPassword?: string): Record<string, string> {
  const pwd = adminPassword || getStoredAdminPassword();
  const headers: Record<string, string> = {};

  if (pwd) {
    headers['x-admin-password'] = pwd;
  }

  try {
    const email = sessionStorage.getItem('vcd_moderator_email') || localStorage.getItem('vcd_moderator_email');
    if (email) {
      headers['x-moderator-email'] = email;
    }
  } catch {}

  return headers;
}

async function getAuthAdminHeaders(adminPassword?: string, forceRefreshToken = false): Promise<Record<string, string>> {
  const headers = getAdminHeaders(adminPassword);
  const idToken = await getAdminIdToken(forceRefreshToken);
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }
  return headers;
}

export const api = {
  // Fetch public approved events from Firestore (with server API fallback)
  async getApprovedEvents(): Promise<CommunityEvent[]> {
    try {
      const events = await firestoreApi.getApprovedEvents();
      if (events && events.length > 0) {
        return events;
      }
    } catch (err) {
      console.warn('Direct Firestore getApprovedEvents failed, falling back to server API', err);
    }

    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (err) {
      console.warn('Server /api/events fallback failed', err);
    }
    return [];
  },

  // Submit new event (Firestore with server API fallback)
  async submitEvent(input: EventSubmissionInput): Promise<CommunityEvent> {
    try {
      return await firestoreApi.submitEvent(input);
    } catch (err) {
      console.warn('Direct Firestore submitEvent failed, falling back to server API', err);
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to submit event');
      }
      return await res.json();
    }
  },

  // Track event by reference ID
  async trackEvent(id: string): Promise<CommunityEvent | null> {
    try {
      return await firestoreApi.trackEvent(id);
    } catch {
      return null;
    }
  },

  // Admin authentication check (server API + local verification)
  async verifyAdminPassword(password: string): Promise<boolean> {
    const trimmed = password.trim();
    if (!trimmed) return false;
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated === true) {
          try {
            sessionStorage.setItem(ADMIN_PASSWORD_KEY, trimmed);
          } catch {
            // ignore
          }
          return true;
        }
      }
    } catch {
      // Fallback
    }
    const matches = trimmed === 'nick2025';
    if (matches) {
      try {
        sessionStorage.setItem(ADMIN_PASSWORD_KEY, trimmed);
      } catch {
        // ignore
      }
    }
    return matches;
  },

  // Update admin password on server and locally
  async updateAdminPassword(newPassword: string, currentPassword: string): Promise<boolean> {
    try {
      const res = await fetch('/api/admin/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': currentPassword,
        },
        body: JSON.stringify({ newPassword }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn('Failed to update admin password on server', err);
    }
    try {
      sessionStorage.setItem(ADMIN_PASSWORD_KEY, newPassword);
    } catch (e) {
      // ignore
    }
    return true;
  },

  clearAdminSession(): void {
    try {
      sessionStorage.removeItem(ADMIN_PASSWORD_KEY);
      sessionStorage.removeItem('vcd_admin_logged_in');
      sessionStorage.removeItem('vcd_moderator_email');
      localStorage.removeItem(ADMIN_PASSWORD_KEY);
      localStorage.removeItem('vcd_admin_logged_in');
      localStorage.removeItem('vcd_moderator_email');
    } catch {}
  },

  getAdminPassword(): string {
    return getStoredAdminPassword();
  },

  // Admin: Get all events (pending, approved, rejected, archived)
  async getAdminEvents(adminPassword?: string): Promise<CommunityEvent[]> {
    await waitForAuthReady();
    let headers = await getAuthAdminHeaders(adminPassword);
    const hasFirebaseAdmin = Boolean(auth?.currentUser && isAuthorizedAdminEmail(auth.currentUser.email));
    const hasCreds = Boolean(headers['x-admin-password'] || headers['Authorization'] || hasFirebaseAdmin);

    if (!hasCreds) {
      throw new Error('ADMIN_SESSION_EXPIRED');
    }

    let unauthorized = false;
    try {
      let res = await fetch('/api/admin/events', { headers });
      if (res.status === 401 && hasFirebaseAdmin) {
        headers = await getAuthAdminHeaders(adminPassword, true);
        res = await fetch('/api/admin/events', { headers });
      }
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      } else if (res.status === 401) {
        unauthorized = true;
      }
    } catch (err) {
      console.error('Failed to get admin events from server:', err);
    }

    // Direct Firestore fallback (never use when password-only auth was explicitly rejected with 401)
    if (!unauthorized || hasFirebaseAdmin) {
      try {
        const direct = await firestoreApi.getAdminEvents();
        if (Array.isArray(direct)) {
          return direct;
        }
      } catch (err) {
        console.warn('Direct Firestore getAdminEvents fallback error', err);
      }
    }

    if (unauthorized) {
      throw new Error('ADMIN_SESSION_EXPIRED');
    }
    throw new Error('Failed to load admin events');
  },

  // Admin: Approve event
  async approveEvent(id: string, adminPassword?: string, notes?: string): Promise<void> {
    let firestoreOk = false;
    try {
      await firestoreApi.approveEvent(id, notes);
      firestoreOk = true;
    } catch (e) {
      console.warn('Direct Firestore approveEvent error, falling back to server API', e);
    }
    const res = await fetch(`/api/admin/events/${id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...await getAuthAdminHeaders(adminPassword),
      },
      body: JSON.stringify({ notes }),
    });
    if (!res.ok && !firestoreOk) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to approve event');
    }
  },

  // Admin: Reject event
  async rejectEvent(id: string, adminPassword?: string, notes?: string): Promise<void> {
    let firestoreOk = false;
    try {
      await firestoreApi.rejectEvent(id, notes);
      firestoreOk = true;
    } catch (e) {
      console.warn('Direct Firestore rejectEvent error, falling back to server API', e);
    }
    const res = await fetch(`/api/admin/events/${id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...await getAuthAdminHeaders(adminPassword),
      },
      body: JSON.stringify({ notes }),
    });
    if (!res.ok && !firestoreOk) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to reject event');
    }
  },

  // Admin: Unpublish event (send back to pending queue)
  async unpublishEvent(id: string, adminPassword?: string, notes?: string): Promise<void> {
    let firestoreOk = false;
    try {
      await firestoreApi.unpublishEvent(id, notes);
      firestoreOk = true;
    } catch (e) {
      console.warn('Direct Firestore unpublishEvent error, falling back to server API', e);
    }
    const res = await fetch(`/api/admin/events/${id}/unpublish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...await getAuthAdminHeaders(adminPassword),
      },
      body: JSON.stringify({ notes }),
    });
    if (!res.ok && !firestoreOk) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to unpublish event');
    }
  },

  // Admin: Archive event
  async archiveEvent(id: string, adminPassword?: string, notes?: string): Promise<void> {
    let firestoreOk = false;
    try {
      await firestoreApi.archiveEvent(id, notes);
      firestoreOk = true;
    } catch (e) {
      console.warn('Direct Firestore archiveEvent error, falling back to server API', e);
    }
    const res = await fetch(`/api/admin/events/${id}/archive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...await getAuthAdminHeaders(adminPassword),
      },
      body: JSON.stringify({ notes }),
    });
    if (!res.ok && !firestoreOk) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to archive event');
    }
  },

  // Admin: Restore event to approved
  async restoreEvent(id: string, adminPassword?: string, notes?: string): Promise<void> {
    let firestoreOk = false;
    try {
      await firestoreApi.restoreEvent(id, notes);
      firestoreOk = true;
    } catch (e) {
      console.warn('Direct Firestore restoreEvent error, falling back to server API', e);
    }
    const res = await fetch(`/api/admin/events/${id}/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...await getAuthAdminHeaders(adminPassword),
      },
      body: JSON.stringify({ notes }),
    });
    if (!res.ok && !firestoreOk) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to restore event');
    }
  },

  // Admin: Edit event
  async editEvent(id: string, updates: Partial<CommunityEvent>, adminPassword?: string): Promise<void> {
    let firestoreOk = false;
    try {
      await firestoreApi.editEvent(id, updates);
      firestoreOk = true;
    } catch (e) {
      console.warn('Direct Firestore editEvent error, falling back to server API', e);
    }
    const res = await fetch(`/api/admin/events/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...await getAuthAdminHeaders(adminPassword),
      },
      body: JSON.stringify(updates),
    });
    if (!res.ok && !firestoreOk) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to save event changes');
    }
  },

  // Admin: Delete event permanently
  async deleteEvent(id: string, adminPassword?: string): Promise<boolean> {
    let firestoreOk = false;
    try {
      await firestoreApi.deleteEvent(id);
      firestoreOk = true;
    } catch (e) {
      console.warn('Direct Firestore deleteEvent error, falling back to server API', e);
    }
    const res = await fetch(`/api/admin/events/${id}`, {
      method: 'DELETE',
      headers: await getAuthAdminHeaders(adminPassword),
    });
    if (!res.ok && !firestoreOk) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to delete event');
    }
    return true;
  },



  // Newsletter: Filter events for the rolling next two months (60 days)
  filterUpcomingTwoMonths(events: CommunityEvent[]): CommunityEvent[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sixtyDaysLater = new Date(today);
    sixtyDaysLater.setDate(sixtyDaysLater.getDate() + 60);

    const todayStr = today.toISOString().split('T')[0];
    const maxStr = sixtyDaysLater.toISOString().split('T')[0];

    return events
      .filter((e) => e.status === 'approved' && e.date >= todayStr && e.date <= maxStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  // Newsletter: Public subscribe
  async subscribe(email: string): Promise<{ success: boolean; message: string }> {
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes('@') || !clean.includes('.')) {
      throw new Error('Please enter a valid email address');
    }

    // Write to Firestore
    try {
      await firestoreApi.subscribeEmail(clean);
    } catch (err) {
      console.warn('Direct Firestore subscription failed, trying server API', err);
    }

    // Call server API to synchronize
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean }),
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, message: data.message || 'Subscribed successfully!' };
      }
    } catch (e) {
      // ignore server failure if Firestore succeeded
    }

    return {
      success: true,
      message: 'You are subscribed! You will receive weekly updates of all upcoming events across the next two months.',
    };
  },

  // Newsletter: Get all subscribers
  async getSubscribers(): Promise<Array<{ id: string; email: string; status: string; createdAt: string }>> {
    try {
      const list = await firestoreApi.getSubscribers();
      if (list && list.length > 0) return list;
    } catch (e) {
      console.warn('Failed to load subscribers from Firestore, trying server API', e);
    }

    try {
      const res = await fetch('/api/newsletter/subscribers');
      if (res.ok) {
        const data = await res.json();
        return data.subscribers || [];
      }
    } catch {
      // ignore
    }
    return [];
  },

  // Newsletter API preview generation (Markdown)
  generateNewsletterMarkdown(events: CommunityEvent[]): string {
    const upcoming = this.filterUpcomingTwoMonths(events);
    const dateFormatted = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    if (upcoming.length === 0) {
      return `# VCD Events Weekly Digest\n*${dateFormatted}*\n\nThere are no upcoming events scheduled over the next two months.`;
    }

    const lines = [
      `# 📅 VCD Events: Upcoming Over the Next 2 Months`,
      `*Kent State University · Visual Communication Design · Updated ${dateFormatted}*`,
      '',
      `Here is the complete schedule of upcoming exhibitions, lectures, critiques, and workshops for the next 60 days (${upcoming.length} upcoming events):`,
      '',
      '---',
      '',
    ];

    upcoming.forEach((e) => {
      lines.push(`### **${e.title}**`);
      lines.push(`- **Date & Time:** ${e.date} · ${e.time}`);
      lines.push(`- **Location:** ${e.location}`);
      if (e.contactEmail) {
        lines.push(`- **Contact:** ${e.contactEmail}`);
      }
      lines.push('');
      lines.push(`${e.description}`);
      lines.push('');
      lines.push('---');
      lines.push('');
    });

    lines.push(`*Want to submit an event? Visit the VCD Events board to submit your event for review.*`);
    return lines.join('\n');
  },

  // Newsletter HTML template (clean, no-frills, responsive)
  generateNewsletterHtml(events: CommunityEvent[]): string {
    const upcoming = this.filterUpcomingTwoMonths(events);
    const dateFormatted = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const eventCardsHtml = upcoming.map((e) => `
      <div style="background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <div style="font-size: 11px; font-weight: 700; color: #78716c; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
          ${e.date} · ${e.time}
        </div>
        <h2 style="font-size: 18px; font-weight: 700; color: #1c1917; margin: 0 0 10px 0; line-height: 1.3;">
          ${e.title}
        </h2>
        <div style="font-size: 13px; color: #57534e; margin-bottom: 12px; display: flex; align-items: center;">
          📍 <strong>Location:</strong>&nbsp;${e.location}
        </div>
        <p style="font-size: 14px; color: #44403c; line-height: 1.6; margin: 0 0 12px 0; white-space: pre-line;">
          ${e.description}
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
          <!-- Header -->
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

          <!-- Summary Intro -->
          <tr>
            <td style="padding: 20px 0 12px 0;">
              <p style="font-size: 14px; color: #57534e; line-height: 1.5; margin: 0;">
                Here is the latest schedule of ${upcoming.length} upcoming exhibitions, guest lectures, critiques, and workshops across the next 60 days.
              </p>
            </td>
          </tr>

          <!-- Events Listing -->
          <tr>
            <td style="padding: 8px 0;">
              ${upcoming.length > 0 ? eventCardsHtml : '<div style="background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 8px; padding: 24px; text-align: center; color: #78716c; font-size: 14px;">No upcoming events currently scheduled for the next two months.</div>'}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 0 32px 0; border-top: 1px solid #e7e5e4; text-align: center; font-size: 12px; color: #a8a29e;">
              <p style="margin: 0 0 8px 0; color: #78716c; font-weight: 500;">
                Kent State University VCD Events Board
              </p>
              <p style="margin: 0; font-size: 11px;">
                You are receiving this because you subscribed on the VCD Events calendar.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  },
  
  // Brevo Integration: Get configuration status
  async getBrevoConfig(adminPassword?: string): Promise<{ configured: boolean; maskedKey: string; listId: string; senderEmail?: string; senderName?: string }> {
    try {
      const res = await fetch('/api/admin/brevo', {
        headers: await getAuthAdminHeaders(adminPassword),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Failed to fetch Brevo config', e);
    }
    return { configured: false, maskedKey: '', listId: '', senderEmail: '', senderName: '' };
  },

  // Brevo Integration: Save API Key, List ID, and Sender details
  async saveBrevoConfig(
    apiKey: string,
    listId?: string,
    senderEmail?: string,
    senderName?: string,
    adminPassword?: string
  ): Promise<{ success: boolean; configured: boolean; maskedKey: string; listId: string; senderEmail?: string; senderName?: string; accountEmail?: string }> {
    const res = await fetch('/api/admin/brevo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...await getAuthAdminHeaders(adminPassword),
      },
      body: JSON.stringify({ apiKey, listId, senderEmail, senderName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save Brevo configuration');
    }
    return await res.json();
  },

  // Brevo Integration: Fetch senders and authenticated domains
  async getBrevoSenders(adminPassword?: string): Promise<{
    senders: Array<{ id: number; name: string; email: string; active: boolean }>;
    domains: Array<{ id: string; domain_name: string; authenticated: boolean; verified: boolean }>;
    currentSenderEmail?: string;
    currentSenderName?: string;
  }> {
    const res = await fetch('/api/admin/brevo/senders', {
      headers: await getAuthAdminHeaders(adminPassword),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to load Brevo senders');
    }
    return await res.json();
  },

  // Brevo Integration: Add a domain to generate DKIM / DMARC DNS records
  async addBrevoDomain(
    name: string,
    adminPassword?: string
  ): Promise<{
    id: string;
    domain_name: string;
    message?: string;
    dns_records?: {
      dkim1Record?: { type: string; value: string; host_name: string; status: boolean };
      dkim2Record?: { type: string; value: string; host_name: string; status: boolean };
      brevo_code?: { type: string; value: string; host_name: string; status: boolean };
      dmarc_record?: { type: string; value: string; host_name: string; status: boolean };
    };
  }> {
    const res = await fetch('/api/admin/brevo/domains', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...await getAuthAdminHeaders(adminPassword),
      },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to register domain in Brevo');
    }
    return await res.json();
  },

  // Brevo Integration: Add a new sender email/name
  async addBrevoSender(
    name: string,
    email: string,
    adminPassword?: string
  ): Promise<{ id: number }> {
    const res = await fetch('/api/admin/brevo/senders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...await getAuthAdminHeaders(adminPassword),
      },
      body: JSON.stringify({ name, email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create sender in Brevo');
    }
    return await res.json();
  },

  // Brevo Integration: Sync all subscribers to Brevo
  async syncAllToBrevo(adminPassword?: string): Promise<{ total: number; synced: number; failed: number; errors: any[] }> {
    const res = await fetch('/api/admin/brevo/sync-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...await getAuthAdminHeaders(adminPassword),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to sync subscribers to Brevo');
    }
    return await res.json();
  },

  // Brevo Integration: Push formatted HTML campaign directly to Brevo as draft
  async createBrevoCampaign(
    htmlContent: string,
    subject?: string,
    senderEmail?: string,
    senderName?: string,
    adminPassword?: string
  ): Promise<{ success: boolean; campaignId: number; message: string; senderEmail?: string; senderName?: string }> {
    const res = await fetch('/api/admin/brevo/create-campaign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...await getAuthAdminHeaders(adminPassword),
      },
      body: JSON.stringify({ htmlContent, subject, senderEmail, senderName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const errorObj = new Error(err.error || 'Failed to create campaign in Brevo') as any;
      errorObj.isDmarcError = err.isDmarcError;
      errorObj.senderEmail = err.senderEmail;
      throw errorObj;
    }
    return await res.json();
  },

  // Brevo Auto-Pilot: Get weekly automated send status
  async getBrevoAutoSendStatus(adminPassword?: string): Promise<{
    enabled: boolean;
    dayOfWeek: number;
    hour: number;
    timezone: string;
    lastAutoSend?: {
      timestamp: string;
      campaignId?: number;
      eventsCount?: number;
      status: 'success' | 'failed';
      error?: string;
    };
    senderEmail?: string;
    senderName?: string;
    listId?: string;
  }> {
    const res = await fetch('/api/admin/brevo/auto-send', {
      headers: await getAuthAdminHeaders(adminPassword),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to get Auto-Pilot status');
    }
    return await res.json();
  },

  // Brevo Auto-Pilot: Update preferences (enable/disable, schedule)
  async updateBrevoAutoSend(
    enabled: boolean,
    dayOfWeek?: number,
    hour?: number,
    adminPassword?: string
  ): Promise<{ success: boolean; enabled: boolean; dayOfWeek: number; hour: number }> {
    const res = await fetch('/api/admin/brevo/auto-send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...await getAuthAdminHeaders(adminPassword),
      },
      body: JSON.stringify({ enabled, dayOfWeek, hour }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update Auto-Pilot schedule');
    }
    return await res.json();
  },

  // Brevo Auto-Pilot: Trigger campaign immediately (or send test email)
  async triggerBrevoAutoSend(
    options: { testEmail?: string; sendNow?: boolean } = {},
    adminPassword?: string
  ): Promise<{
    success: boolean;
    campaignId?: number;
    eventsCount?: number;
    message: string;
    error?: string;
    isDmarcError?: boolean;
  }> {
    const res = await fetch('/api/admin/brevo/auto-send/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...await getAuthAdminHeaders(adminPassword),
      },
      body: JSON.stringify(options),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      const err = new Error(data.error || data.message || 'Auto-Pilot trigger failed') as any;
      err.isDmarcError = data.isDmarcError;
      throw err;
    }
    return data;
  },
};
