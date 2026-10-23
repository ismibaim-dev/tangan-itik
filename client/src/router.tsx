import { createBrowserRouter, Navigate } from 'react-router';
import { AppShell } from './components/AppShell';
import { BeforeOnboarding, RequireAccount } from './components/Guards';
import { ExerciseDetailPage } from './pages/ExerciseDetail';
import { ExercisesPage } from './pages/Exercises';
import { HomePage } from './pages/Home';
import { LogPage } from './pages/Log';
import { OnboardingPage } from './pages/Onboarding';
import { ProfilePage } from './pages/Profile';
import { SessionPage } from './pages/Session';
import { WeeklyCheckPage } from './pages/WeeklyCheck';
import { WelcomePage } from './pages/Welcome';

export const router = createBrowserRouter([
  { path: '/welcome', element: <BeforeOnboarding><WelcomePage /></BeforeOnboarding> },
  { path: '/onboarding', element: <BeforeOnboarding><OnboardingPage /></BeforeOnboarding> },
  { path: '/session', element: <RequireAccount><SessionPage /></RequireAccount> },
  { path: '/check', element: <RequireAccount><WeeklyCheckPage /></RequireAccount> },
  {
    element: <RequireAccount><AppShell /></RequireAccount>,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'exercises', element: <ExercisesPage /> },
      { path: 'exercises/:slug', element: <ExerciseDetailPage /> },
      { path: 'log', element: <LogPage /> },
      // Charts are the heaviest dependency, so the progress screen loads on demand.
      { path: 'progress', lazy: async () => ({ Component: (await import('./pages/Progress')).ProgressPage }) },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
