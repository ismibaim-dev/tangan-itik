// Builds a repeating calendar event (.ics) so reminders work through the phone's own calendar,
// with no push-notification server needed.

const pad = (n: number) => String(n).padStart(2, '0');

/** Floating local time (no timezone), so the calendar fires at this time wherever the user is. */
const icsLocal = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

export function reminderCalendar(hhmm: string, now = new Date()): string {
  const [hours, minutes] = hhmm.split(':').map(Number);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
  if (start <= now) start.setDate(start.getDate() + 1);
  const end = new Date(start.getTime() + 10 * 60_000);
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GripWise//Daily reminder//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:gripwise-daily-${stamp}@gripwise.app`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${icsLocal(start)}`,
    `DTEND:${icsLocal(end)}`,
    'RRULE:FREQ=DAILY',
    'SUMMARY:GripWise hand exercises',
    'DESCRIPTION:Time for your GripWise routine. Ten gentle minutes for your hands.',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:GripWise hand exercises',
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

export function downloadReminder(hhmm: string) {
  const url = URL.createObjectURL(new Blob([reminderCalendar(hhmm)], { type: 'text/calendar' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'gripwise-reminder.ics';
  link.click();
  URL.revokeObjectURL(url);
}
