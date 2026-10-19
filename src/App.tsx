import React, { useState, useEffect } from 'react';
import { CommunityEvent, EventSubmissionInput } from './types';
import { api, DEFAULT_ADMIN_PASSWORD } from './api/client';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { PublicCalendar } from './components/PublicCalendar';
import { SubmitEventModal } from './components/SubmitEventModal';
import { AdminDashboard } from './components/AdminDashboard';
import { EditEventModal } from './components/EditEventModal';
import { NewsletterModal } from './components/NewsletterModal';
import { AdminDocsModal } from './components/AdminDocsModal';
import { Footer } from './components/Footer';
import { auth, isAuthorizedAdminEmail } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export default function App() {
  const [activeView, setActiveView] = useState<'calendar' | 'admin'>('calendar');
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Admin authentication state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminPassword, setAdminPassword] = useState(api.getAdminPassword());

  // Modal open states
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isNewsletterModalOpen, setIsNewsletterModalOpen] = useState(false);
  const [isAdminDocsModalOpen, setIsAdminDocsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CommunityEvent | null>(null);

  // Load events
  const loadData = async () => {
    setIsLoading(true);
    try {
      if (isAdminLoggedIn) {
        const all = await api.getAdminEvents(adminPassword);
        setEvents(all);
      } else {
        const approved = await api.getApprovedEvents();
        setEvents(approved);
      }
    } catch (err) {
      console.error('Failed to load events', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for Firebase auth state changes (Google Sign In)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && isAuthorizedAdminEmail(user.email)) {
        setIsAdminLoggedIn(true);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    loadData();
  }, [isAdminLoggedIn, adminPassword]);

  // Derived counts
  const approvedEvents = events.filter((e) => e.status === 'approved').sort((a, b) => a.date.localeCompare(b.date));
  const pendingCount = events.filter((e) => e.status === 'pending').length;

  // Handlers
  const handleEventSubmit = async (data: EventSubmissionInput): Promise<CommunityEvent> => {
    const created = await api.submitEvent(data);
    await loadData();
    return created;
  };

  const handleAdminLogin = async (pwd: string): Promise<boolean> => {
    const verified = await api.verifyAdminPassword(pwd);
    if (verified) {
      setAdminPassword(pwd);
      setIsAdminLoggedIn(true);
      return true;
    }
    return false;
  };

  const handleAdminLogout = async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    setIsAdminLoggedIn(false);
    setActiveView('calendar');
  };

  const handleApprove = async (id: string, notes?: string) => {
    await api.approveEvent(id, adminPassword, notes);
    await loadData();
  };

  const handleReject = async (id: string, notes?: string) => {
    await api.rejectEvent(id, adminPassword, notes);
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

  const handleResetDemoData = async () => {
    await api.resetDemoData(adminPassword);
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
              totalApproved={approvedEvents.length}
              openSubmitModal={() => setIsSubmitModalOpen(true)}
              scrollToEvents={scrollToCalendar}
            />

            <PublicCalendar
              events={approvedEvents}
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
            events={events}
            isAdminLoggedIn={isAdminLoggedIn}
            adminPassword={adminPassword}
            onLogin={handleAdminLogin}
            onLogout={handleAdminLogout}
            onApprove={handleApprove}
            onReject={handleReject}
            onOpenEditModal={(evt) => setEditingEvent(evt)}
            onDeleteEvent={handleDelete}
            onUnpublish={handleUnpublish}
            onResetDemoData={handleResetDemoData}
            openAdminDocs={() => setIsAdminDocsModalOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <Footer
        onOpenSubmit={() => setIsSubmitModalOpen(true)}
        onOpenNewsletter={() => setIsNewsletterModalOpen(true)}
        onOpenAdminDocs={() => setIsAdminDocsModalOpen(true)}
        onSwitchToAdmin={() => setActiveView('admin')}
        onSwitchToCalendar={() => setActiveView('calendar')}
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
        events={events}
      />

      <AdminDocsModal
        isOpen={isAdminDocsModalOpen}
        onClose={() => setIsAdminDocsModalOpen(false)}
        onPasswordUpdated={(newPwd) => {
          setAdminPassword(newPwd);
          loadData();
        }}
      />

      <EditEventModal
        isOpen={Boolean(editingEvent)}
        event={editingEvent}
        onClose={() => setEditingEvent(null)}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
