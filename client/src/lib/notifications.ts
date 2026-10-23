// Daily practice reminder as a local notification scheduled on the phone itself.
// Only available in the Android app; browsers fall back to a calendar file (lib/reminder.ts).
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const REMINDER_ID = 1;

export const canNotify = Capacitor.isNativePlatform();

export type ReminderStatus = 'on' | 'off' | 'denied';

export async function reminderStatus(): Promise<ReminderStatus> {
  const { notifications } = await LocalNotifications.getPending();
  return notifications.some((n) => n.id === REMINDER_ID) ? 'on' : 'off';
}

/** Schedules the daily reminder at HH:MM, replacing any earlier one. Pass null to turn it off. */
export async function setDailyReminder(hhmm: string | null): Promise<ReminderStatus> {
  await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });
  if (!hhmm) return 'off';

  let { display } = await LocalNotifications.checkPermissions();
  if (display !== 'granted') ({ display } = await LocalNotifications.requestPermissions());
  if (display !== 'granted') return 'denied';

  const [hour, minute] = hhmm.split(':').map(Number);
  await LocalNotifications.schedule({
    notifications: [
      {
        id: REMINDER_ID,
        title: 'Time for your hand exercises',
        body: 'Your GripWise routine takes about ten minutes.',
        schedule: { on: { hour, minute }, allowWhileIdle: true },
      },
    ],
  });
  return 'on';
}
