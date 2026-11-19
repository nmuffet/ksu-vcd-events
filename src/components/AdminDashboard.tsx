import React, { useState, useEffect } from 'react';
import { CommunityEvent } from '../types';
import { formatDateLong, formatRelativeTime, getTodayDateString, isPastEvent, isUpcomingEvent } from '../utils/dateUtils';
import { api } from '../api/client';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Edit3,
  Trash2,
  Lock,
  LogOut,
  Mail,
  Calendar,
  MapPin,
  Clock,
  RotateCcw,
  BookOpen,
  Eye,
  EyeOff,
  AlertCircle,
  UserCheck,
  Key,
  RefreshCw,
  Zap,
  Check,
  ExternalLink,
  Archive,
  Globe,
} from 'lucide-react';
import { loginWithGoogle, logoutUser, isAuthorizedAdminEmail, auth } from '../lib/firebase';

interface AdminDashboardProps {
  events: CommunityEvent[];
  isAdminLoggedIn: boolean;
  adminPassword: string;
  adminError?: string | null;
  onReauthenticate?: () => void;
  onLogin: (password: string) => Promise<boolean>;
  onLogout: () => void;
  onApprove: (id: string, notes?: string) => Promise<void>;
  onReject: (id: string, notes?: string) => Promise<void>;
  onArchive?: (id: string, notes?: string) => Promise<void>;
  onRestore?: (id: string, notes?: string) => Promise<void>;
  onOpenEditModal: (event: CommunityEvent) => void;
  onDeleteEvent: (id: string) => Promise<void>;
  onUnpublish: (id: string) => Promise<void>;
  openAdminDocs: () => void;
  openNewsletterModal?: (tab?: 'preview' | 'automation' | 'subscribers' | 'html') => void;
  onGoogleLoginSuccess?: (email?: string) => void;
  moderatorEmail?: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  events,
  isAdminLoggedIn,
  adminPassword,
  adminError,
  onReauthenticate,
  onLogin,
  onLogout,
  onApprove,
  onReject,
  onArchive,
  onRestore,
  onOpenEditModal,
  onDeleteEvent,
  onUnpublish,
  openAdminDocs,
  openNewsletterModal,
  onGoogleLoginSuccess,
  moderatorEmail,
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'published' | 'archive' | 'history' | 'newsletter'>('pending');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Brevo API State
  const [brevoConfig, setBrevoConfig] = useState<{ configured: boolean; maskedKey: string; listId: string }>({
    configured: false,
    maskedKey: '',
    listId: '',
  });
  const [brevoKeyInput, setBrevoKeyInput] = useState('');
  const [brevoListInput, setBrevoListInput] = useState('');
  const [showBrevoKey, setShowBrevoKey] = useState(false);
  const [isSavingBrevo, setIsSavingBrevo] = useState(false);
  const [brevoSaveMsg, setBrevoSaveMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncAllResult, setSyncAllResult] = useState<string | null>(null);

  useEffect(() => {
    if (isAdminLoggedIn) {
      api.getBrevoConfig(adminPassword).then((cfg) => {
        setBrevoConfig(cfg);
        if (cfg.listId) setBrevoListInput(cfg.listId);
      }).catch(() => {});
    }
  }, [isAdminLoggedIn, adminPassword]);

