import React from 'react';
import { Calendar } from 'lucide-react';

interface FooterProps {
  onOpenSubmit: () => void;
  onOpenNewsletter?: () => void;
  onOpenAdminDocs?: () => void;
  onSwitchToAdmin?: () => void;
  onSwitchToCalendar: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenSubmit,
  onSwitchToCalendar,
  onSwitchToAdmin,
}) => {
  return (
    <footer className="bg-white border-t border-stone-200 mt-16 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-semibold text-stone-900 text-base tracking-tight">
                VCD Events
              </span>
            </div>
            <p className="text-stone-500 text-xs max-w-sm">
              Visual Communication Design events calendar for exhibitions, guest lectures, critiques, and workshops.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-stone-600">
            <button
              onClick={onSwitchToCalendar}
              className="hover:text-stone-900 transition-colors"
            >
              Public Calendar
            </button>
            <button
              onClick={onOpenSubmit}
              className="hover:text-stone-900 transition-colors"
            >
              Submit Event
            </button>
            <button
              onClick={() => {
                onSwitchToAdmin?.();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-stone-900 transition-colors"
            >
              Admin Queue
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
