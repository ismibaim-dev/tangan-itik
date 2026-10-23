import clsx from 'clsx';
import { ChevronLeft, LoaderCircle, TriangleAlert } from 'lucide-react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { Link, useNavigate } from 'react-router';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'light';

const buttonStyles: Record<ButtonVariant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900 disabled:bg-brand-700/40',
  secondary: 'bg-brand-50 text-brand-800 ring-1 ring-brand-200 hover:bg-brand-100 disabled:opacity-50',
  ghost: 'text-brand-700 hover:bg-brand-50 disabled:opacity-50',
  danger: 'bg-coral-600 text-white hover:bg-coral-700 disabled:opacity-50',
  light: 'bg-white text-brand-800 hover:bg-brand-50 disabled:opacity-60',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'md' | 'lg' | 'sm';
  loading?: boolean;
  block?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  block,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-colors disabled:cursor-not-allowed',
        size === 'lg' && 'h-14 px-6 text-base',
        size === 'md' && 'h-12 px-5 text-[15px]',
        size === 'sm' && 'h-9 rounded-xl px-3.5 text-sm',
        block && 'w-full',
        buttonStyles[variant],
        className,
      )}
      {...rest}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('rounded-3xl bg-white p-5 shadow-card', className)}>{children}</div>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-[17px] font-bold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string;
  subtitle?: string;
  back?: string | true;
  action?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <header className="flex items-start gap-3 px-5 pt-6 pb-4">
      {back &&
        (back === true ? (
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="-ml-1 grid size-10 shrink-0 place-items-center rounded-full bg-white shadow-card"
          >
            <ChevronLeft className="size-5" />
          </button>
        ) : (
          <Link
            to={back}
            aria-label="Go back"
            className="-ml-1 grid size-10 shrink-0 place-items-center rounded-full bg-white shadow-card"
          >
            <ChevronLeft className="size-5" />
          </Link>
        ))}
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl leading-tight font-extrabold tracking-tight text-balance">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function ProgressBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      className={clsx('h-2 overflow-hidden rounded-full bg-brand-100', className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <div className="h-full rounded-full bg-brand-500 transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="grid place-items-center py-16 text-brand-600" role="status">
      <LoaderCircle className="size-7 animate-spin" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="mx-5 my-6 rounded-3xl bg-coral-50 p-5 text-center ring-1 ring-coral-100">
      <TriangleAlert className="mx-auto size-6 text-coral-600" aria-hidden />
      <p className="mt-2 font-semibold">Couldn't load this</p>
      <p className="mt-1 text-sm text-ink-soft">{error instanceof Error ? error.message : 'Please try again.'}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function FormError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-2xl bg-coral-50 px-4 py-3 text-sm font-medium text-coral-700">
      {error instanceof Error ? error.message : 'Something went wrong'}
    </p>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-ink-faint">{hint}</span>}
    </label>
  );
}

const inputClass =
  'w-full rounded-2xl border-0 bg-white px-4 text-[15px] text-ink shadow-card ring-1 ring-sand-300 placeholder:text-ink-faint focus:ring-2 focus:ring-brand-500 focus:outline-none';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx(inputClass, 'h-12', props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={clsx(inputClass, 'py-3', props.className)} />;
}

/** A large tappable option, used for single and multiple choice questions. */
export function OptionCard({
  selected,
  onClick,
  title,
  description,
  icon,
  role = 'radio',
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  role?: 'radio' | 'checkbox';
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onClick}
      className={clsx(
        'flex w-full items-center gap-4 rounded-2xl p-4 text-left transition',
        selected ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white shadow-card ring-1 ring-sand-200 hover:ring-brand-200',
      )}
    >
      {icon && (
        <span
          className={clsx(
            'grid size-11 shrink-0 place-items-center rounded-xl',
            selected ? 'bg-brand-600 text-white' : 'bg-sand-100 text-brand-700',
          )}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        {description && <span className="mt-0.5 block text-sm text-ink-soft">{description}</span>}
      </span>
      <span
        aria-hidden
        className={clsx(
          'grid size-6 shrink-0 place-items-center border-2 transition',
          role === 'radio' ? 'rounded-full' : 'rounded-lg',
          selected ? 'border-brand-600 bg-brand-600' : 'border-sand-300',
        )}
      >
        {selected && <span className={clsx('bg-white', role === 'radio' ? 'size-2 rounded-full' : 'size-2.5 rounded-sm')} />}
      </span>
    </button>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-2xl bg-sand-100 p-1 ring-1 ring-sand-200">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={clsx(
            'rounded-xl px-4 py-1.5 text-sm font-semibold transition',
            value === option.value ? 'bg-white text-ink shadow-card' : 'text-ink-soft hover:text-ink',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
