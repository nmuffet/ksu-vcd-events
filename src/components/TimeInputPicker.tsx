import React, { useState, useEffect, useRef } from 'react';
import { Clock, Sun, ChevronDown, X } from 'lucide-react';
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

// Common time intervals for the dropdown menu
const COMMON_TIMES_12H = [
  '8:00', '8:30', '9:00', '9:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '1:00', '1:30',
  '2:00', '2:30', '3:00', '3:30', '4:00', '4:30',
  '5:00', '5:30', '6:00', '6:30', '7:00', '7:30',
  '8:00', '8:30', '9:00', '9:30', '10:00', '10:30',
  '11:00', '11:30'
];

interface SingleTimeInputProps {
  label: string;
  value24: string;
  onChange: (val24: string) => void;
  required?: boolean;
  hasError?: boolean;
  placeholder?: string;
  defaultAmPm?: 'AM' | 'PM';
}

const SingleTimeInput: React.FC<SingleTimeInputProps> = ({
  label,
  value24,
  onChange,
  required = false,
  hasError = false,
  placeholder = 'Select or type time...',
  defaultAmPm = 'AM',
}) => {
  // Parse incoming 24h time into 12h display and AM/PM
  const parse24 = (val: string): { time12: string; ampm: 'AM' | 'PM' } => {
    if (!val || !val.includes(':')) {
      return { time12: '', ampm: defaultAmPm };
    }
    const [hStr, mStr] = val.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10) || 0;
    if (isNaN(h)) return { time12: '', ampm: defaultAmPm };

    const ampm: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const displayM = m < 10 ? `0${m}` : String(m);
    return { time12: `${displayH}:${displayM}`, ampm };
  };

  const initial = parse24(value24);
  const [typedValue, setTypedValue] = useState(initial.time12);
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(initial.ampm);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal state if external value24 changes
  useEffect(() => {
    const parsed = parse24(value24);
    setTypedValue(parsed.time12);
    if (value24) {
      setAmpm(parsed.ampm);
    }
  }, [value24]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Convert 12h string + current AM/PM to 24h "HH:mm"
  const commitTime = (rawTime12: string, targetAmPm: 'AM' | 'PM') => {
    const trimmed = rawTime12.trim().toLowerCase();
    if (!trimmed) {
      onChange('');
      return;
    }

    // Check if user typed am/pm directly into the input (e.g. "6pm" or "6:30 pm")
    let detectedAmPm = targetAmPm;
    let cleanTime = trimmed;
    if (cleanTime.includes('pm')) {
      detectedAmPm = 'PM';
      cleanTime = cleanTime.replace('pm', '').trim();
    } else if (cleanTime.includes('am')) {
      detectedAmPm = 'AM';
      cleanTime = cleanTime.replace('am', '').trim();
    }

    // Match "H:MM" or "H"
    const match = cleanTime.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
    if (!match) {
      // Invalid format, revert or leave empty
      return;
    }

    let h = parseInt(match[1], 10);
    const m = match[2] ? parseInt(match[2], 10) : 0;

    // If typed 24-hour style (e.g. "14:00" or "18")
    if (h >= 12 && h < 24) {
      detectedAmPm = 'PM';
    } else if (h === 24 || h === 0) {
      h = 12;
      detectedAmPm = 'AM';
    }

    // Normalize 12h hour to 24h
    let h24 = h;
    if (detectedAmPm === 'PM' && h24 < 12) {
      h24 += 12;
    } else if (detectedAmPm === 'AM' && h24 === 12) {
      h24 = 0;
    }

    if (h24 < 0 || h24 > 23 || m < 0 || m > 59) return;

    const padH = String(h24).padStart(2, '0');
    const padM = String(m).padStart(2, '0');
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const displayM = String(m).padStart(2, '0');

    setAmpm(detectedAmPm);
    setTypedValue(`${displayH}:${displayM}`);
    onChange(`${padH}:${padM}`);
  };

  const handleSelectDropdownTime = (timeStr: string) => {
    commitTime(timeStr, ampm);
    setIsOpen(false);
  };

  const handleToggleAmPm = (newAmPm: 'AM' | 'PM') => {
    setAmpm(newAmPm);
    if (typedValue) {
      commitTime(typedValue, newAmPm);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTypedValue(val);

    // Auto-detect typed am/pm on the fly
    const lower = val.toLowerCase();
    if (lower.includes('pm') && ampm !== 'PM') {
      setAmpm('PM');
    } else if (lower.includes('am') && ampm !== 'AM') {
      setAmpm('AM');
    }
  };

  const handleInputBlur = () => {
    if (typedValue) {
      commitTime(typedValue, ampm);
    } else {
      onChange('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitTime(typedValue, ampm);
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      setIsOpen(true);
    }
  };

  const handleClear = () => {
    setTypedValue('');
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <span className="block text-[11px] font-medium text-stone-600 mb-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>

      <div className="flex items-center gap-1.5">
        {/* Time typing input with Dropdown toggle */}
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={typedValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            onClick={() => setIsOpen(true)}
            className={`w-full pl-3 pr-12 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-colors font-medium text-stone-900 ${
              hasError ? 'border-rose-400 bg-rose-50/20' : 'border-stone-300'
            }`}
          />

          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            {typedValue && (
              <button
                type="button"
                onClick={handleClear}
                title="Clear time"
                className="p-1 text-stone-400 hover:text-stone-700 transition-colors rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              title="Open time dropdown"
              className="p-1 text-stone-400 hover:text-stone-800 transition-colors rounded-md"
            >
              <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${isOpen ? 'rotate-180 text-stone-900' : ''}`} />
            </button>
          </div>
        </div>

        {/* AM / PM Toggle Selection */}
        <div className="inline-flex items-center rounded-lg border border-stone-200 bg-stone-100 p-0.5 shrink-0 select-none">
          <button
            type="button"
            onClick={() => handleToggleAmPm('AM')}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
              ampm === 'AM'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => handleToggleAmPm('PM')}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
              ampm === 'PM'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            PM
          </button>
        </div>
      </div>

      {/* Scrollable Time Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-full bg-white rounded-xl shadow-xl border border-stone-200 py-1.5 z-50 max-h-52 overflow-y-auto">
          <div className="px-2.5 py-1 text-[10px] font-semibold text-stone-600 uppercase tracking-wider border-b border-stone-100 flex items-center justify-between">
            <span>Select time ({ampm})</span>
            <span className="text-stone-600 font-normal">or type above</span>
          </div>
          <div className="py-1">
            {COMMON_TIMES_12H.map((time) => {
              const isSelected = typedValue === time;
              return (
                <button
                  key={time}
                  type="button"
                  onClick={() => handleSelectDropdownTime(time)}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-stone-100 transition-colors ${
                    isSelected
                      ? 'bg-stone-100 text-stone-900 font-bold'
                      : 'text-stone-700'
                  }`}
                >
                  <span>{time} {ampm}</span>
                  {isSelected && <span className="text-stone-900 text-[10px] font-bold">Selected</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

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
    <div className="space-y-2.5">
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
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Start Time input */}
            <SingleTimeInput
              label="Start Time"
              value24={startTime}
              required={required}
              hasError={Boolean(error)}
              defaultAmPm="AM"
              placeholder="e.g. 10:00"
              onChange={(newStart) => {
                onStartTimeChange(newStart);
                // If no end time, suggest +1 hr
                if (newStart && !endTime) {
                  const [h, m] = newStart.split(':').map(Number);
                  const padH = String((h + 1) % 24).padStart(2, '0');
                  const padM = String(m || 0).padStart(2, '0');
                  onEndTimeChange(`${padH}:${padM}`);
                }
              }}
            />

            {/* End Time input */}
            <SingleTimeInput
              label="End Time (Optional)"
              value24={endTime}
              required={false}
              hasError={Boolean(error && error.includes('End time'))}
              defaultAmPm={startTime ? (parseInt(startTime.split(':')[0], 10) >= 12 ? 'PM' : 'AM') : 'PM'}
              placeholder="e.g. 12:00"
              onChange={(newEnd) => onEndTimeChange(newEnd)}
            />
          </div>

          {/* Quick duration presets and formatted preview */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            {startTime && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-stone-600 font-medium">Quick End Time:</span>
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
                {endTime && (
                  <button
                    type="button"
                    onClick={() => onEndTimeChange('')}
                    className="px-1.5 py-0.5 text-[11px] text-stone-600 hover:text-stone-800 underline transition-colors"
                  >
                    Clear end
                  </button>
                )}
              </div>
            )}

            {previewText && (
              <div className="inline-flex items-center gap-1.5 text-xs text-stone-600 ml-auto bg-stone-50 px-2 py-1 rounded-md border border-stone-200/80">
                <Clock className="w-3.5 h-3.5 text-stone-500" />
                <span>Displays as: <strong className="text-stone-900 font-semibold">{previewText}</strong></span>
              </div>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-rose-600 text-xs mt-1">{error}</p>}
    </div>
  );
};
