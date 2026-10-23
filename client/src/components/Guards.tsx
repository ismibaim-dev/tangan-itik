import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAccount } from '../api/hooks';
import { Frame } from './AppShell';
import { ErrorState, Spinner } from './ui';

function Splash() {
  return (
    <Frame className="grid place-items-center">
      <Spinner label="Loading GripWise" />
    </Frame>
  );
}

/** Signed-in screens. Sends new users through onboarding first. */
export function RequireAccount({ children }: { children: ReactNode }) {
  const { data: account, isPending, error, refetch } = useAccount();
  const location = useLocation();

  if (isPending) return <Splash />;
  if (error) {
    return (
      <Frame className="pt-20">
        <ErrorState error={error} onRetry={() => refetch()} />
      </Frame>
    );
  }
  if (!account) return <Navigate to="/welcome" replace />;
  const onboarding = location.pathname === '/onboarding';
  if (!account.profile.onboarded && !onboarding) return <Navigate to="/onboarding" replace />;
  if (account.profile.onboarded && onboarding) return <Navigate to="/" replace />;
  return children;
}

/** Welcome and sign-in screens, which make no sense once signed in. */
export function SignedOutOnly({ children }: { children: ReactNode }) {
  const { data: account, isPending } = useAccount();
  if (isPending) return <Splash />;
  if (account) return <Navigate to="/" replace />;
  return children;
}
