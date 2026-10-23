import { Activity, Dumbbell, Hand, Waves, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ExerciseCategory, Phase } from '../data/types';

export const categoryMeta: Record<ExerciseCategory, { label: string; plural: string; tile: string; icon: ReactNode }> = {
  nerve_glide: {
    label: 'Nerve glide',
    plural: 'Nerve glides',
    tile: 'bg-violet-100 text-violet-700',
    icon: <Zap className="size-5" aria-hidden />,
  },
  tendon_glide: {
    label: 'Tendon glide',
    plural: 'Tendon glides',
    tile: 'bg-brand-100 text-brand-700',
    icon: <Waves className="size-5" aria-hidden />,
  },
  mobility: {
    label: 'Mobility',
    plural: 'Mobility',
    tile: 'bg-sky-100 text-sky-700',
    icon: <Activity className="size-5" aria-hidden />,
  },
  stretch: {
    label: 'Stretch',
    plural: 'Stretches',
    tile: 'bg-amber-100 text-amber-800',
    icon: <Hand className="size-5" aria-hidden />,
  },
  strength: {
    label: 'Strength',
    plural: 'Strength',
    tile: 'bg-coral-100 text-coral-700',
    icon: <Dumbbell className="size-5" aria-hidden />,
  },
};

export const phaseNames: Record<Phase, string> = {
  1: 'Calm & glide',
  2: 'Restore flexibility',
  3: 'Rebuild strength',
};

export function doseLabel(ex: { sets: number; reps: number; holdSeconds: number }): string {
  const reps = `${ex.reps} reps`;
  return `${ex.sets > 1 ? `${ex.sets} × ${reps}` : reps} · ${ex.holdSeconds}s each`;
}
