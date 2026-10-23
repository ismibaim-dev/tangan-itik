import clsx from 'clsx';
import { CalendarPlus, LogOut, ShieldCheck, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
  useChangePhase,
  useDeleteAccount,
  useLogout,
  useSignedInAccount,
  useUpdateProfile,
  type ProfileUpdate,
} from '../api/hooks';
import type { Hand, Phase, SymptomDuration } from '../api/types';
import { useToast } from '../components/Toast';
import { Button, Card, Field, FormError, Input, PageHeader, SectionTitle, Segmented } from '../components/ui';
import { phaseNames } from '../lib/exercise-meta';
import { downloadReminder } from '../lib/reminder';

const GOAL_OPTIONS = [
  'Sleep through the night',
  'Type without pain',
  'Stronger grip',
  'Get back to a hobby or sport',
  'Avoid or delay surgery',
];

export function ProfilePage() {
  const { user, profile } = useSignedInAccount();
  const logout = useLogout();

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
            <p className="truncate text-sm text-ink-soft">{user.email}</p>
            <p className="text-xs text-ink-faint">
              Member since {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </Card>

        <ProgrammeCard phase={profile.phase} />
        <DetailsForm />

        <Card>
          <SectionTitle>Daily reminder</SectionTitle>
          <p className="text-sm text-ink-soft">
            {profile.reminderTime
              ? `Add a repeating ${formatTime(profile.reminderTime)} reminder to your phone's calendar so you never miss a session.`
              : 'Set a practice time above, then add it to your calendar.'}
          </p>
          <Button
            variant="secondary"
            block
            className="mt-4"
            disabled={!profile.reminderTime}
            onClick={() => profile.reminderTime && downloadReminder(profile.reminderTime)}
          >
            <CalendarPlus className="size-4" aria-hidden /> Add to calendar
          </Button>
        </Card>

        <section className="flex gap-3 rounded-3xl bg-sand-50 p-5 text-sm text-ink-soft ring-1 ring-sand-200">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden />
          <p>
            GripWise offers general rehabilitation exercises and tracking. It does not diagnose or treat any condition.
            Always follow the advice of your doctor, surgeon or hand therapist.
          </p>
        </section>

        <Button variant="secondary" block loading={logout.isPending} onClick={() => logout.mutate()}>
          <LogOut className="size-4" aria-hidden /> Sign out
        </Button>
        <DeleteAccount />
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
  const { user, profile } = useSignedInAccount();
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
    update.mutate(body, { onSuccess: () => toast('Profile saved') });
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

function DeleteAccount() {
  const remove = useDeleteAccount();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-auto mb-4 flex items-center gap-2 py-2 text-sm font-semibold text-coral-600 hover:underline"
      >
        <Trash2 className="size-4" aria-hidden /> Delete my account and data
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        remove.mutate(password);
      }}
      className="mb-4 grid gap-3 rounded-3xl bg-coral-50 p-5 ring-1 ring-coral-100"
    >
      <p className="font-bold text-coral-700">Delete account</p>
      <p className="text-sm text-ink-soft">
        This permanently removes your profile, sessions, symptom logs and weekly checks. It can't be undone.
      </p>
      <Field label="Confirm with your password">
        <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <FormError error={remove.error} />
      <div className="flex gap-2">
        <Button type="submit" variant="danger" loading={remove.isPending}>
          Delete permanently
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
