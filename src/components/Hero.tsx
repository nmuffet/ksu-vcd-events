import React from 'react';
import { PlusCircle } from 'lucide-react';

interface HeroProps {
  totalApproved: number;
  openSubmitModal: () => void;
  scrollToEvents?: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  totalApproved,
  openSubmitModal,
  scrollToEvents,
}) => {
  return (
    <section className="bg-white border-b border-stone-200 pt-12 pb-0 sm:pt-16 sm:pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div>
          {/* Institutional Kicker */}
          <div className="text-xs sm:text-sm font-semibold text-stone-500 uppercase tracking-widest mb-3">
            Kent State University
          </div>

          {/* Large Typographic Hero Headline with non-colliding tight tracking */}
          <h1
            style={{ fontSize: '120px', letterSpacing: '-0.025em', fontVariationSettings: '"wdth" 90' }}
            className="font-bold text-stone-900 leading-[0.95] text-balance mb-2 max-w-5xl max-sm:!text-5xl max-md:!text-7xl max-lg:!text-8xl"
          >
            VCD Events
          </h1>

          {/* Subtitle */}
          <p className="text-stone-600 text-[20px] leading-relaxed max-w-2xl mb-8 font-normal">
            An AI junk app to centralize our events ¯\_(ツ)_/¯.
          </p>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-3.5 mb-6 sm:mb-10">
            <button
              type="button"
              onClick={openSubmitModal}
              className="px-6 py-3.5 bg-stone-900 text-white font-semibold text-sm sm:text-base rounded-lg hover:bg-stone-800 transition-colors shadow-xs flex items-center gap-2 whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Submit an Event</span>
            </button>

          </div>

          {/* Zero-pill metadata line */}
          <div className="pt-6 border-t border-stone-100 flex items-center gap-3 text-xs sm:text-sm text-stone-500 flex-wrap">
            <span>Events are manually approved. This calendar may not be up to date.</span>
            <span aria-hidden="true" className="text-stone-300">·</span>
          </div>
        </div>
      </div>
    </section>
  );
};
