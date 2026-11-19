import React, { useState, useEffect, useCallback } from 'react';
import { CommunityEvent, EventSubmissionInput } from './types';
import { api } from './api/client';
import { getTodayDateString, isUpcomingEvent } from './utils/dateUtils';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { PublicCalendar } from './components/PublicCalendar';
import { SubmitEventModal } from './components/SubmitEventModal';
import { AdminDashboard } from './components/AdminDashboard';
import { EditEventModal } from './components/EditEventModal';
import { NewsletterModal } from './components/NewsletterModal';
import { AdminDocsModal } from './components/AdminDocsModal';
import { Footer } from './components/Footer';
import { auth, isAuthorizedAdminEmail, waitForAuthReady } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export default function App() {
  const [activeView, setActiveView] = useState<'calendar' | 'admin'>('calendar');
  // Always tracks what visitors see on the live public calendar, independent of admin auth state
  const [publicEvents, setPublicEvents] = useState<CommunityEvent[]>([]);
  // Full moderation dataset (pending, approved, archived, rejected) for admins
  const [adminEvents, setAdminEvents] = useState<CommunityEvent[]>([]);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Admin authentication state: session-scoped so private tabs/windows start unauthenticated
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('vcd_admin_logged_in') === 'true';
    } catch {
      return false;
    }
  });
  const [adminPassword, setAdminPassword] = useState(api.getAdminPassword());
  const [moderatorEmail, setModeratorEmail] = useState<string>(() => {
    try {
      return sessionStorage.getItem('vcd_moderator_email') || '';
    } catch {
      return '';
    }
  });
  const [authTick, setAuthTick] = useState(0);

  // Modal open states
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isNewsletterModalOpen, setIsNewsletterModalOpen] = useState(false);
  const [newsletterInitialTab, setNewsletterInitialTab] = useState<'preview' | 'automation' | 'subscribers' | 'html'>('preview');
  const [isAdminDocsModalOpen, setIsAdminDocsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CommunityEvent | null>(null);

  // Always load public approved events for visitor view, and independently load full queue when admin is logged in
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const approved = await api.getApprovedEvents();
      setPublicEvents(approved);

      if (isAdminLoggedIn) {
        try {
          const all = await api.getAdminEvents(adminPassword);
          setAdminEvents(all);
          setAdminError(null);
        } catch (adminErr: any) {
          console.error('Failed to load admin events', adminErr);
          if (adminErr?.message === 'ADMIN_SESSION_EXPIRED') {
            setAdminError('Your moderator session needs verification. Please sign in again with your Moderator Passphrase or Google account to load the moderation queue.');
          } else {
            setAdminError('Unable to refresh the admin moderation queue right now. Showing last synced events.');
          }
        }
      } else {
        setAdminEvents([]);
        setAdminError(null);
      }
    } catch (err) {
      console.error('Failed to load events', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAdminLoggedIn, adminPassword]);

  // Google login success handler (only for verified authorized emails)
  const handleGoogleLoginSuccess = (email?: string) => {
    if (!email || !isAuthorizedAdminEmail(email)) return;
    setAdminError(null);
    setIsAdminLoggedIn(true);
    setModeratorEmail(email);
    setAuthTick((t) => t + 1);
    try {
      sessionStorage.setItem('vcd_admin_logged_in', 'true');
      sessionStorage.setItem('vcd_moderator_email', email);
    } catch {}
  };

  // Listen for Firebase auth state changes (Google Sign In & session restoration)
  useEffect(() => {
    if (!auth) return;
    let mounted = true;
    waitForAuthReady().then(() => {
      if (mounted) setAuthTick((t) => t + 1);
    });
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!mounted) return;
      if (user?.email && isAuthorizedAdminEmail(user.email)) {
        setAdminError(null);
        setIsAdminLoggedIn(true);
        setModeratorEmail(user.email);
        setAuthTick((t) => t + 1);
        try {
          sessionStorage.setItem('vcd_admin_logged_in', 'true');
          sessionStorage.setItem('vcd_moderator_email', user.email);
        } catch {}
      }
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, authTick]);

  // Visitor-facing upcoming approved events (on or after today) — always derived from publicEvents
  const todayStr = getTodayDateString();
  const upcomingApprovedEvents = publicEvents
    .filter((e) => e.status === 'approved' && isUpcomingEvent(e.date, todayStr))
    .sort((a, b) => a.date.localeCompare(b.date));

  const pendingCount = adminEvents.filter((e) => e.status === 'pending').length;

  // Handlers
  const handleEventSubmit = async (data: EventSubmissionInput): Promise<CommunityEvent> => {
    const created = await api.submitEvent(data);
    if (isAdminLoggedIn) {
      setAdminEvents((prev) => (prev.some((e) => e.id === created.id) ? prev : [created, ...prev]));
    }
    await loadData();
    return created;
  };

  const handleAdminLogin = async (pwd: string): Promise<boolean> => {
    const verified = await api.verifyAdminPassword(pwd);
    if (verified) {
      setAdminError(null);
      setAdminPassword(pwd);
      setIsAdminLoggedIn(true);
      setAuthTick((t) => t + 1);
      try {
        sessionStorage.setItem('vcd_admin_logged_in', 'true');
        sessionStorage.setItem('vcd_admin_session_pwd', pwd);
      } catch {}
      return true;
    }
    return false;
  };

  const clearAdminCredentials = async (switchToCalendar: boolean) => {
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch {
      // ignore
    }
    try {
      sessionStorage.removeItem('vcd_admin_logged_in');
      sessionStorage.removeItem('vcd_admin_session_pwd');
      sessionStorage.removeItem('vcd_moderator_email');
      localStorage.removeItem('vcd_admin_logged_in');
      localStorage.removeItem('vcd_moderator_email');
      localStorage.removeItem('community_events_admin_pwd');
    } catch {}
    api.clearAdminSession();
    setIsAdminLoggedIn(false);
    setAdminPassword('');
    setModeratorEmail('');
    setAdminEvents([]);
    setAdminError(null);
    if (switchToCalendar) {
      setActiveView('calendar');
    }
  };

  const handleAdminLogout = async () => {
    await clearAdminCredentials(true);
  };

  const handleReauthenticate = async () => {
    await clearAdminCredentials(false);
    setActiveView('admin');
  };

  const handleApprove = async (id: string, notes?: string) => {
    await api.approveEvent(id, adminPassword, notes);
    await loadData();
  };

  const handleReject = async (id: string, notes?: string) => {
    await api.rejectEvent(id, adminPassword, notes);
    await loadData();
  };

  const handleArchive = async (id: string, notes?: string) => {
    await api.archiveEvent(id, adminPassword, notes);
    await loadData();
  };

  const handleRestore = async (id: string, notes?: string) => {
    await api.restoreEvent(id, adminPassword, notes);
    await loadData();
  };

  const handleSaveEdit = async (id: string, updates: Partial<CommunityEvent>) => {
    await api.editEvent(id, updates, adminPassword);
    await loadData();
    setEditingEvent(null);
  };

  const handleDelete = async (id: string) => {
    await api.deleteEvent(id, adminPassword);
    await loadData();
  };

  const handleUnpublish = async (id: string) => {
    await api.unpublishEvent(id, adminPassword);
    await loadData();
  };

  const scrollToCalendar = () => {
    setActiveView('calendar');
    const el = document.getElementById('calendar-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col text-stone-900">
      {/* Top Header */}
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        openSubmitModal={() => setIsSubmitModalOpen(true)}
        openNewsletterModal={() => setIsNewsletterModalOpen(true)}
        openAdminDocsModal={() => setIsAdminDocsModalOpen(true)}
        pendingCount={pendingCount}
        isAdminLoggedIn={isAdminLoggedIn}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {activeView === 'calendar' ? (
          <>
            <Hero
              totalApproved={upcomingApprovedEvents.length}
              openSubmitModal={() => setIsSubmitModalOpen(true)}
              scrollToEvents={scrollToCalendar}
            />

            <PublicCalendar
              events={upcomingApprovedEvents}
              isLoading={isLoading}
              onRefresh={loadData}
              openSubmitModal={() => setIsSubmitModalOpen(true)}
              isAdmin={isAdminLoggedIn}
              onEdit={(evt) => setEditingEvent(evt)}
              onDelete={handleDelete}
            />
          </>
        ) : (
          <AdminDashboard
            events={adminEvents}
            isAdminLoggedIn={isAdminLoggedIn}
            adminPassword={adminPassword}
            adminError={adminError}
            onReauthenticate={handleReauthenticate}
            onLogin={handleAdminLogin}
            onLogout={handleAdminLogout}
            onApprove={handleApprove}
            onReject={handleReject}
            onArchive={handleArchive}
            onRestore={handleRestore}
            onOpenEditModal={(evt) => setEditingEvent(evt)}
            onDeleteEvent={handleDelete}
            onUnpublish={handleUnpublish}
            openAdminDocs={() => setIsAdminDocsModalOpen(true)}
            openNewsletterModal={(tab) => {
              setNewsletterInitialTab(tab || 'preview');
              setIsNewsletterModalOpen(true);
            }}
            onGoogleLoginSuccess={handleGoogleLoginSuccess}
            moderatorEmail={moderatorEmail}
          />
        )}
      </main>

      {/* Footer */}
      <Footer
        onOpenSubmit={() => setIsSubmitModalOpen(true)}
        onOpenNewsletter={() => {
          setNewsletterInitialTab('preview');
          setIsNewsletterModalOpen(true);
        }}
        onOpenAdminDocs={() => setIsAdminDocsModalOpen(true)}
        onSwitchToAdmin={() => setActiveView('admin')}
        onSwitchToCalendar={() => {
          setActiveView('calendar');
          scrollToCalendar();
        }}
      />

      {/* Modals */}
      <SubmitEventModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmit={handleEventSubmit}
      />

      <NewsletterModal
        isOpen={isNewsletterModalOpen}
        onClose={() => setIsNewsletterModalOpen(false)}
        events={publicEvents}
        adminPassword={adminPassword}
        isAdmin={isAdminLoggedIn}
        initialTab={newsletterInitialTab}
      />

      <AdminDocsModal
        isOpen={isAdminDocsModalOpen}
        onClose={() => setIsAdminDocsModalOpen(false)}
        onPasswordUpdated={(newPwd) => {
          setAdminPassword(newPwd);
          setAuthTick((t) => t + 1);
        }}
      />

      {editingEvent && (
        <EditEventModal
          isOpen={true}
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}
