import React from 'react';
import { Calendar, PlusCircle } from 'lucide-react';

interface HeaderProps {
  activeView: 'calendar' | 'admin';
  setActiveView: (view: 'calendar' | 'admin') => void;
  openSubmitModal: () => void;
  openNewsletterModal?: () => void;
  openAdminDocsModal?: () => void;
  pendingCount?: number;
  isAdminLoggedIn?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  setActiveView,
  openSubmitModal,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-stone-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark (single element, clean text) */}
        <button
          onClick={() => {
            setActiveView('calendar');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-2.5 text-left text-stone-900 hover:text-stone-700 transition-colors shrink-0"
        >
          <span className="font-semibold text-lg tracking-tight whitespace-nowrap">
            VCD Events
          </span>
        </button>

        {/* Zone 2: Primary Action Button */}
        <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={openSubmitModal}
              className="px-5 py-3 sm:px-4 sm:py-2 text-sm sm:text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors shadow-xs flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <PlusCircle className="w-5 h-5 sm:w-4 sm:h-4" />
              <span>Submit Event</span>
            </button>
        </div>
      </div>
    </header>
  );
};
