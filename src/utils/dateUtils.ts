export function formatDateLong(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatMonthAndDay(dateStr: string): { month: string; day: string; weekday: string } {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      const dayNum = parseInt(parts[2], 10);
      const d = new Date(year, monthIdx, dayNum);
      return {
        month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
        day: String(dayNum),
        weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
      };
    }
    const d = new Date(dateStr);
    return {
      month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      day: String(d.getDate()),
      weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
    };
  } catch {
    return { month: 'DATE', day: '—', weekday: '' };
  }
}

export function formatRelativeTime(isoString: string): string {
  try {
    const past = new Date(isoString).getTime();
    const now = Date.now();
    const diffSec = Math.floor((now - past) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays}d ago`;
    return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

// ==========================================
// Structured Time Processing & Conversion
// ==========================================

export function formatTime24to12(time24: string): string {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10) || 0;
  if (isNaN(h)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m < 10 ? `0${m}` : String(m);
  return `${displayH}:${displayM} ${ampm}`;
}

export function parseSingleTimeTo24(raw: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim().toLowerCase();
  
  // Matches "6:30 pm", "6:30pm", "6 pm", "6pm", "18:30"
  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return undefined;

  let h = parseInt(match[1], 10);
  const m = match[2] ? parseInt(match[2], 10) : 0;
  const ampm = match[3]?.toLowerCase();

  if (ampm === 'pm' && h < 12) h += 12;
  if (ampm === 'am' && h === 12) h = 0;

  if (h < 0 || h > 23 || m < 0 || m > 59) return undefined;
  const hPad = h < 10 ? `0${h}` : String(h);
  const mPad = m < 10 ? `0${m}` : String(m);
  return `${hPad}:${mPad}`;
}

export function parseTimeTo24(timeStr?: string): { startTime?: string; endTime?: string; isAllDay: boolean } {
  if (!timeStr) return { isAllDay: false };
  const s = timeStr.trim();
  if (s.toLowerCase().includes('all day')) {
    return { isAllDay: true };
  }

  // Split on dash or word "to"
  const splitTokens = s.split(/\s*(?:–|-|—|\bto\b|\buntil\b)\s*/i);
  if (splitTokens.length >= 2) {
    let startPart = splitTokens[0].trim();
    let endPart = splitTokens[1].trim();

    // If end has am/pm and start doesn't, inherit am/pm
    const endAmPm = endPart.match(/(am|pm)$/i)?.[1];
    if (endAmPm && !startPart.match(/(am|pm)$/i)) {
      startPart += ` ${endAmPm}`;
    }

    const startTime = parseSingleTimeTo24(startPart);
    const endTime = parseSingleTimeTo24(endPart);
    return { startTime, endTime, isAllDay: false };
  }

  const single = parseSingleTimeTo24(s);
  return { startTime: single, isAllDay: false };
}

export function buildFormattedTimeString(startTime?: string, endTime?: string, isAllDay?: boolean): string {
  if (isAllDay) return 'All Day';
  if (!startTime) return '';
  const formattedStart = formatTime24to12(startTime);
  if (endTime && endTime !== startTime) {
    const formattedEnd = formatTime24to12(endTime);
    return `${formattedStart} – ${formattedEnd}`;
  }
  return formattedStart;
}

// Calculate exact start and end strings for calendar exports (Google Calendar & iCal)
export function getCalendarDateTimes(event: {
  date: string;
  time: string;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
}): { isAllDay: boolean; startCompact: string; endCompact: string } {
  const isAllDay = event.isAllDay === true || event.time.toLowerCase().includes('all day');
  const dateClean = event.date.replace(/-/g, '');

  if (isAllDay) {
    // Next day for exclusive end in all-day events
    let nextDateClean = dateClean;
    try {
      const [y, m, d] = event.date.split('-').map(Number);
      const nextDate = new Date(y, m - 1, d + 1);
      const ny = nextDate.getFullYear();
      const nm = String(nextDate.getMonth() + 1).padStart(2, '0');
      const nd = String(nextDate.getDate()).padStart(2, '0');
      nextDateClean = `${ny}${nm}${nd}`;
    } catch {
      nextDateClean = dateClean;
    }
    return {
      isAllDay: true,
      startCompact: dateClean,
      endCompact: nextDateClean,
    };
  }

  let st = event.startTime;
  let et = event.endTime;

  if (!st) {
    const parsed = parseTimeTo24(event.time);
    st = parsed.startTime;
    if (!et) et = parsed.endTime;
  }

  // Fallback defaults
  if (!st) st = '10:00';
  if (!et) {
    const [h, m] = st.split(':').map(Number);
    const endH = (h + 1) % 24;
    et = `${String(endH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
  }

  const startCompact = `${dateClean}T${st.replace(':', '')}00`;
  const endCompact = `${dateClean}T${et.replace(':', '')}00`;

  return {
    isAllDay: false,
    startCompact,
    endCompact,
  };
}

export function generateGoogleCalendarUrl(event: {
  title: string;
  date: string;
  time: string;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  location: string;
  description: string;
}): string {
  const title = encodeURIComponent(event.title);
  const location = encodeURIComponent(event.location);
  const details = encodeURIComponent(`${event.description}\n\nTime: ${event.time}`);
  
  const { startCompact, endCompact } = getCalendarDateTimes(event);
  const dates = `${startCompact}/${endCompact}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
}

export function generateIcsFileContent(event: {
  title: string;
  date: string;
  time: string;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  location: string;
  description: string;
}): string {
  const { isAllDay, startCompact, endCompact } = getCalendarDateTimes(event);
  const timeBlock = isAllDay
    ? `DTSTART;VALUE=DATE:${startCompact}\r\nDTEND;VALUE=DATE:${endCompact}`
    : `DTSTART:${startCompact}\r\nDTEND:${endCompact}`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Community Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `SUMMARY:${event.title.replace(/\n/g, ' ')}`,
    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}\\nTime: ${event.time}`,
    `LOCATION:${event.location.replace(/\n/g, ' ')}`,
    timeBlock,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadIcsFile(event: {
  id: string;
  title: string;
  date: string;
  time: string;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  location: string;
  description: string;
}) {
  const content = generateIcsFileContent(event);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${event.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
