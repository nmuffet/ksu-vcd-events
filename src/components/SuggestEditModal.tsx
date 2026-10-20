import React, { useState, useEffect } from 'react';
import { CommunityEvent, EventSubmissionInput } from '../types';
import { X, CheckCircle2 } from 'lucide-react';
import { TimeInputPicker } from './TimeInputPicker';
import { parseTimeTo24, buildFormattedTimeString } from '../utils/dateUtils';

interface SuggestEditModalProps {
  isOpen: boolean;
  event: CommunityEvent | null;
  onClose: () => void;
  onSubmitSuggestion: (data: EventSubmissionInput) => Promise<CommunityEvent>;
  onViewTracking?: (eventId: string) => void;
}

export const SuggestEditModal: React.FC<SuggestEditModalProps> = ({
  isOpen,
  event,
  onClose,
  onSubmitSuggestion,
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [reason, setReason] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedEvent, setSubmittedEvent] = useState<CommunityEvent | null>(null);
  const [openedAt, setOpenedAt] = useState<number>(Date.now());
  const [hpWebsite, setHpWebsite] = useState('');

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDate(event.date);

      const parsed = parseTimeTo24(event.time);
      const allDay = event.isAllDay ?? parsed.isAllDay;
      setIsAllDay(allDay);
      setStartTime(event.startTime || parsed.startTime || '');
      setEndTime(event.endTime || parsed.endTime || '');

      setLocation(event.location);
      setDescription(event.description);
      setContactEmail(event.contactEmail || '');
      setReason('');
      setErrors({});
      setSubmittedEvent(null);
      setOpenedAt(Date.now());
      setHpWebsite('');
    }
  }, [event, isOpen]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!title.trim()) {
      errs.title = 'Title is required';
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
      errs.location = 'Location is required';
    }
    if (!description.trim()) {
      errs.description = 'Description is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !validate()) return;

    setIsSubmitting(true);
    try {
      const formattedTime = isAllDay ? 'All Day' : buildFormattedTimeString(startTime, endTime);
      const created = await onSubmitSuggestion({
        title: title.trim(),
        date,
        time: formattedTime,
        startTime: isAllDay ? undefined : startTime,
        endTime: isAllDay ? undefined : endTime,
        isAllDay,
        location: location.trim(),
        description: description.trim(),
        contactEmail: contactEmail.trim() || undefined,
        suggestedEditForId: event.id,
        suggestedEditTitle: event.title,
        suggestionReason: reason.trim() || undefined,
        _hp_website: hpWebsite.trim() || undefined,
        _opened_at: openedAt,
      });
      setSubmittedEvent(created);
    } catch (err: any) {
      setErrors({ form: err.message || 'Failed to submit suggestion. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-stone-900">Suggest Edits to Event</h3>
            <p className="text-xs text-stone-500">
              Editing: <span className="font-semibold text-stone-800">{event.title}</span>
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
            /* Success confirmation screen */
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto text-teal-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h4 className="text-lg font-bold text-stone-900 mb-1">
                  Edit Suggestion Submitted!
                </h4>
                <p className="text-stone-600 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                  Thank you for keeping our community calendar accurate. Your proposed revisions have been routed to the admin moderation queue for review.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-stone-900 text-white font-medium text-xs sm:text-sm rounded-lg hover:bg-stone-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            /* Suggestion Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Anti-bot honeypot */}
              <div aria-hidden="true" style={{ opacity: 0, position: 'absolute', top: 0, left: 0, height: 0, width: 0, zIndex: -1, pointerEvents: 'none' }}>
                <input
                  type="text"
                  name="user_website_url"
                  value={hpWebsite}
                  onChange={(e) => setHpWebsite(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg text-xs text-amber-900 leading-relaxed">
                <span className="font-semibold">Community moderation notice:</span> Anyone can suggest updates to this event. Revisions are added to the admin queue and will update the live calendar once approved by the curator.
              </div>

              {errors.form && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {errors.form}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Event Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 ${
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
                  className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 ${
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
                  className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 ${
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
                  className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 ${
                    errors.description ? 'border-rose-400 bg-rose-50/20' : 'border-stone-300'
                  }`}
                />
                {errors.description && <p className="text-rose-600 text-xs mt-1">{errors.description}</p>}
              </div>

              {/* Optional Suggestion Reason & Contact Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    What is changing? <span className="text-stone-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g., Room moved, date postponed"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Your Contact Email <span className="text-stone-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-stone-900 text-white rounded-lg text-sm font-semibold hover:bg-stone-800 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting Suggestion...' : 'Submit Suggestion for Review'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
