import React, { useState } from 'react';
import { CommunityEvent } from '../types';
import { formatMonthAndDay, generateGoogleCalendarUrl, downloadIcsFile } from '../utils/dateUtils';
import { MapPin, Clock, Mail, CalendarPlus, Share2, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface EventCardProps {
  event: CommunityEvent;
  isAdmin?: boolean;
  onEdit?: (event: CommunityEvent) => void;
  onDelete?: (eventId: string) => void;
  onSuggestEdit?: (event: CommunityEvent) => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  isAdmin = false,
  onEdit,
  onDelete,
  onSuggestEdit,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCalendarMenu, setShowCalendarMenu] = useState(false);
  const { month, day, weekday } = formatMonthAndDay(event.date);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `${event.title} - ${event.date} at ${event.time}\nLocation: ${event.location}\n\n${event.description}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <article
      onClick={() => setIsOpen(!isOpen)}
      className={`bg-white border rounded-xl p-5 sm:p-6 transition-all duration-150 cursor-pointer ${
        isOpen
          ? 'border-stone-400 shadow-sm'
          : 'border-stone-200/90 hover:border-stone-300'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
        {/* Date block */}
        <div className="shrink-0 flex sm:flex-col items-center justify-center bg-stone-100 rounded-lg py-2.5 px-3.5 sm:w-20 text-center border border-stone-200/60">
          <span className="text-[11px] font-bold tracking-wider text-stone-500 uppercase">
            {month}
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-mono tabular-nums leading-none my-0.5 ml-2 sm:ml-0">
            {day}
          </span>
          <span className="text-[11px] font-medium text-stone-600 ml-2 sm:ml-0">
            {weekday}
          </span>
        </div>

        {/* Event Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h2 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight leading-snug">
              {event.title}
            </h2>
            <div className="shrink-0 text-stone-400 hover:text-stone-700 transition-colors pt-1">
              {isOpen ? (
                <ChevronUp className="w-5 h-5 text-stone-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-stone-400" />
              )}
            </div>
          </div>

          {/* Time & Location summary */}
          <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs sm:text-sm text-stone-600 mb-2 font-medium">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span>{event.time}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span>{event.location}</span>
            </div>
          </div>

          {/* Collapsed state prompt */}
          {!isOpen && (
            <p className="text-stone-400 text-xs mt-1">
              Click to view details and options...
            </p>
          )}

          {/* Expanded Open State */}
          {isOpen && (
            <div className="mt-3 pt-3 border-t border-stone-100 space-y-4" onClick={(e) => e.stopPropagation()}>
              {/* Optional Contact Email */}
              {event.contactEmail && (
                <div className="flex items-center gap-1.5 text-xs text-stone-500">
                  <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>Contact:</span>
                  <a
                    href={`mailto:${event.contactEmail}`}
                    className="hover:underline hover:text-stone-800 font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {event.contactEmail}
                  </a>
                </div>
              )}

              {/* Full Description */}
              <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-line">
                {event.description}
              </p>

              {/* Action Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-100">
                <div className="flex items-center gap-4">
                  {/* Calendar export menu */}
                  <div className="relative inline-block text-left">
                    <button
                      type="button"
                      onClick={() => setShowCalendarMenu(!showCalendarMenu)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 px-3 py-1.5 rounded-md border border-stone-200 transition-colors"
                    >
                      <CalendarPlus className="w-3.5 h-3.5 text-stone-500" />
                      <span>Add to Calendar</span>
                    </button>

                    {showCalendarMenu && (
                      <div
                        className="absolute left-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-stone-200 py-1 z-20 text-xs"
                        onMouseLeave={() => setShowCalendarMenu(false)}
                      >
                        <a
                          href={generateGoogleCalendarUrl(event)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block px-3 py-2 text-stone-700 hover:bg-stone-50 hover:text-stone-900"
                          onClick={() => setShowCalendarMenu(false)}
                        >
                          Google Calendar
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            downloadIcsFile(event);
                            setShowCalendarMenu(false);
                          }}
                          className="w-full text-left block px-3 py-2 text-stone-700 hover:bg-stone-50 hover:text-stone-900"
                        >
                          Apple / Outlook (.ics)
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Suggest edits: Text link styled button (no shape surrounding it) visible only when open */}
                  {onSuggestEdit && (
                    <button
                      type="button"
                      onClick={() => onSuggestEdit(event)}
                      className="text-stone-500 hover:text-stone-900 underline underline-offset-4 text-xs sm:text-sm font-medium transition-colors bg-transparent border-none p-0 cursor-pointer"
                    >
                      Suggest edits
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 px-2 py-1 rounded-md hover:bg-stone-50 transition-colors"
                    title="Copy event details"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-medium">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5 text-stone-400" />
                        <span>Share</span>
                      </>
                    )}
                  </button>

                  {/* Admin quick controls */}
                  {isAdmin && (
                    <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(event)}
                          className="text-xs font-medium text-stone-700 hover:text-stone-900 px-2 py-1 rounded bg-stone-100 hover:bg-stone-200"
                        >
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(event.id)}
                          className="text-xs font-medium text-rose-700 hover:text-rose-900 px-2 py-1 rounded bg-rose-50 hover:bg-rose-100"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
