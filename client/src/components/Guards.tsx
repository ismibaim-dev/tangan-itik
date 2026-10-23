import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAccount } from '../data/hooks';
import { Frame } from './AppShell';
import { ErrorState, Spinner } from './ui';

function Splash() {
  return (
    <Frame className="grid place-items-center">
      <Spinner label="Loading GripWise" />
    </Frame>
  );
}

function LoadError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <Frame className="pt-20">
      <ErrorState error={error} onRetry={retry} />
    </Frame>
  );
}

/** Screens that need a profile. Until onboarding is done, everything starts at the welcome screen. */
export function RequireAccount({ children }: { children: ReactNode }) {
  const { data: account, isPending, error, refetch } = useAccount();
  if (isPending) return <Splash />;
  if (error) return <LoadError error={error} retry={() => refetch()} />;
  if (!account) return <Navigate to="/welcome" replace />;
  return children;
}

/** Welcome and onboarding, which only make sense before a profile exists. */
export function BeforeOnboarding({ children }: { children: ReactNode }) {
  const { data: account, isPending, error, refetch } = useAccount();
  if (isPending) return <Splash />;
  if (error) return <LoadError error={error} retry={() => refetch()} />;
  if (account) return <Navigate to="/" replace />;
  return children;
}
