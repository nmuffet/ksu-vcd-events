import React from 'react';
import { Clock, Sun } from 'lucide-react';
import { formatTime24to12 } from '../utils/dateUtils';

interface TimeInputPickerProps {
  startTime: string;       // "HH:mm" (24h)
  endTime: string;         // "HH:mm" (24h)
  isAllDay: boolean;
  onStartTimeChange: (val: string) => void;
  onEndTimeChange: (val: string) => void;
  onIsAllDayChange: (val: boolean) => void;
  error?: string;
  required?: boolean;
}

export const TimeInputPicker: React.FC<TimeInputPickerProps> = ({
  startTime,
  endTime,
  isAllDay,
  onStartTimeChange,
  onEndTimeChange,
  onIsAllDayChange,
  error,
  required = true,
}) => {
  // Helper to add hours to start time
  const handleAddHours = (hoursToAdd: number) => {
    if (!startTime) return;
    const [h, m] = startTime.split(':').map(Number);
    const newH = (h + hoursToAdd) % 24;
    const padH = String(newH).padStart(2, '0');
    const padM = String(m || 0).padStart(2, '0');
    onEndTimeChange(`${padH}:${padM}`);
  };

  // Preview formatted display
  const previewText = isAllDay
    ? 'All Day'
    : startTime
    ? endTime && endTime !== startTime
      ? `${formatTime24to12(startTime)} – ${formatTime24to12(endTime)}`
      : formatTime24to12(startTime)
    : '';

  return (
    <div className="space-y-2">
      {/* Header with All-day toggle */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-stone-700">
          Time {required && !isAllDay && <span className="text-rose-500">*</span>}
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-stone-600 hover:text-stone-900 select-none">
          <input
            type="checkbox"
            checked={isAllDay}
            onChange={(e) => onIsAllDayChange(e.target.checked)}
            className="rounded border-stone-300 text-stone-900 focus:ring-stone-900 w-3.5 h-3.5"
          />
          All-day event
        </label>
      </div>

      {isAllDay ? (
        <div className="flex items-center gap-2 p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-600">
          <Sun className="w-4 h-4 text-amber-500 shrink-0" />
          <span>This event runs all day (no specific start or end hour required).</span>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2.5">
            {/* Start Time input */}
            <div>
              <span className="block text-[11px] font-medium text-stone-500 mb-1">
                Start Time <span className="text-rose-500">*</span>
              </span>
              <div className="relative">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    onStartTimeChange(newStart);
                    // If no end time, or end time was previous default, suggest +1 hr
                    if (newStart && !endTime) {
                      const [h, m] = newStart.split(':').map(Number);
                      const padH = String((h + 1) % 24).padStart(2, '0');
                      const padM = String(m || 0).padStart(2, '0');
                      onEndTimeChange(`${padH}:${padM}`);
                    }
                  }}
                  className={`w-full px-2.5 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-colors ${
                    error ? 'border-rose-400 bg-rose-50/20' : 'border-stone-300'
                  }`}
                />
              </div>
            </div>

            {/* End Time input */}
            <div>
              <span className="block text-[11px] font-medium text-stone-500 mb-1">
                End Time
              </span>
              <div className="relative">
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => onEndTimeChange(e.target.value)}
                  className="w-full px-2.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Quick duration presets and formatted preview */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
            {startTime && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-stone-600 font-medium mr-1">Duration:</span>
                <button
                  type="button"
                  onClick={() => handleAddHours(1)}
                  className="px-2 py-0.5 text-[11px] font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded transition-colors"
                >
                  +1 hr
                </button>
                <button
                  type="button"
                  onClick={() => handleAddHours(2)}
                  className="px-2 py-0.5 text-[11px] font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded transition-colors"
                >
                  +2 hrs
                </button>
                <button
                  type="button"
                  onClick={() => handleAddHours(3)}
                  className="px-2 py-0.5 text-[11px] font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded transition-colors"
                >
                  +3 hrs
                </button>
              </div>
            )}

            {previewText && (
              <div className="inline-flex items-center gap-1 text-[11px] text-stone-600 ml-auto">
                <Clock className="w-3 h-3 text-stone-400" />
                <span>Displays as: <strong className="text-stone-800 font-semibold">{previewText}</strong></span>
              </div>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-rose-600 text-xs mt-1">{error}</p>}
    </div>
  );
};
