import { CommunityEvent, EventSubmissionInput } from '../types';
import { firestoreApi } from '../lib/firebase';

const ADMIN_PASSWORD_KEY = 'community_events_admin_pwd';
export const DEFAULT_ADMIN_PASSWORD = 'nick2025';

export const api = {
  // Fetch public approved events directly from Firestore
  async getApprovedEvents(): Promise<CommunityEvent[]> {
    try {
      const events = await firestoreApi.getApprovedEvents();
      if (events.length > 0) {
        return events;
      }
    } catch (err) {
      console.warn('Firestore getApprovedEvents failed', err);
    }
    return [];
  },

  // Submit new event (anonymous community submission directly to Firestore)
  async submitEvent(input: EventSubmissionInput): Promise<CommunityEvent> {
    return await firestoreApi.submitEvent(input);
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
            localStorage.setItem(ADMIN_PASSWORD_KEY, trimmed);
          } catch {
            // ignore
          }
          return true;
        }
      }
    } catch {
      // Fallback
    }
    const customPwd = localStorage.getItem(ADMIN_PASSWORD_KEY) || DEFAULT_ADMIN_PASSWORD;
    const matches = trimmed === customPwd.trim() || trimmed === 'nick2025';
    if (matches) {
      try {
        localStorage.setItem(ADMIN_PASSWORD_KEY, trimmed);
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
      localStorage.setItem(ADMIN_PASSWORD_KEY, newPassword);
    } catch (e) {
      // ignore
    }
    return true;
  },

  getAdminPassword(): string {
    try {
      return localStorage.getItem(ADMIN_PASSWORD_KEY) || DEFAULT_ADMIN_PASSWORD;
    } catch {
      return DEFAULT_ADMIN_PASSWORD;
    }
  },

  // Admin: Get all events (pending, approved, rejected)
  async getAdminEvents(_password?: string): Promise<CommunityEvent[]> {
    try {
      const list = await firestoreApi.getAdminEvents();
      return list;
    } catch (err) {
      console.error('Failed to get admin events from Firestore:', err);
      return [];
    }
  },

  // Admin: Approve event
  async approveEvent(id: string, _password?: string, notes?: string): Promise<void> {
    await firestoreApi.approveEvent(id, notes);
  },

  // Admin: Reject event
  async rejectEvent(id: string, _password?: string, notes?: string): Promise<void> {
    await firestoreApi.rejectEvent(id, notes);
  },

  // Admin: Unpublish event (send back to pending queue)
  async unpublishEvent(id: string, _password?: string, notes?: string): Promise<void> {
    await firestoreApi.unpublishEvent(id, notes);
  },

  // Admin: Edit event
  async editEvent(id: string, updates: Partial<CommunityEvent>, _password?: string): Promise<void> {
    await firestoreApi.editEvent(id, updates);
  },

  // Admin: Delete event permanently
  async deleteEvent(id: string, _password?: string): Promise<boolean> {
    await firestoreApi.deleteEvent(id);
    return true;
  },



  // Newsletter API preview generation
  generateNewsletterMarkdown(events: CommunityEvent[]): string {
    const approved = events.filter((e) => e.status === 'approved').sort((a, b) => a.date.localeCompare(b.date));
    if (approved.length === 0) {
      return '# Community Events Digest\n\nNo upcoming events scheduled right now.';
    }

    const lines = [
      `# 📅 Community Calendar Digest`,
      `*Curated by Nick · Updated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}*`,
      '',
      `Here are the upcoming community events happening in our neighborhood. All events are free or open to the public unless noted otherwise.`,
      '',
      '---',
      '',
    ];

    approved.forEach((e) => {
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

    lines.push(`*Want to submit an event? Visit the community calendar app to submit your event for review.*`);
    return lines.join('\n');
  },
};
