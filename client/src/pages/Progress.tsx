import clsx from 'clsx';
import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useProgressReport, useSessions } from '../api/hooks';
import type { ProgressReport } from '../api/types';
import { chartColors, Columns, DataTable, TrendLine, type Point } from '../components/charts';
import { Card, ErrorState, PageHeader, Segmented, SectionTitle, Spinner } from '../components/ui';
import { formatDay, formatDuration, formatRelativeDay, parseLocalDate } from '../lib/dates';

const dayMs = (date: string) => parseLocalDate(date).getTime();

export function ProgressPage() {
  const [days, setDays] = useState(30);
  const { data, error, isPending, isFetching, refetch } = useProgressReport(days);

  return (
    <div>
      <PageHeader title="Progress" subtitle="How your hand is responding, in numbers." />
      <div className="px-5 pb-5">
        <Segmented
          label="Date range"
          value={days}
          onChange={setDays}
          options={[
            { value: 30, label: 'Last 30 days' },
            { value: 90, label: 'Last 90 days' },
          ]}
        />
      </div>
      {isPending && <Spinner />}
      {error && <ErrorState error={error} onRetry={() => refetch()} />}
      {data && (
        // Keep the previous render, dimmed, while a new range loads.
        <div className={clsx('grid grid-cols-1 gap-5 px-5 transition-opacity', isFetching && 'opacity-60')}>
          <Totals totals={data.totals} />
          <SymptomTrends report={data} />
          <Activity report={data} />
          <WeeklyScores report={data} />
          <GripStrength report={data} />
          <RecentSessions />
        </div>
      )}
    </div>
  );
}

function Totals({ totals }: { totals: ProgressReport['totals'] }) {
  const change = totals.avgPainChange;
  const tiles = [
    { label: 'Sessions', value: totals.sessions },
    { label: 'Active days', value: totals.activeDays },
    { label: 'Minutes', value: totals.minutes },
    { label: 'Current streak', value: `${totals.currentStreak}d` },
    { label: 'Best streak', value: `${totals.longestStreak}d` },
  ];
  return (
    <section aria-label="Totals" className="grid grid-cols-3 gap-3">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-3xl bg-white p-4 shadow-card">
          <p className="text-xs font-semibold text-ink-soft">{t.label}</p>
          <p className="mt-1 text-2xl font-extrabold">{t.value}</p>
        </div>
      ))}
      <div className="rounded-3xl bg-white p-4 shadow-card">
        <p className="text-xs font-semibold text-ink-soft">Pain per session</p>
        <p className="mt-1 flex items-center gap-1 text-2xl font-extrabold">
          {change === null ? (
            '–'
          ) : (
            <>
              {change < 0 ? (
                <ArrowDownRight className="size-5 text-brand-600" aria-label="Down" />
              ) : change > 0 ? (
                <ArrowUpRight className="size-5 text-coral-600" aria-label="Up" />
              ) : (
                <Minus className="size-5 text-ink-faint" aria-label="No change" />
              )}
              {Math.abs(change)}
            </>
          )}
        </p>
      </div>
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-sand-50 p-4 text-sm text-ink-soft ring-1 ring-sand-200">{children}</p>;
}

function SymptomTrends({ report }: { report: ProgressReport }) {
  const domain: [number, number] = [dayMs(report.from), dayMs(report.to)];
  const series = [
    { key: 'pain', label: 'Pain' },
    { key: 'numbness', label: 'Numbness' },
    { key: 'tingling', label: 'Tingling' },
  ] as const;

  return (
    <Card>
      <SectionTitle>Symptoms</SectionTitle>
      {report.symptoms.length === 0 ? (
        <Empty>
          No symptom logs in this period.{' '}
          <Link to="/log" className="font-semibold text-brand-700">
            Log how you feel
          </Link>{' '}
          to see trends.
        </Empty>
      ) : (
        <>
          <p className="-mt-2 mb-4 text-sm text-ink-soft">Daily average, 0 (none) to 10 (worst). Lower is better.</p>
          {/* Small multiples on a shared 0–10 scale: each symptom gets its own panel instead of three tangled lines. */}
          <div className="grid gap-5">
            {series.map(({ key, label }) => {
              const points: Point[] = report.symptoms.map((s) => ({
                x: dayMs(s.date),
                y: s[key],
                label: formatDay(s.date, { weekday: 'short', day: 'numeric', month: 'short' }),
              }));
              const first = points[0]!.y!;
              const last = points.at(-1)!.y!;
              return (
                <div key={key}>
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-sm font-bold">{label}</h3>
                    <p className="text-sm text-ink-soft">
                      Latest <strong className="text-base text-ink">{last}</strong>
                      {points.length > 1 && last !== first && (
                        <span className="ml-1.5">
                          ({last < first ? '↓' : '↑'} {Math.abs(Math.round((last - first) * 10) / 10)} since{' '}
                          {formatDay(report.symptoms[0]!.date)})
                        </span>
                      )}
                    </p>
                  </div>
                  <TrendLine data={points} domain={domain} yDomain={[0, 10]} yTicks={[0, 5, 10]} height={110} />
                </div>
              );
            })}
          </div>
          <DataTable
            columns={['Date', 'Pain', 'Numbness', 'Tingling', 'Woken']}
            rows={report.symptoms.map((s) => [formatDay(s.date), s.pain, s.numbness, s.tingling, s.nightWaking])}
          />
        </>
      )}
    </Card>
  );
}

