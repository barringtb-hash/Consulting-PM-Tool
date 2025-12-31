/**
 * Calendar Utilities
 * Helper functions for generating calendar event links and ICS files
 */

interface CalendarEventParams {
  title: string;
  startTime: string; // ISO date string
  durationMinutes: number;
  description?: string;
  location?: string;
}

interface CalendarLinks {
  google: string;
  outlook: string;
  ics: string;
}

/**
 * Generate calendar links for adding events to various calendars
 */
export function generateCalendarLinks(
  params: CalendarEventParams,
): CalendarLinks {
  const {
    title,
    startTime,
    durationMinutes,
    description = '',
    location = '',
  } = params;

  const startDate = new Date(startTime);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  // Format dates for Google Calendar (YYYYMMDDTHHmmssZ format)
  const formatGoogleDate = (date: Date): string => {
    return date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  };

  // Format dates for Outlook (ISO format)
  const formatOutlookDate = (date: Date): string => {
    return date.toISOString();
  };

  // Google Calendar
  const googleParams = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
    details: description,
    location: location,
  });

  const googleLink = `https://calendar.google.com/calendar/render?${googleParams.toString()}`;

  // Outlook Web Calendar
  const outlookParams = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    startdt: formatOutlookDate(startDate),
    enddt: formatOutlookDate(endDate),
    subject: title,
    body: description,
    location: location,
  });

  const outlookLink = `https://outlook.live.com/calendar/0/deeplink/compose?${outlookParams.toString()}`;

  // ICS file data URL
  const icsContent = generateICSContent(params);
  const icsLink = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;

  return {
    google: googleLink,
    outlook: outlookLink,
    ics: icsLink,
  };
}

/**
 * Generate ICS file content
 */
function generateICSContent(params: CalendarEventParams): string {
  const {
    title,
    startTime,
    durationMinutes,
    description = '',
    location = '',
  } = params;

  const startDate = new Date(startTime);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  // Format date for ICS (YYYYMMDDTHHmmssZ)
  const formatICSDate = (date: Date): string => {
    return date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  };

  // Generate a unique ID for the event
  const uid = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}@scheduling`;

  // Escape special characters in ICS (RFC 5545 compliant)
  const escapeICS = (str: string): string => {
    return str
      .replace(/[\\;,]/g, '\\$&')
      .replace(/\r\n/g, '\\n')
      .replace(/\r/g, '\\n')
      .replace(/\n/g, '\\n');
  };

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AI Scheduling//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${escapeICS(title)}`,
  ];

  if (description) {
    lines.push(`DESCRIPTION:${escapeICS(description)}`);
  }

  if (location) {
    lines.push(`LOCATION:${escapeICS(location)}`);
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.join('\r\n');
}

/**
 * Download an ICS file for the event
 */
export function downloadICSFile(params: CalendarEventParams): void {
  const icsContent = generateICSContent(params);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${params.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Format a date for display
 */
export function formatEventDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a time for display
 */
export function formatEventTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get relative time (e.g., "in 2 days", "tomorrow", "yesterday", "2 days ago")
 */
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Handle past dates
  if (diffMs < 0) {
    const absDiffHours = Math.abs(diffHours);
    const absDiffDays = Math.abs(diffDays);

    if (absDiffDays === 0) {
      if (absDiffHours <= 1) {
        return 'just now';
      } else {
        return `${absDiffHours} hours ago`;
      }
    } else if (absDiffDays === 1) {
      return 'yesterday';
    } else if (absDiffDays <= 7) {
      return `${absDiffDays} days ago`;
    } else {
      return formatEventDate(dateString);
    }
  }

  // Handle future dates
  if (diffDays === 0) {
    if (diffHours <= 0) {
      return 'now';
    } else if (diffHours === 1) {
      return 'in 1 hour';
    } else {
      return `in ${diffHours} hours`;
    }
  } else if (diffDays === 1) {
    return 'tomorrow';
  } else if (diffDays > 1 && diffDays <= 7) {
    return `in ${diffDays} days`;
  } else {
    return formatEventDate(dateString);
  }
}
