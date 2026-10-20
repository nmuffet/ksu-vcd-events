import React, { useState, useEffect } from 'react';
import { CommunityEvent } from '../types';
import { X, Save, CheckCircle } from 'lucide-react';
import { TimeInputPicker } from './TimeInputPicker';
import { parseTimeTo24, buildFormattedTimeString } from '../utils/dateUtils';

interface EditEventModalProps {
  isOpen: boolean;
  event: CommunityEvent | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<CommunityEvent>) => Promise<void>;
}

export const EditEventModal: React.FC<EditEventModalProps> = ({
  isOpen,
  event,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [timeError, setTimeError] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('approved');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDate(event.date);
      
      const parsed = parseTimeTo24(event.time);
      const allDay = event.isAllDay ?? parsed.isAllDay;
      setIsAllDay(allDay);
      setStartTime(event.startTime || parsed.startTime || '');
      setEndTime(event.endTime || parsed.endTime || '');
      setTimeError('');

      setLocation(event.location);
      setDescription(event.description);
      setContactEmail(event.contactEmail || '');
      setStatus(event.status);
      setNotes(event.notes || '');
    }
  }, [event, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    if (!isAllDay && !startTime) {
      setTimeError('Please select a start time (or check All-day event)');
      return;
    }
    if (!isAllDay && startTime && endTime && endTime < startTime) {
      setTimeError('End time cannot be earlier than start time');
      return;
    }

    setIsSaving(true);
    try {
      const formattedTime = isAllDay ? 'All Day' : buildFormattedTimeString(startTime, endTime);
      await onSave(event.id, {
        title: title.trim(),
        date,
        time: formattedTime,
        startTime: isAllDay ? undefined : startTime,
        endTime: isAllDay ? undefined : endTime,
        isAllDay,
        location: location.trim(),
        description: description.trim(),
        contactEmail: contactEmail.trim() || undefined,
        status,
        notes: notes.trim() || undefined,
        reviewedAt: status !== 'pending' ? new Date().toISOString() : event.reviewedAt,
        reviewedBy: status !== 'pending' ? 'Nick' : event.reviewedBy,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden my-8">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-stone-900">Edit Event Details</h3>
            <p className="text-xs text-stone-500 font-mono">Reference: {event.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Event Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
            />
          </div>

          <TimeInputPicker
            startTime={startTime}
            endTime={endTime}
            isAllDay={isAllDay}
            onStartTimeChange={(val) => {
              setStartTime(val);
              setTimeError('');
            }}
            onEndTimeChange={(val) => {
              setEndTime(val);
              setTimeError('');
            }}
            onIsAllDayChange={(val) => {
              setIsAllDay(val);
              setTimeError('');
            }}
            error={timeError}
            required={true}
          />

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Location / Venue
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Description
            </label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="optional"
                className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Publication Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
              >
                <option value="pending">Pending Review</option>
                <option value="approved">Approved & Published</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Internal Admin Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder=""
              className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
            />
          </div>

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
              disabled={isSaving}
              className="px-5 py-2 text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
