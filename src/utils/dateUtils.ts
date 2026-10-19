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

export function generateGoogleCalendarUrl(event: {
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
}): string {
  const title = encodeURIComponent(event.title);
  const location = encodeURIComponent(event.location);
  const details = encodeURIComponent(`${event.description}\n\nTime: ${event.time}`);
  
  // Format start and end date
  // e.g. date: 2026-10-24
  const dateCompact = event.date.replace(/-/g, '');
  const dates = `${dateCompact}/${dateCompact}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
}

export function generateIcsFileContent(event: {
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
}): string {
  const dateCompact = event.date.replace(/-/g, '');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Community Event Calendar//EN',
    'BEGIN:VEVENT',
    `SUMMARY:${event.title.replace(/\n/g, ' ')}`,
    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}\\nTime: ${event.time}`,
    `LOCATION:${event.location.replace(/\n/g, ' ')}`,
    `DTSTART;VALUE=DATE:${dateCompact}`,
    `DTEND;VALUE=DATE:${dateCompact}`,
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