  const handleSaveBrevo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brevoKeyInput.trim() && !brevoConfig.configured) {
      setBrevoSaveMsg({ text: 'Please enter a valid Brevo API key.', isError: true });
      return;
    }
    setIsSavingBrevo(true);
    setBrevoSaveMsg(null);
    try {
      const res = await api.saveBrevoConfig(brevoKeyInput, brevoListInput, undefined, undefined, adminPassword);
      setBrevoConfig(res);
      setBrevoKeyInput('');
      const note = res.accountEmail ? ` (Verified account: ${res.accountEmail})` : '';
      setBrevoSaveMsg({ text: `✓ Brevo API connected and real-time auto-sync activated successfully!${note}` });
      setTimeout(() => setBrevoSaveMsg(null), 6000);
    } catch (err: any) {
      setBrevoSaveMsg({ text: err.message || 'Failed to save Brevo config', isError: true });
    } finally {
      setIsSavingBrevo(false);
    }
  };

  const handleSyncAllToBrevo = async () => {
    setIsSyncingAll(true);
    setSyncAllResult(null);
    try {
      const res = await api.syncAllToBrevo(adminPassword);
      setSyncAllResult(`✓ Successfully pushed ${res.synced} of ${res.total} active subscribers to Brevo!`);
      setTimeout(() => setSyncAllResult(null), 6000);
    } catch (err: any) {
      setSyncAllResult(`Sync error: ${err.message || 'Failed to sync'}`);
    } finally {
      setIsSyncingAll(false);
    }
  };

  const todayStr = getTodayDateString();
  const pendingEvents = events.filter((e) => e.status === 'pending');

  // Upcoming published events (today and future)
  const upcomingPublishedEvents = events
    .filter((e) => e.status === 'approved' && isUpcomingEvent(e.date, todayStr))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Past events archive (events that occurred before today, or explicitly archived)
  const pastArchivedEvents = events
    .filter((e) => (e.status === 'approved' || e.status === 'archived') && (isPastEvent(e.date, todayStr) || e.status === 'archived'))
    .sort((a, b) => b.date.localeCompare(a.date));

  const rejectedEvents = events.filter((e) => e.status === 'rejected');
  const allHistory = [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;

    setIsLoggingIn(true);
    setLoginError('');
    try {
      const ok = await onLogin(passwordInput);
      if (!ok) {
        setLoginError('Incorrect password. Please try again.');
      } else {
        setPasswordInput('');
      }
    } catch {
      setLoginError('Authentication failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleQuickApprove = async (id: string) => {
    setActionInProgress(id);
    try {
      await onApprove(id);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleQuickReject = async (id: string) => {
    setActionInProgress(id);
    try {
      await onReject(id);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const user = await loginWithGoogle();
      if (!user) {
        setLoginError('Google sign in was cancelled.');
        return;
      }
      if (user.email && isAuthorizedAdminEmail(user.email)) {
        onGoogleLoginSuccess?.(user.email);
      } else {
        setLoginError(`Access restricted: ${user.email || 'This account'} is not listed in authorized moderators.`);
        await logoutUser();
      }
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      const code = err?.code || '';
      const msg = String(err?.message || '');
      if (code === 'auth/popup-closed-by-user') {
        setLoginError('Sign-in window closed before completing authentication.');
      } else if (code === 'auth/popup-blocked') {
        setLoginError('Sign-in popup was blocked by your browser. Allow popups or use the Moderator Passphrase above.');
      } else if (code === 'auth/unauthorized-domain' || code === 'auth/bad-request' || msg.toLowerCase().includes('requested action is invalid')) {
        setLoginError('Google sign-in could not complete in this browser context. Please sign in using the Moderator Passphrase above, or open the app in a standalone browser tab.');
      } else {
        setLoginError(msg || 'Google authentication failed. You can sign in using the Moderator Passphrase above.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // If not authenticated, show login options
  if (!isAdminLoggedIn) {
    return (
      <section className="py-12 px-4 max-w-md mx-auto">
        <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-stone-900 text-white flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>

          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-stone-900">Admin Moderation Portal</h2>
            <p className="text-stone-500 text-xs sm:text-sm mt-1">
              Curate and publish community event submissions
            </p>
          </div>

          {loginError && (
            <div className="p-3 mb-5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          <div className="space-y-3">
            {/* Primary: Password Login */}
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Moderator Passphrase
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn || !passwordInput.trim()}
                className="w-full py-2.5 px-4 bg-[#003976] text-white font-semibold text-sm rounded-lg hover:bg-[#002d5e] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>{isLoggingIn ? 'Verifying...' : 'Unlock with Passphrase'}</span>
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-stone-200"></div>
              <span className="px-3 text-stone-400 text-xs font-medium uppercase tracking-wider">or</span>
              <div className="flex-1 border-t border-stone-200"></div>
            </div>

            {/* Secondary: Sign in with Google */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoggingIn}
              className="w-full py-2.5 px-4 bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isLoggingIn ? 'Connecting...' : 'Sign in with Google'}</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 sm:py-10 max-w-5xl mx-auto px-4 sm:px-6">
      {/* Admin Top Banner */}
      <div className="bg-stone-900 text-white rounded-2xl p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-400 font-medium mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Moderator Access · Cloud Synchronized</span>
            {(moderatorEmail || auth?.currentUser?.email) && (
              <>
                <span className="text-stone-600">·</span>
                <span className="text-emerald-400 font-mono text-[11px]">{moderatorEmail || auth?.currentUser?.email}</span>
              </>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Event Moderation Dashboard
          </h2>
          <p className="text-stone-400 text-xs sm:text-sm mt-0.5">
            Review community submissions, edit details, and maintain public board quality.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {openNewsletterModal && (
            <>
              <button
                onClick={() => openNewsletterModal('automation')}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 text-stone-950" />
                <span>Brevo API Setup</span>
                {brevoConfig.configured ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-700" title="Connected"></span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" title="Needs API Key"></span>
                )}
              </button>
              <button
                onClick={() => openNewsletterModal('preview')}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                <span>Newsletter Preview</span>
              </button>
            </>
          )}

          <button
            onClick={openAdminDocs}
            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Admin Docs</span>
          </button>

          <button
            onClick={onLogout}
            className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 border border-rose-800/40 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {adminError && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm text-amber-950">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>{adminError}</span>
          </div>
          {onReauthenticate && (
            <button
              type="button"
              onClick={onReauthenticate}
              className="px-3.5 py-1.5 bg-amber-900 hover:bg-amber-800 text-white text-xs font-semibold rounded-lg transition-colors shrink-0 cursor-pointer"
            >
              Sign In Again
            </button>
          )}
        </div>
      )}

      {/* Segmented Controls / Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-200/80 rounded-xl mb-6 max-w-2xl">
        <button
          onClick={() => setActiveTab('pending')}
          className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-white text-[#003976] font-bold shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span>Pending Queue</span>
          {pendingEvents.length > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-mono text-[11px] font-bold">
              {pendingEvents.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('published')}
          className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'published'
              ? 'bg-white text-[#003976] font-bold shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span>Upcoming Published ({upcomingPublishedEvents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('archive')}
          className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'archive'
              ? 'bg-white text-[#003976] font-bold shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          <span>Past Archive ({pastArchivedEvents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'history'
              ? 'bg-white text-[#003976] font-bold shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span>Audit History ({allHistory.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('newsletter')}
          className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'newsletter'
              ? 'bg-white text-[#003976] font-bold shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span>Newsletter Setup</span>
        </button>
      </div>

      {/* 1. PENDING QUEUE */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingEvents.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-xl p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-3 text-teal-600">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-stone-900 mb-1">Queue is Clear!</h3>
              <p className="text-stone-500 text-xs sm:text-sm max-w-sm mx-auto">
                No pending event submissions awaiting review.
              </p>
            </div>
          ) : (
            pendingEvents.map((evt) => (
              <div
                key={evt.id}
                className="bg-white border border-amber-200/90 rounded-xl p-5 sm:p-6 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-amber-800 font-medium mb-1">
                      <span className="px-2 py-0.5 bg-amber-50 rounded font-semibold border border-amber-200">
                        Needs Review
                      </span>
                      <span>Submitted {formatRelativeTime(evt.createdAt)}</span>
                      <span>·</span>
                      <span className="font-mono text-stone-500">{evt.id}</span>
                    </div>
                    {evt.suggestedEditForId && (
                      <div className="mb-1.5 text-xs text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md inline-flex items-center gap-1.5 font-medium">
                        <span>Suggested edit for:</span>
                        <span className="font-semibold underline">{evt.suggestedEditTitle || evt.suggestedEditForId}</span>
                      </div>
                    )}
                    <h3 className="text-lg font-bold text-stone-900">{evt.title}</h3>
                  </div>

                  {/* Moderation Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onOpenEditModal(evt)}
                      className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5"
                      title="Edit event details before approving"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      disabled={actionInProgress === evt.id}
                      onClick={() => handleQuickReject(evt.id)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 border border-rose-200 disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                    <button
                      disabled={actionInProgress === evt.id}
                      onClick={() => handleQuickApprove(evt.id)}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Approve & Publish</span>
                    </button>
                  </div>
                </div>

                {/* Details metadata */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-stone-600 mb-3 bg-stone-50 p-3 rounded-lg border border-stone-200/60 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    <span>{formatDateLong(evt.date)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    <span>{evt.time}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    <span>{evt.location}</span>
                  </div>
                  {evt.contactEmail && (
                    <div className="flex items-center gap-1.5 text-stone-700">
                      <Mail className="w-3.5 h-3.5 text-stone-400" />
                      <span>{evt.contactEmail}</span>
                    </div>
                  )}
                  {evt.url && (
                    <div className="flex items-center gap-1.5 text-stone-700">
                      <Globe className="w-3.5 h-3.5 text-stone-400" />
                      <a
                        href={evt.url.startsWith('http') ? evt.url : `https://${evt.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-stone-900 break-all"
                      >
                        {evt.url}
                      </a>
                    </div>
                  )}
                </div>

                <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-line">
                  {evt.description}
                </p>

                {evt.notes && (
                  <div className="mt-3 text-xs text-stone-600 bg-stone-50 border border-stone-200 p-2.5 rounded-lg">
                    <span className="font-semibold text-stone-800">Note: </span>
                    <span>{evt.notes}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 2. UPCOMING PUBLISHED CALENDAR TAB */}
      {activeTab === 'published' && (
        <div className="space-y-3">
          {upcomingPublishedEvents.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-xl p-12 text-center">
              <Calendar className="w-10 h-10 text-stone-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-stone-900 mb-1">No Upcoming Published Events</h3>
              <p className="text-stone-500 text-xs sm:text-sm max-w-sm mx-auto">
                All approved events that are scheduled for today or later will appear here. Past events have moved to the Past Archive.
              </p>
            </div>
          ) : (
            upcomingPublishedEvents.map((evt) => (
              <div
                key={evt.id}
                className="bg-white border border-stone-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
                    <span className="font-mono font-semibold text-stone-800">{evt.date}</span>
                    <span>·</span>
                    <span>{evt.time}</span>
                    <span>·</span>
                    <span className="truncate">{evt.location}</span>
                  </div>
                  <h4 className="text-base font-bold text-stone-900 truncate">{evt.title}</h4>
                  <p className="text-xs text-stone-600 line-clamp-1 mt-0.5">{evt.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onOpenEditModal(evt)}
                    className="px-3 py-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => onUnpublish(evt.id)}
                    className="px-3 py-1.5 text-xs font-medium text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors flex items-center gap-1.5 border border-amber-200"
                    title="Send event back to pending queue"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Unpublish</span>
                  </button>
                  <button
                    onClick={() => onDeleteEvent(evt.id)}
                    className="px-3 py-1.5 text-xs font-medium text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-1.5 border border-rose-200"
                    title="Permanently delete event"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 3. PAST EVENTS ARCHIVE TAB */}
      {activeTab === 'archive' && (
        <div className="space-y-4">
          <div className="bg-stone-100 border border-stone-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-xs text-stone-700">
              <Archive className="w-4 h-4 text-stone-500 shrink-0" />
              <span>
                <strong>Past Events Archive:</strong> Events occurring before today ({todayStr}) are automatically moved here and removed from the visitor-facing calendar.
              </span>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 bg-stone-200 rounded text-stone-800 shrink-0">
              {pastArchivedEvents.length} archived
            </span>
          </div>

          {pastArchivedEvents.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-xl p-12 text-center">
              <Archive className="w-10 h-10 text-stone-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-stone-900 mb-1">No Past Events Archived Yet</h3>
              <p className="text-stone-500 text-xs sm:text-sm max-w-sm mx-auto">
                As events conclude, they will automatically shift into this archive.
              </p>
            </div>
          ) : (
            pastArchivedEvents.map((evt) => (
              <div
                key={evt.id}
                className="bg-white border border-stone-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-stone-500 mb-1 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-100 text-stone-600 border border-stone-200">
                      Concluded
                    </span>
                    <span className="font-mono text-stone-700">{evt.date}</span>
                    <span>·</span>
                    <span>{evt.time}</span>
                    <span>·</span>
                    <span className="truncate">{evt.location}</span>
                  </div>
                  <h4 className="text-base font-bold text-stone-900 truncate">{evt.title}</h4>
                  <p className="text-xs text-stone-600 line-clamp-1 mt-0.5">{evt.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onOpenEditModal(evt)}
                    className="px-3 py-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => onUnpublish(evt.id)}
                    className="px-3 py-1.5 text-xs font-medium text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors flex items-center gap-1.5 border border-amber-200"
                    title="Send event back to pending queue"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Unpublish</span>
                  </button>
                  <button
                    onClick={() => onDeleteEvent(evt.id)}
                    className="px-3 py-1.5 text-xs font-medium text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-1.5 border border-rose-200"
                    title="Permanently delete event"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 4. SUBMISSION AUDIT HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-600">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Event Title</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {allHistory.map((evt) => (
                  <tr key={evt.id} className="hover:bg-stone-50/50">
                    <td className="py-3 px-4 font-medium text-stone-900 max-w-xs truncate">
                      {evt.title}
                      {evt.contactEmail && (
                        <div className="text-[11px] text-stone-400 font-normal truncate">
                          {evt.contactEmail}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {evt.date} · {evt.time}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {evt.status === 'approved' && (
                        <span className="text-emerald-700 font-medium">Approved</span>
                      )}
                      {evt.status === 'rejected' && (
                        <span className="text-stone-500 font-medium">Rejected</span>
                      )}
                      {evt.status === 'pending' && (
                        <span className="text-amber-700 font-semibold">Pending</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-stone-400 font-mono">
                      {new Date(evt.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => onOpenEditModal(evt)}
                        className="text-stone-600 hover:text-stone-900 font-medium mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDeleteEvent(evt.id)}
                        className="text-rose-600 hover:text-rose-900 font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. NEWSLETTER & AUTOMATION TAB */}
      {activeTab === 'newsletter' && (
        <div className="space-y-6">
          {/* Top Info Banner */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active 60-Day Rolling Bulletin Feed</span>
              </div>
              <h3 className="text-xl font-bold text-stone-900">
                Weekly Newsletter &amp; Brevo Integration
              </h3>
              <p className="text-stone-500 text-xs sm:text-sm mt-0.5">
                Configure your Brevo API key for real-time auto-sync, manage the 60-day rolling RSS digest, and preview weekly emails.
              </p>
            </div>

            {openNewsletterModal && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openNewsletterModal('preview')}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <span>Email Preview &amp; HTML</span>
                </button>
              </div>
            )}
          </div>

          {/* Primary: Brevo API Key Configuration Box */}
          <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center shrink-0 shadow-xs">
                  <Key className="w-5 h-5 text-stone-950" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-stone-900">
                    Brevo API Key (Real-Time Auto-Sync)
                  </h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Enter your Brevo v3 API key below. New student and faculty signups from the website footer will be added to your Brevo contacts automatically.
                  </p>
                </div>
              </div>

              <div>
                {brevoConfig.configured ? (
                  <span className="px-3 py-1 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                    <Check className="w-3.5 h-3.5 text-emerald-700" /> Auto-Sync Active
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-amber-100 border border-amber-300 text-amber-900 rounded-full text-xs font-bold">
                    API Key Not Set
                  </span>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveBrevo} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-stone-900">
                    Brevo API Key <span className="text-rose-600 font-bold">*</span>
                  </label>
                  <a
                    href="https://app.brevo.com/settings/keys/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <span>Get API Key from Brevo</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="relative">
                  <input
                    type={showBrevoKey ? 'text' : 'password'}
                    value={brevoKeyInput}
                    onChange={(e) => setBrevoKeyInput(e.target.value)}
                    placeholder={brevoConfig.maskedKey ? `Current Key: ${brevoConfig.maskedKey} (paste new key here to replace)` : 'xkeysib-xxxxxxxxxxxxxxxxxxxx'}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 pr-10 shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBrevoKey(!showBrevoKey)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 cursor-pointer p-0.5"
                    tabIndex={-1}
                    title={showBrevoKey ? 'Hide key' : 'Show key'}
                  >
                    {showBrevoKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <p className="text-[11px] text-stone-500 mt-1.5 leading-relaxed">
                  💡 In Brevo (<a href="https://www.brevo.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold text-stone-800">brevo.com</a>), click your profile name at top-right → <strong>SMTP &amp; API</strong> → <strong>API Keys</strong> tab → click <strong>Generate a new API key</strong>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-900 mb-1">
                  Brevo Contact List ID <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={brevoListInput}
                  onChange={(e) => setBrevoListInput(e.target.value)}
                  placeholder="e.g. 2 (leave blank to add to your default contact list)"
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  Found in Brevo under <strong>Contacts</strong> → <strong>Lists</strong>. If omitted, new subscribers are added to your main contacts list.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSavingBrevo || (!brevoKeyInput.trim() && !brevoListInput.trim())}
                  className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 shadow-xs"
                >
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>{isSavingBrevo ? 'Verifying & Connecting...' : 'Save Brevo API Key & Enable Auto-Sync'}</span>
                </button>

                {brevoConfig.configured && (
                  <button
                    type="button"
                    onClick={handleSyncAllToBrevo}
                    disabled={isSyncingAll}
                    className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                    <span>{isSyncingAll ? 'Syncing...' : 'Sync All Existing Subscribers Now'}</span>
                  </button>
                )}
              </div>

              {brevoSaveMsg && (
                <div className={`p-3.5 rounded-xl text-xs font-medium border ${brevoSaveMsg.isError ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                  {brevoSaveMsg.text}
                </div>
              )}
              {syncAllResult && (
                <div className="p-3.5 bg-stone-100 border border-stone-200 rounded-xl text-xs text-stone-800 font-medium">
                  {syncAllResult}
                </div>
              )}
            </form>
          </div>

          {/* Secondary: Automated Feed URL & Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-5 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
              <span className="font-bold text-stone-900 block text-sm">Automated Feed URL</span>
              <p className="text-stone-600 leading-relaxed">
                Connect this RSS feed once to Brevo or follow.it to send automated weekly roundups of all upcoming events.
              </p>
              <div className="pt-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/api/newsletter/feed.xml`}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg font-mono text-[11px] text-stone-700"
                />
              </div>
            </div>

            <div className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
              <span className="font-bold text-emerald-950 block text-sm">100% Free Plan via Brevo</span>
              <p className="text-emerald-900 leading-relaxed">
                Brevo includes RSS campaigns on their <strong>Free Plan</strong> with up to 100,000 contacts and 300 emails/day free forever (no credit card required).
              </p>
              <div className="pt-2">
                <a
                  href="https://www.brevo.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg font-semibold text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Visit Brevo.com</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