function Activity({ report }: { report: ProgressReport }) {
  const weekly = report.days > 31;
  const bars = weekly ? groupByWeek(report.activity) : report.activity.map((a) => ({
    key: a.date,
    label: `${formatDay(a.date, { weekday: 'short', day: 'numeric', month: 'short' })}`,
    tick: formatDay(a.date),
    value: a.sessions,
  }));

  return (
    <Card>
      <SectionTitle>Sessions {weekly ? 'per week' : 'per day'}</SectionTitle>
      {report.totals.sessions === 0 ? (
        <Empty>No sessions yet in this period. Your first one takes about ten minutes.</Empty>
      ) : (
        <>
          <Columns data={bars} format={(v) => `${v} ${v === 1 ? 'session' : 'sessions'}`} />
          <DataTable columns={[weekly ? 'Week of' : 'Date', 'Sessions']} rows={bars.filter((b) => b.value > 0).map((b) => [b.tick, b.value])} />
        </>
      )}
    </Card>
  );
}

function groupByWeek(activity: ProgressReport['activity']) {
  // Seven-day buckets counted back from today, so the latest bar is always a full week.
  const weeks: { key: string; label: string; tick: string; value: number }[] = [];
  for (let end = activity.length; end > 0; end -= 7) {
    const slice = activity.slice(Math.max(0, end - 7), end);
    const start = slice[0]!.date;
    weeks.unshift({
      key: start,
      label: `Week of ${formatDay(start)}`,
      tick: formatDay(start),
      value: slice.reduce((sum, d) => sum + d.sessions, 0),
    });
  }
  return weeks;
}

function WeeklyScores({ report }: { report: ProgressReport }) {
  const domain: [number, number] = [dayMs(report.from), dayMs(report.to)];
  const points: Point[] = report.assessments.map((a) => ({
    x: dayMs(a.date),
    y: a.score,
    label: `${formatDay(a.date)} · ${a.band}`,
  }));
  return (
    <Card>
      <SectionTitle
        action={
          <Link to="/check" className="flex items-center text-sm font-semibold text-brand-700">
            Take check <ChevronRight className="size-4" aria-hidden />
          </Link>
        }
      >
        Weekly symptom score
      </SectionTitle>
      {points.length === 0 ? (
        <Empty>Take the weekly check to track overall symptom severity.</Empty>
      ) : (
        <>
          <p className="-mt-2 mb-3 text-sm text-ink-soft">1 means no symptoms, 5 the most severe. Lower is better.</p>
          <TrendLine
            data={points}
            domain={domain}
            yDomain={[1, 5]}
            yTicks={[1, 2, 3, 4, 5]}
            color={chartColors.violet}
            format={(v) => v.toFixed(2)}
          />
          <DataTable
            columns={['Date', 'Score', 'Severity']}
            rows={report.assessments.map((a) => [formatDay(a.date), a.score.toFixed(2), a.band])}
          />
        </>
      )}
    </Card>
  );
}

function GripStrength({ report }: { report: ProgressReport }) {
  const readings = report.symptoms.filter((s) => s.gripStrengthKg !== null);
  if (readings.length === 0) return null;
  const values = readings.map((s) => s.gripStrengthKg!);
  const points: Point[] = readings.map((s) => ({
    x: dayMs(s.date),
    y: s.gripStrengthKg,
    label: formatDay(s.date, { weekday: 'short', day: 'numeric', month: 'short' }),
  }));
  const min = Math.max(0, Math.floor(Math.min(...values) - 2));
  const max = Math.ceil(Math.max(...values) + 2);
  return (
    <Card>
      <SectionTitle>Grip strength</SectionTitle>
      <p className="-mt-2 mb-3 text-sm text-ink-soft">
        Latest <strong className="text-ink">{values.at(-1)} kg</strong>. Higher is better.
      </p>
      <TrendLine
        data={points}
        domain={[dayMs(report.from), dayMs(report.to)]}
        yDomain={[min, max]}
        format={(v) => `${v} kg`}
      />
      <DataTable columns={['Date', 'Grip (kg)']} rows={readings.map((s) => [formatDay(s.date), s.gripStrengthKg!])} />
    </Card>
  );
}

function RecentSessions() {
  const { data } = useSessions(5);
  if (!data || data.length === 0) return null;
  return (
    <section>
      <SectionTitle>Recent sessions</SectionTitle>
      <ul className="grid grid-cols-1 gap-3">
        {data.map((s) => (
          <li key={s.id} className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-card">
            <div className="min-w-0 flex-1">
              <p className="font-bold">{formatRelativeDay(s.localDate)}</p>
              <p className="text-sm text-ink-soft">
                Phase {s.phase} · {s.completedCount}/{s.exerciseCount} exercises · {formatDuration(s.durationSeconds)}
                {s.flareMode && ' · gentle'}
              </p>
            </div>
            <p className="text-right text-sm text-ink-soft">
              Pain
              <span className="block font-bold text-ink tabular-nums">
                {s.painBefore} → {s.painAfter}
              </span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
