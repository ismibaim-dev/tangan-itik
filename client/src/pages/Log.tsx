import { Minus, Moon, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useDeleteSymptomLog, useLogSymptoms, useSymptomLogs } from '../api/hooks';
import { PainScale } from '../components/PainScale';
import { useToast } from '../components/Toast';
import { Button, Card, ErrorState, Field, FormError, Input, PageHeader, SectionTitle, Spinner, Textarea } from '../components/ui';
import { formatRelativeDay } from '../lib/dates';

export function LogPage() {
  const log = useLogSymptoms();
  const toast = useToast();
  const [pain, setPain] = useState<number | null>(null);
  const [numbness, setNumbness] = useState<number | null>(null);
  const [tingling, setTingling] = useState<number | null>(null);
  const [nightWaking, setNightWaking] = useState(0);
  const [grip, setGrip] = useState('');
  const [notes, setNotes] = useState('');

  const ready = pain !== null && numbness !== null && tingling !== null;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready) return;
    log.mutate(
      {
        pain,
        numbness,
        tingling,
        nightWaking,
        gripStrengthKg: grip === '' ? null : Number(grip),
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast('Symptoms logged');
          setPain(null);
          setNumbness(null);
          setTingling(null);
          setNightWaking(0);
          setGrip('');
          setNotes('');
        },
      },
    );
  }

  return (
    <div>
      <PageHeader title="How's your hand today?" subtitle="Rate each symptom from 0 (none) to 10 (worst)." />
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 px-5">
        <Card className="grid gap-6">
          <PainScale label="Pain" value={pain} onChange={setPain} />
          <PainScale label="Numbness" value={numbness} onChange={setNumbness} />
          <PainScale label="Tingling (pins and needles)" value={tingling} onChange={setTingling} />
        </Card>

        <Card className="flex items-center gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700">
            <Moon className="size-5" aria-hidden />
          </span>
          <div className="flex-1">
            <p className="font-semibold" id="night-label">Woken by symptoms</p>
            <p className="text-sm text-ink-soft">Times last night</p>
          </div>
          <div className="flex items-center gap-2" role="group" aria-labelledby="night-label">
            <button
              type="button"
              aria-label="Fewer"
              onClick={() => setNightWaking(Math.max(0, nightWaking - 1))}
              className="grid size-10 place-items-center rounded-full bg-sand-100 hover:bg-sand-200"
            >
              <Minus className="size-4" />
            </button>
            <output className="w-7 text-center text-xl font-extrabold tabular-nums" aria-live="polite">
              {nightWaking}
            </output>
            <button
              type="button"
              aria-label="More"
              onClick={() => setNightWaking(Math.min(10, nightWaking + 1))}
              className="grid size-10 place-items-center rounded-full bg-sand-100 hover:bg-sand-200"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </Card>

        <Field label="Grip strength in kg (optional)" hint="Only if you have a hand dynamometer. Use the same hand and position each time.">
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={0.1}
            value={grip}
            onChange={(e) => setGrip(e.target.value)}
            placeholder="e.g. 18.5"
          />
        </Field>
        <Field label="Notes (optional)">
          <Textarea
            value={notes}
            maxLength={1000}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Long day at the keyboard? Wore a night splint?"
          />
        </Field>

        <FormError error={log.error} />
        <Button type="submit" size="lg" block disabled={!ready} loading={log.isPending}>
          Save log
        </Button>
      </form>

      <section className="mt-9 px-5">
        <SectionTitle>Recent logs</SectionTitle>
        <RecentLogs />
      </section>
    </div>
  );
}

function RecentLogs() {
  const { data, error, isPending, refetch } = useSymptomLogs(10);
  const remove = useDeleteSymptomLog();
  if (isPending) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (data.length === 0) {
    return <p className="rounded-3xl bg-white p-5 text-sm text-ink-soft shadow-card">Your logs will appear here.</p>;
  }
  return (
    <ul className="grid grid-cols-1 gap-3">
      {data.map((entry) => (
        <li key={entry.id} className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-card">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">
              {formatRelativeDay(entry.localDate)}
              <span className="font-medium text-ink-faint">
                {' · '}
                {new Date(entry.loggedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </span>
            </p>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-soft">
              <span>Pain <strong className="text-ink">{entry.pain}</strong></span>
              <span>Numb <strong className="text-ink">{entry.numbness}</strong></span>
              <span>Tingle <strong className="text-ink">{entry.tingling}</strong></span>
              {entry.nightWaking > 0 && <span>Woke <strong className="text-ink">{entry.nightWaking}×</strong></span>}
              {entry.gripStrengthKg !== null && <span>Grip <strong className="text-ink">{entry.gripStrengthKg} kg</strong></span>}
            </p>
            {entry.notes && <p className="mt-1 truncate text-sm text-ink-faint">{entry.notes}</p>}
          </div>
          <button
            type="button"
            onClick={() => remove.mutate(entry.id)}
            disabled={remove.isPending}
            aria-label={`Delete log from ${formatRelativeDay(entry.localDate)}`}
            className="grid size-10 shrink-0 place-items-center rounded-full text-ink-faint hover:bg-coral-50 hover:text-coral-600"
          >
            <Trash2 className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
