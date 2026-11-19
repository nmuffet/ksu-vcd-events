import React, { useState } from 'react';
import { api } from '../api/client';

interface FooterProps {
  onOpenSubmit: () => void;
  onOpenNewsletter?: () => void;
  onOpenAdminDocs?: () => void;
  onSwitchToAdmin?: () => void;
  onSwitchToCalendar: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenSubmit,
  onOpenNewsletter,
  onSwitchToCalendar,
  onSwitchToAdmin,
}) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      await api.subscribe(email);
      setStatus('success');
      setEmail('');
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err?.message || 'Failed to subscribe. Please verify your email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="bg-white border-t border-stone-200 mt-16 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Left: Navigation Links */}
          <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-stone-600">
            <button
              onClick={onSwitchToCalendar}
              className="hover:text-[#003976] transition-colors cursor-pointer"
            >
              Public Calendar
            </button>
            <button
              onClick={onOpenSubmit}
              className="hover:text-[#003976] transition-colors cursor-pointer"
            >
              Submit Event
            </button>
            <button
              onClick={() => {
                onSwitchToAdmin?.();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-[#003976] transition-colors cursor-pointer"
            >
              Admin Queue
            </button>
          </div>

          {/* Right: Newsletter Signup with Header */}
          <div className="w-full sm:w-auto">
            <h4 className="font-semibold text-stone-900 text-xs tracking-tight mb-1">
              Newsletter Signup
            </h4>
            <p className="text-[11px] text-stone-500 mb-2.5">
              Get upcoming VCD Events to your inbox every week.
            </p>
            <form onSubmit={handleSubscribe} className="flex items-center gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@kent.edu"
                className="px-3.5 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003976]/20 focus:border-[#003976] text-stone-900 w-full sm:w-60 transition-colors"
              />
              <button
                type="submit"
                disabled={isSubmitting || !email.trim()}
                className="px-4 py-2 bg-[#003976] text-white font-semibold text-xs rounded-lg hover:bg-[#002d5e] transition-colors shrink-0 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isSubmitting ? 'Joining...' : 'Subscribe'}
              </button>
            </form>
            {status === 'success' && (
              <p className="text-emerald-700 text-xs mt-1.5 font-medium">
                ✓ Subscribed to the weekly digest!
              </p>
            )}
            {status === 'error' && (
              <p className="text-rose-600 text-xs mt-1.5">
                {errorMessage || 'Failed to subscribe.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
