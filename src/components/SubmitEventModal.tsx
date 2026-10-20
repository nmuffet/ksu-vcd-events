import React, { useState } from 'react';
import { EventSubmissionInput, CommunityEvent } from '../types';
import { X, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';
import { TimeInputPicker } from './TimeInputPicker';
import { buildFormattedTimeString } from '../utils/dateUtils';

interface SubmitEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EventSubmissionInput) => Promise<CommunityEvent>;
  onViewTracking?: (eventId: string) => void;
}

export const SubmitEventModal: React.FC<SubmitEventModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedEvent, setSubmittedEvent] = useState<CommunityEvent | null>(null);
  const [hpWebsite, setHpWebsite] = useState('');
  const [openedAt, setOpenedAt] = useState<number>(Date.now());

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!title.trim()) {
      errs.title = 'Event title is required';
    } else if (title.trim().length < 4) {
      errs.title = 'Title should be at least 4 characters';
    }

    if (!date) {
      errs.date = 'Date is required';
    }

    if (!isAllDay && !startTime) {
      errs.time = 'Please select a start time (or check All-day event)';
    } else if (!isAllDay && startTime && endTime && endTime < startTime) {
      errs.time = 'End time cannot be earlier than start time';
    }

    if (!location.trim()) {
      errs.location = 'Location or venue address is required';
    }

    if (!description.trim()) {
      errs.description = 'Event description is required';
    } else if (description.trim().length < 15) {
      errs.description = 'Please provide at least a couple sentences about the event';
    }

    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      errs.contactEmail = 'Please enter a valid email address or leave blank';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const formattedTime = isAllDay ? 'All Day' : buildFormattedTimeString(startTime, endTime);
      const created = await onSubmit({
        title,
        date,
        time: formattedTime,
        startTime: isAllDay ? undefined : startTime,
        endTime: isAllDay ? undefined : endTime,
        isAllDay,
        location,
        description,
        contactEmail: contactEmail.trim() || undefined,
        _hp_website: hpWebsite.trim() || undefined,
        _opened_at: openedAt,
      });
      setSubmittedEvent(created);
    } catch (err: any) {
      setErrors({ form: err.message || 'Failed to submit event. Please check details and try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndSubmitAnother = () => {
    setTitle('');
    setDate('');
    setStartTime('');
    setEndTime('');
    setIsAllDay(false);
    setLocation('');
    setDescription('');
    setContactEmail('');
    setErrors({});
    setSubmittedEvent(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-stone-900">
              {submittedEvent ? 'Event Submitted' : 'Submit a Community Event'}
            </h2>
            <p className="text-xs text-stone-500">
              {submittedEvent
                ? 'Your event is in the moderation queue'
                : 'Free · Anonymous · Reviewed prior to publishing'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {submittedEvent ? (
            /* Confirmation screen */
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-teal-50/70 border border-teal-200/60 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-teal-700 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <h4 className="font-semibold text-teal-950 mb-1">
                    Thank you! Event received for moderation.
                  </h4>
                  <p className="text-teal-800 leading-relaxed text-xs sm:text-sm">
                    Your event <span className="font-semibold text-teal-950">"{submittedEvent.title}"</span> has been placed into the moderation queue. Once reviewed by an admin, it will be published to the public calendar.
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 bg-stone-900 text-white font-medium text-xs sm:text-sm rounded-lg hover:bg-stone-800 transition-colors inline-flex items-center justify-center gap-2"
                >
                  Done
                </button>
                <button
                  type="button"
                  onClick={handleResetAndSubmitAnother}
                  className="px-4 py-2.5 bg-stone-100 text-stone-700 font-medium text-xs sm:text-sm rounded-lg hover:bg-stone-200 transition-colors"
                >
                  Submit Another Event
                </button>
              </div>
            </div>
          ) : (
            /* Submission Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Anti-bot honeypot trap (invisible to human visitors) */}
              <div aria-hidden="true" style={{ opacity: 0, position: 'absolute', top: 0, left: 0, height: 0, width: 0, zIndex: -1, pointerEvents: 'none' }}>
                <label htmlFor="user_website_url">Leave this website field empty</label>
                <input
                  type="text"
                  id="user_website_url"
                  name="user_website_url"
                  value={hpWebsite}
                  onChange={(e) => setHpWebsite(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              {errors.form && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {errors.form}
                </div>
              )}

              {/* Event Title */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Event Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="AIGA Typography Workshop"
                  className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-colors ${
                    errors.title ? 'border-rose-400 bg-rose-50/20' : 'border-stone-300'
                  }`}
                />
                {errors.title && <p className="text-rose-600 text-xs mt-1">{errors.title}</p>}
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-colors ${
                    errors.date ? 'border-rose-400 bg-rose-50/20' : 'border-stone-300'
                  }`}
                />
                {errors.date && <p className="text-rose-600 text-xs mt-1">{errors.date}</p>}
              </div>

              {/* Structured Time Picker */}
              <TimeInputPicker
                startTime={startTime}
                endTime={endTime}
                isAllDay={isAllDay}
                onStartTimeChange={(val) => {
                  setStartTime(val);
                  if (errors.time) setErrors((prev) => ({ ...prev, time: '' }));
                }}
                onEndTimeChange={(val) => {
                  setEndTime(val);
                  if (errors.time) setErrors((prev) => ({ ...prev, time: '' }));
                }}
                onIsAllDayChange={(val) => {
                  setIsAllDay(val);
                  if (errors.time) setErrors((prev) => ({ ...prev, time: '' }));
                }}
                error={errors.time}
                required={true}
              />

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Location / Venue <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Taylor Hall"
                  className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-colors ${
                    errors.location ? 'border-rose-400 bg-rose-50/20' : 'border-stone-300'
                  }`}
                />
                {errors.location && <p className="text-rose-600 text-xs mt-1">{errors.location}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder=""
                  className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-colors ${
                    errors.description ? 'border-rose-400 bg-rose-50/20' : 'border-stone-300'
                  }`}
                />
                {errors.description && (
                  <p className="text-rose-600 text-xs mt-1">{errors.description}</p>
                )}
              </div>

              {/* Contact Email (Optional) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-stone-700">
                    Contact Email <span className="text-stone-400 font-normal">(Optional)</span>
                  </label>
                  <span className="text-[11px] text-stone-400">For organizer questions</span>
                </div>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="organizer@community.org"
                  className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-colors ${
                    errors.contactEmail ? 'border-rose-400 bg-rose-50/20' : 'border-stone-300'
                  }`}
                />
                {errors.contactEmail && (
                  <p className="text-rose-600 text-xs mt-1">{errors.contactEmail}</p>
                )}
              </div>

              {/* Info notice */}
              <div className="flex items-center gap-2 p-3 bg-stone-50 rounded-lg text-xs text-stone-500 border border-stone-200/60">
                <ShieldAlert className="w-4 h-4 text-stone-400 shrink-0" />
                <span>
                  Events appear after admin review. Submissions must be community-friendly and non-commercial spam.
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors disabled:opacity-50 shadow-xs flex items-center gap-2"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit for Moderation'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
