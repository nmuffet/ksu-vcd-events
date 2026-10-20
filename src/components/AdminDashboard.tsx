import React, { useState } from 'react';
import { CommunityEvent } from '../types';
import { formatDateLong, formatRelativeTime } from '../utils/dateUtils';
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
} from 'lucide-react';

interface AdminDashboardProps {
  events: CommunityEvent[];
  isAdminLoggedIn: boolean;
  adminPassword: string;
  onLogin: (password: string) => Promise<boolean>;
  onLogout: () => void;
  onApprove: (id: string, notes?: string) => Promise<void>;
  onReject: (id: string, notes?: string) => Promise<void>;
  onOpenEditModal: (event: CommunityEvent) => void;
  onDeleteEvent: (id: string) => Promise<void>;
  onUnpublish: (id: string) => Promise<void>;
  openAdminDocs: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  events,
  isAdminLoggedIn,
  adminPassword,
  onLogin,
  onLogout,
  onApprove,
  onReject,
  onOpenEditModal,
  onDeleteEvent,
  onUnpublish,
  openAdminDocs,
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'published' | 'archive'>('pending');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const pendingEvents = events.filter((e) => e.status === 'pending');
  const approvedEvents = events
    .filter((e) => e.status === 'approved')
    .sort((a, b) => a.date.localeCompare(b.date));
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

          {/* Password Login */}
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
                  autoFocus
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
              className="w-full py-2.5 px-4 bg-stone-900 text-white font-medium text-sm rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>{isLoggingIn ? 'Verifying...' : 'Unlock Moderation Portal'}</span>
            </button>
          </form>
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
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Event Moderation Dashboard
          </h2>
          <p className="text-stone-400 text-xs sm:text-sm mt-0.5">
            Review community submissions, edit details, and maintain public board quality.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

      {/* Segmented Controls / Tabs */}
      <div className="flex items-center gap-1 p-1 bg-stone-200/80 rounded-xl mb-6 max-w-md">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'pending'
              ? 'bg-white text-stone-900 shadow-xs'
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
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'published'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span>Published ({approvedEvents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('archive')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'archive'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span>History ({allHistory.length})</span>
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

      {/* 2. PUBLISHED CALENDAR TAB */}
      {activeTab === 'published' && (
        <div className="space-y-3">
          {approvedEvents.map((evt) => (
            <div
              key={evt.id}
              className="bg-white border border-stone-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
                  <span className="font-mono">{evt.date}</span>
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
          ))}
        </div>
      )}

      {/* 3. SUBMISSION ARCHIVE / HISTORY */}
      {activeTab === 'archive' && (
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
    </section>
  );
};
