import React from 'react';
import { CommunityEvent } from '../types';
import { EventCard } from './EventCard';
import { Calendar, PlusCircle, RefreshCw } from 'lucide-react';

interface PublicCalendarProps {
  events: CommunityEvent[];
  isLoading: boolean;
  onRefresh: () => void;
  openSubmitModal: () => void;
  isAdmin?: boolean;
  onEdit?: (event: CommunityEvent) => void;
  onDelete?: (eventId: string) => void;
  onSuggestEdit?: (event: CommunityEvent) => void;
}

export const PublicCalendar: React.FC<PublicCalendarProps> = ({
  events,
  isLoading,
  onRefresh,
  openSubmitModal,
  isAdmin = false,
  onEdit,
  onDelete,
  onSuggestEdit,
}) => {
  return (
    <section id="calendar-section" className="py-8 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-4 border-b border-stone-200">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
              Upcoming Events
            </h2>
            <p className="text-stone-500 text-xs sm:text-sm mt-1">
              Scheduled exhibitions, guest lectures, critiques, and community gatherings.
            </p>
          </div>

          <div className="flex items-center gap-2">
          </div>
        </div>

        {/* Loading state */}
        {isLoading && events.length === 0 && (
          <div className="py-16 text-center">
            <div className="inline-flex items-center gap-2 text-stone-500 text-sm">
              <span>Loading upcoming events...</span>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && events.length === 0 && (
          <div className="bg-white border border-stone-200 rounded-xl p-12 text-center max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#003976] flex items-center justify-center mx-auto mb-4 border border-blue-100">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-stone-900 mb-2">No upcoming events scheduled</h3>
            <p className="text-stone-500 text-sm mb-6">
              Be the first student, faculty, or neighbor to post a community gathering, workshop, or critique.
            </p>
            <button
              onClick={openSubmitModal}
              className="px-4 py-2 bg-[#003976] text-white rounded-lg text-sm font-semibold hover:bg-[#002d5e] transition-colors inline-flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Submit an Event
            </button>
          </div>
        )}

        {/* Grouped Upcoming Events by Month */}
        {events.length > 0 && (() => {
          const grouped = events.reduce((acc, event) => {
            const monthKey = event.date.substring(0, 7);
            if (!acc[monthKey]) acc[monthKey] = [];
            acc[monthKey].push(event);
            return acc;
          }, {} as Record<string, CommunityEvent[]>);

          // Chronological (earliest upcoming first)
          const sortedMonthKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

          return sortedMonthKeys.map((monthKey) => {
            const monthEvents = grouped[monthKey];
            const [year, month] = monthKey.split('-').map(Number);
            const date = new Date(year, month - 1, 1);
            const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            return (
              <div key={monthKey} className="mb-8">
                <div className="sticky top-[64px] z-30 bg-stone-50/95 backdrop-blur py-3 font-bold text-lg text-stone-900 border-b border-stone-200 flex items-center justify-between">
                  <span className="text-[#003976]">{monthName}</span>
                  <span className="text-xs font-normal text-stone-400">
                    {monthEvents.length} {monthEvents.length === 1 ? 'event' : 'events'}
                  </span>
                </div>
                <div className="space-y-4 mt-4">
                  {monthEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      isAdmin={isAdmin}
                      isArchived={false}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onSuggestEdit={onSuggestEdit}
                    />
                  ))}
                </div>
              </div>
            );
          });
        })()}
      </div>
    </section>
  );
};
