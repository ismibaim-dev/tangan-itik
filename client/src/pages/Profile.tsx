import clsx from 'clsx';
import { Bell, BellOff, CalendarPlus, FileSpreadsheet, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useChangePhase, useEraseAllData, useRequiredAccount, useUpdateProfile } from '../data/hooks';
import type { ProfileUpdate } from '../data/repository';
import { store } from '../data/store';
import type { Hand, Phase, SymptomDuration } from '../data/types';
import { useToast } from '../components/Toast';
import { Button, Card, Field, FormError, Input, PageHeader, SectionTitle, Segmented } from '../components/ui';
import { localDate } from '../lib/dates';
import { phaseNames } from '../lib/exercise-meta';
import { deliverCsvFiles } from '../lib/export';
import { canNotify, reminderStatus, setDailyReminder, type ReminderStatus } from '../lib/notifications';
import { downloadReminder } from '../lib/reminder';

const GOAL_OPTIONS = [
  'Sleep through the night',
  'Type without pain',
  'Stronger grip',
  'Get back to a hobby or sport',
  'Avoid or delay surgery',
];

export function ProfilePage() {
  const { user, profile } = useRequiredAccount();

  return (
    <div>
      <PageHeader title="Profile" />
      <div className="grid grid-cols-1 gap-5 px-5">
        <Card className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-100 text-2xl font-extrabold text-brand-800">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">{user.name}</p>
            <p className="text-sm text-ink-soft">
              Using GripWise since{' '}
              {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </Card>

        <ProgrammeCard phase={profile.phase} />
        <DetailsForm />

        <ReminderCard reminderTime={profile.reminderTime} />
        <DataCard />

        <section className="flex gap-3 rounded-3xl bg-sand-50 p-5 text-sm text-ink-soft ring-1 ring-sand-200">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden />
          <p>
            GripWise offers general rehabilitation exercises and tracking. It does not diagnose or treat any condition.
            Always follow the advice of your doctor, surgeon or hand therapist.
          </p>
        </section>

        <EraseData />
        <p className="-mt-2 mb-4 text-center text-xs text-ink-faint">GripWise v{__APP_VERSION__}</p>
      </div>
    </div>
  );
}

function formatTime(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function ProgrammeCard({ phase }: { phase: Phase }) {
  const changePhase = useChangePhase();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const previous = (phase - 1) as Phase;

  return (
    <Card>
      <SectionTitle>Programme</SectionTitle>
      <ol className="grid grid-cols-3 gap-2" aria-label="Phases">
        {([1, 2, 3] as Phase[]).map((p) => (
          <li
            key={p}
            aria-current={p === phase ? 'step' : undefined}
            className={clsx(
              'rounded-2xl p-3 text-center',
              p === phase ? 'bg-brand-700 text-white' : p < phase ? 'bg-brand-50 text-brand-800' : 'bg-sand-100 text-ink-faint',
            )}
          >
            <span className="block text-xs font-bold uppercase">Phase {p}</span>
            <span className="mt-0.5 block text-xs leading-tight">{phaseNames[p]}</span>
          </li>
        ))}
      </ol>
      {phase > 1 && (
        <div className="mt-4 text-sm text-ink-soft">
          {confirming ? (
            <div className="rounded-2xl bg-sand-50 p-4 ring-1 ring-sand-200">
              <p>
                Going back to Phase {previous} restarts its session count. It's a sensible move if symptoms have flared
                up.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  loading={changePhase.isPending}
                  onClick={() =>
                    changePhase.mutate(previous, {
                      onSuccess: () => {
                        setConfirming(false);
                        toast(`Back to Phase ${previous}`);
                      },
                    })
                  }
                >
                  Go back to Phase {previous}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="font-semibold text-brand-700 hover:underline">
              Symptoms flaring? Step back to Phase {previous}
            </button>
          )}
          <FormError error={changePhase.error} />
        </div>
      )}
    </Card>
  );
}

function DetailsForm() {
  const { user, profile } = useRequiredAccount();
  const update = useUpdateProfile();
  const toast = useToast();
  const [form, setForm] = useState({
    name: user.name,
    affectedHand: profile.affectedHand,
    dominantHand: profile.dominantHand,
    symptomDuration: profile.symptomDuration,
    postSurgery: profile.postSurgery,
    goals: profile.goals,
    reminderTime: profile.reminderTime ?? '',
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  function submit(event: FormEvent) {
    event.preventDefault();
    const body: ProfileUpdate = { ...form, reminderTime: form.reminderTime || null };
    update.mutate(body, {
      onSuccess: async (account) => {
        toast('Profile saved');
        // Move an active reminder to the new practice time.
        const time = account.profile.reminderTime;
        if (canNotify && time !== profile.reminderTime && (await reminderStatus()) === 'on') await setDailyReminder(time);
      },
    });
  }

  return (
    <Card>
      <SectionTitle>Your details</SectionTitle>
      <form onSubmit={submit} className="grid gap-5">
        <Field label="First name">
          <Input required maxLength={80} value={form.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <div>
          <p className="mb-1.5 text-sm font-semibold">Affected hand</p>
          <Segmented<Hand>
            label="Affected hand"
            value={form.affectedHand}
            onChange={(v) => set('affectedHand', v)}
            options={[
              { value: 'left', label: 'Left' },
              { value: 'right', label: 'Right' },
              { value: 'both', label: 'Both' },
            ]}
          />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-semibold">Dominant hand</p>
          <Segmented<'left' | 'right'>
            label="Dominant hand"
            value={form.dominantHand}
            onChange={(v) => set('dominantHand', v)}
            options={[
              { value: 'left', label: 'Left' },
              { value: 'right', label: 'Right' },
            ]}
          />
        </div>
        <Field label="Symptoms for">
          <select
            value={form.symptomDuration ?? ''}
            onChange={(e) => set('symptomDuration', (e.target.value || null) as SymptomDuration | null)}
            className="h-12 w-full rounded-2xl border-0 bg-white px-4 text-[15px] shadow-card ring-1 ring-sand-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
          >
            <option value="">Prefer not to say</option>
            <option value="under_3_months">Less than 3 months</option>
            <option value="3_to_12_months">3 to 12 months</option>
            <option value="over_12_months">More than a year</option>
          </select>
        </Field>
        <label className="flex items-center justify-between gap-4">
          <span className="text-sm font-semibold">Had carpal tunnel release surgery</span>
          <input
            type="checkbox"
            checked={form.postSurgery}
            onChange={(e) => set('postSurgery', e.target.checked)}
            className="size-5 accent-brand-600"
          />
        </label>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Goals</legend>
          <div className="flex flex-wrap gap-2">
            {GOAL_OPTIONS.map((goal) => {
              const on = form.goals.includes(goal);
              return (
                <button
                  key={goal}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set('goals', on ? form.goals.filter((g) => g !== goal) : [...form.goals, goal])}
                  className={clsx(
                    'rounded-full px-3.5 py-2 text-sm font-semibold transition',
                    on ? 'bg-brand-700 text-white' : 'bg-sand-100 text-ink-soft hover:bg-sand-200',
                  )}
                >
                  {goal}
                </button>
              );
            })}
          </div>
        </fieldset>
        <Field label="Daily practice time">
          <Input type="time" value={form.reminderTime} onChange={(e) => set('reminderTime', e.target.value)} />
        </Field>
        <FormError error={update.error} />
        <Button type="submit" block loading={update.isPending}>
          Save changes
        </Button>
      </form>
    </Card>
  );
}

function ReminderCard({ reminderTime }: { reminderTime: string | null }) {
  const toast = useToast();
  const [status, setStatus] = useState<ReminderStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (canNotify) reminderStatus().then(setStatus, () => setStatus('off'));
  }, []);

  async function toggle() {
    setBusy(true);
    try {
      const next = await setDailyReminder(status === 'on' ? null : reminderTime);
      setStatus(next);
      if (next === 'on' && reminderTime) toast(`Reminder set for ${formatTime(reminderTime)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <SectionTitle>Daily reminder</SectionTitle>
      {!reminderTime ? (
        <p className="text-sm text-ink-soft">Set a daily practice time above to get a reminder.</p>
      ) : canNotify ? (
        <>
          <p className="text-sm text-ink-soft">
            {status === 'on'
              ? `You'll get a notification at ${formatTime(reminderTime)} every day.`
              : status === 'denied'
                ? 'Notifications are blocked for GripWise. Allow them in Android Settings > Apps > GripWise > Notifications.'
                : `Get a notification at ${formatTime(reminderTime)} every day.`}
          </p>
          <Button
            variant="secondary"
            block
            className="mt-4"
            loading={busy || status === null}
            onClick={toggle}
          >
            {status === 'on' ? (
              <>
                <BellOff className="size-4" aria-hidden /> Turn off reminder
              </>
            ) : (
              <>
                <Bell className="size-4" aria-hidden /> Remind me daily
              </>
            )}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-ink-soft">
            Add a repeating {formatTime(reminderTime)} reminder to your calendar so you never miss a session.
          </p>
          <Button variant="secondary" block className="mt-4" onClick={() => downloadReminder(reminderTime)}>
            <CalendarPlus className="size-4" aria-hidden /> Add to calendar
          </Button>
        </>
      )}
    </Card>
  );
}

function DataCard() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function exportData() {
    setBusy(true);
    setError(null);
    try {
      const files = await store.buildCsvExport(localDate());
      const result = await deliverCsvFiles(files);
      if (result !== 'cancelled') toast(`Exported ${files.length} CSV files`);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <SectionTitle>Your data</SectionTitle>
      <p className="flex gap-3 text-sm text-ink-soft">
        <Smartphone className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
        Everything is stored only on this phone. Uninstalling GripWise deletes it, so export a copy now and then.
      </p>
      <p className="mt-3 text-sm text-ink-soft">
        The export has one spreadsheet-ready CSV file each for your profile, sessions, exercises per session, symptom
        logs and weekly checks.
      </p>
      <FormError error={error} />
      <Button block className="mt-4" loading={busy} onClick={exportData}>
        <FileSpreadsheet className="size-4" aria-hidden /> Export all data (CSV)
      </Button>
    </Card>
  );
}

function EraseData() {
  const erase = useEraseAllData();
  const [open, setOpen] = useState(false);

  async function eraseEverything() {
    if (canNotify) await setDailyReminder(null).catch(() => undefined);
    erase.mutate();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-auto flex items-center gap-2 py-2 text-sm font-semibold text-coral-600 hover:underline"
      >
        <Trash2 className="size-4" aria-hidden /> Erase all data
      </button>
    );
  }

  return (
    <div className="grid gap-3 rounded-3xl bg-coral-50 p-5 ring-1 ring-coral-100" role="alertdialog" aria-labelledby="erase-title">
      <p id="erase-title" className="font-bold text-coral-700">
        Erase all data?
      </p>
      <p className="text-sm text-ink-soft">
        This deletes your profile, sessions, symptom logs and weekly checks from this phone. It can't be undone, so
        export your data first if you want a copy.
      </p>
      <FormError error={erase.error} />
      <div className="flex gap-2">
        <Button variant="danger" loading={erase.isPending} onClick={eraseEverything}>
          Erase everything
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
