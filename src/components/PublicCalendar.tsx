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
            <h2 className="text-2xl font-bold tracking-tight text-stone-900">
              Upcoming Events
            </h2>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && events.length === 0 && (
          <div className="py-16 text-center">
            <div className="inline-flex items-center gap-2 text-stone-500 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin text-stone-400" />
              <span>Loading community events...</span>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && events.length === 0 && (
          <div className="bg-white border border-stone-200 rounded-xl p-12 text-center max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4 text-stone-400">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-stone-900 mb-2">No upcoming events yet</h3>
            <p className="text-stone-500 text-sm mb-6">
              Be the first neighbor to post a community gathering, workshop, or volunteer day.
            </p>
            <button
              onClick={openSubmitModal}
              className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors inline-flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Submit First Event
            </button>
          </div>
        )}

        {/* Grouped Events */}
        {events.length > 0 && (() => {
          const grouped = events.reduce((acc, event) => {
            const monthKey = event.date.substring(0, 7);
            console.log('Event Date:', event.date, 'MonthKey:', monthKey);
            if (!acc[monthKey]) acc[monthKey] = [];
            acc[monthKey].push(event);
            return acc;
          }, {} as Record<string, CommunityEvent[]>);
          console.log('Grouped Events:', grouped);

          return Object.entries(grouped).map(([monthKey, monthEvents]) => {
            const [year, month] = monthKey.split('-').map(Number);
            const date = new Date(year, month - 1, 1);
            const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            return (
              <div key={monthKey} className="mb-8">
                <div className="sticky top-[64px] z-30 bg-stone-50 py-3 font-bold text-lg text-stone-900 border-b border-stone-200">
                  {monthName}
                </div>
                <div className="space-y-4 mt-4">
                  {monthEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      isAdmin={isAdmin}
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
