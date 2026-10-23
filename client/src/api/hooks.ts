import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { localDate } from '../lib/dates';
import { api } from './client';
import type {
  Account,
  Assessment,
  Dashboard,
  Exercise,
  Phase,
  PhaseProgress,
  Profile,
  ProgressReport,
  Question,
  Routine,
  SessionExerciseInput,
  SessionResult,
  SessionSummary,
  SymptomLog,
} from './types';

export const keys = {
  account: ['account'] as const,
};

/** The signed-in account, or null when signed out. */
export function useAccount() {
  return useQuery({
    queryKey: keys.account,
    queryFn: () => api<Account | null>('/auth/session'),
    staleTime: 5 * 60_000,
  });
}

/** The account inside signed-in screens, where the route guard guarantees it exists. */
export function useSignedInAccount(): Account {
  const { data } = useAccount();
  if (!data) throw new Error('useSignedInAccount used outside a signed-in route');
  return data;
}

export function useDashboard() {
  const today = localDate();
  return useQuery({
    queryKey: ['dashboard', today],
    queryFn: () => api<Dashboard>(`/insights/dashboard?today=${today}`),
  });
}

export function useExercises() {
  return useQuery({
    queryKey: ['exercises'],
    queryFn: () => api<{ currentPhase: Phase; exercises: Exercise[] }>('/exercises'),
  });
}

export function useExercise(slug: string) {
  return useQuery({
    queryKey: ['exercises', slug],
    queryFn: () => api<Exercise>(`/exercises/${encodeURIComponent(slug)}`),
  });
}

export function useRoutine(painNow: number | null) {
  const today = localDate();
  return useQuery({
    queryKey: ['routine', today, painNow],
    queryFn: () => api<Routine>(`/program/today?today=${today}&painNow=${painNow}`),
    enabled: painNow !== null,
    staleTime: Infinity,
  });
}

export function usePhaseProgress() {
  const today = localDate();
  return useQuery({
    queryKey: ['phase-progress', today],
    queryFn: () => api<PhaseProgress>(`/program/progress?today=${today}`),
  });
}

export function useSymptomLogs(limit = 30) {
  return useQuery({
    queryKey: ['symptoms', limit],
    queryFn: () => api<SymptomLog[]>(`/symptoms?limit=${limit}`),
  });
}

export function useSessions(limit = 10) {
  return useQuery({
    queryKey: ['sessions', limit],
    queryFn: () => api<SessionSummary[]>(`/sessions?limit=${limit}`),
  });
}

export function useProgressReport(days: number) {
  const today = localDate();
  return useQuery({
    queryKey: ['progress', today, days],
    queryFn: () => api<ProgressReport>(`/insights/progress?today=${today}&days=${days}`),
  });
}

export function useQuestions() {
  return useQuery({
    queryKey: ['assessment-questions'],
    queryFn: () => api<Question[]>('/assessments/questions'),
    staleTime: Infinity,
  });
}

/**
 * Switches the cached account (sign in, sign out) and drops everything cached for the previous one.
 * Avoids queryClient.clear(), which would detach components still watching the account query.
 */
function useSwitchAccount() {
  const queryClient = useQueryClient();
  return (account: Account | null) => {
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== keys.account[0] });
    queryClient.setQueryData(keys.account, account);
  };
}

/** Mutations change most derived data (streaks, charts, phase progress), so refresh everything user-specific. */
function useRefreshAll() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'assessment-questions' });
}

export function useLogin() {
  const switchAccount = useSwitchAccount();
  return useMutation({
    mutationFn: (body: { email: string; password: string }) => api<Account>('/auth/login', { method: 'POST', body }),
    onSuccess: switchAccount,
  });
}

export function useRegister() {
  const switchAccount = useSwitchAccount();
  return useMutation({
    mutationFn: (body: { name: string; email: string; password: string }) =>
      api<Account>('/auth/register', { method: 'POST', body }),
    onSuccess: switchAccount,
  });
}

export function useLogout() {
  const switchAccount = useSwitchAccount();
  return useMutation({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }),
    onSuccess: () => switchAccount(null),
  });
}

export function useDeleteAccount() {
  const switchAccount = useSwitchAccount();
  return useMutation({
    mutationFn: (password: string) => api<void>('/auth/account', { method: 'DELETE', body: { password } }),
    onSuccess: () => switchAccount(null),
  });
}

export type ProfileUpdate = Partial<Omit<Profile, 'phase' | 'phaseStartedAt' | 'onboarded'>> & {
  name?: string;
  onboarded?: true;
};

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ProfileUpdate) => api<Account>('/profile', { method: 'PATCH', body }),
    onSuccess: (account) => queryClient.setQueryData(keys.account, account),
  });
}

export function useChangePhase() {
  const queryClient = useQueryClient();
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: (phase: Phase) => api<Account>('/program/phase', { method: 'POST', body: { phase, today: localDate() } }),
    onSuccess: async (account) => {
      queryClient.setQueryData(keys.account, account);
      await refresh();
    },
  });
}

export function useSaveSession() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: (body: {
      startedAt: string;
      durationSeconds: number;
      painBefore: number;
      painAfter: number;
      flareMode: boolean;
      notes?: string;
      exercises: SessionExerciseInput[];
    }) => api<SessionResult>('/sessions', { method: 'POST', body: { ...body, localDate: localDate() } }),
    onSuccess: () => refresh(),
  });
}

export function useLogSymptoms() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: (body: Omit<SymptomLog, 'id' | 'loggedAt' | 'localDate' | 'notes'> & { notes?: string }) =>
      api<SymptomLog>('/symptoms', { method: 'POST', body: { ...body, localDate: localDate() } }),
    onSuccess: () => refresh(),
  });
}

export function useDeleteSymptomLog() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/symptoms/${id}`, { method: 'DELETE' }),
    onSuccess: () => refresh(),
  });
}

export function useSubmitAssessment() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: (answers: number[]) =>
      api<{ assessment: Assessment; previous: Assessment | null }>('/assessments', {
        method: 'POST',
        body: { answers, localDate: localDate() },
      }),
    onSuccess: () => refresh(),
  });
}
