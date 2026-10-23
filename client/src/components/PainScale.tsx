import clsx from 'clsx';

export function painTone(value: number): { label: string; dot: string; text: string } {
  if (value === 0) return { label: 'None', dot: 'bg-brand-400', text: 'text-brand-700' };
  if (value <= 3) return { label: 'Mild', dot: 'bg-brand-400', text: 'text-brand-700' };
  if (value <= 6) return { label: 'Moderate', dot: 'bg-amber-400', text: 'text-amber-700' };
  if (value <= 8) return { label: 'Severe', dot: 'bg-coral-500', text: 'text-coral-600' };
  return { label: 'Very severe', dot: 'bg-coral-600', text: 'text-coral-700' };
}

const selectedStyle = (n: number) =>
  n <= 3 ? 'bg-brand-600 text-white' : n <= 6 ? 'bg-amber-400 text-ink' : 'bg-coral-600 text-white';

/** 0–10 rating as a row of tappable numbers: easier to hit than a slider on a sore hand. */
export function PainScale({
  label,
  value,
  onChange,
  lowLabel = 'None',
  highLabel = 'Worst',
}: {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  lowLabel?: string;
  highLabel?: string;
}) {
  return (
    <fieldset>
      <legend className="flex w-full items-baseline justify-between gap-2">
        <span className="font-semibold">{label}</span>
        {value !== null && (
          <span className={clsx('text-sm font-semibold', painTone(value).text)}>
            {value}/10 · {painTone(value).label}
          </span>
        )}
      </legend>
      <div className="mt-3 grid grid-cols-11 gap-1" role="radiogroup" aria-label={label}>
        {Array.from({ length: 11 }, (_, n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} out of 10`}
            onClick={() => onChange(n)}
            className={clsx(
              'aspect-square min-h-8 rounded-xl text-sm font-bold tabular-nums transition',
              value === n ? clsx(selectedStyle(n), 'scale-110 shadow-lift') : 'bg-sand-100 text-ink-soft hover:bg-sand-200',
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-ink-faint">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </fieldset>
  );
}
