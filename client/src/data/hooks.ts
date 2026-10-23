import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { localDate } from '../lib/dates';
import type { OnboardingInput, ProfileUpdate, SessionInput, SymptomInput } from './repository';
import { assessmentQuestions } from './repository';
import { store } from './store';
import type { Account, Phase } from './types';

export const keys = {
  account: ['account'] as const,
};

/** The profile stored on this device, or null before onboarding. */
export function useAccount() {
  return useQuery({ queryKey: keys.account, queryFn: () => store.getAccount(), staleTime: Infinity });
}

/** The profile inside screens that the route guard only shows after onboarding. */
export function useRequiredAccount(): Account {
  const { data } = useAccount();
  if (!data) throw new Error('useRequiredAccount used before onboarding');
  return data;
}

export function useDashboard() {
  const today = localDate();
  return useQuery({ queryKey: ['dashboard', today], queryFn: () => store.getDashboard(today) });
}

export function useExercises() {
  return useQuery({ queryKey: ['exercises'], queryFn: () => store.getExercises() });
}

export function useExercise(slug: string) {
  return useQuery({ queryKey: ['exercises', slug], queryFn: () => store.getExercise(slug) });
}

export function useRoutine(painNow: number | null) {
  const today = localDate();
  return useQuery({
    queryKey: ['routine', today, painNow],
    queryFn: () => store.getRoutine(today, painNow),
    enabled: painNow !== null,
    staleTime: Infinity,
  });
}

export function useSymptomLogs(limit = 30) {
  return useQuery({ queryKey: ['symptoms', limit], queryFn: () => store.listSymptomLogs(limit) });
}

export function useSessions(limit = 10) {
  return useQuery({ queryKey: ['sessions', limit], queryFn: () => store.listSessions(limit) });
}

export function useProgressReport(days: number) {
  const today = localDate();
  return useQuery({ queryKey: ['progress', today, days], queryFn: () => store.getProgress(today, days) });
}

export function useQuestions() {
  return { data: assessmentQuestions };
}

/** Most writes change derived data (streaks, charts, phase progress), so refresh every query. */
function useRefreshAll() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries();
}

export function useCreateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: OnboardingInput) => store.createProfile(input),
    onSuccess: (account) => queryClient.setQueryData(keys.account, account),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProfileUpdate) => store.updateProfile(input),
    onSuccess: (account) => queryClient.setQueryData(keys.account, account),
  });
}

export function useChangePhase() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: (phase: Phase) => store.changePhase(phase, localDate()),
    onSuccess: () => refresh(),
  });
}

export function useSaveSession() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: (input: Omit<SessionInput, 'localDate'>) => store.saveSession({ ...input, localDate: localDate() }),
    onSuccess: () => refresh(),
  });
}

export function useLogSymptoms() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: (input: Omit<SymptomInput, 'localDate'>) => store.logSymptoms({ ...input, localDate: localDate() }),
    onSuccess: () => refresh(),
  });
}

export function useDeleteSymptomLog() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: (id: number) => store.deleteSymptomLog(id),
    onSuccess: () => refresh(),
  });
}

export function useSubmitAssessment() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: (answers: number[]) => store.submitAssessment({ answers, localDate: localDate() }),
    onSuccess: () => refresh(),
  });
}

export function useEraseAllData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => store.eraseAllData(),
    onSuccess: () => {
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== keys.account[0] });
      queryClient.setQueryData(keys.account, null);
    },
  });
}
