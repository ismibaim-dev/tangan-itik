import clsx from 'clsx';
import { ChartLine, CircleUser, Dumbbell, House, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router';

const tabs = [
  { to: '/', label: 'Home', icon: House, end: true },
  { to: '/exercises', label: 'Exercises', icon: Dumbbell },
  { to: '/log', label: 'Log', icon: Plus, primary: true },
  { to: '/progress', label: 'Progress', icon: ChartLine },
  { to: '/profile', label: 'Profile', icon: CircleUser },
];

/** Phone-width column: the app is designed mobile-first and stays centred on larger screens. */
export function Frame({
  children,
  className,
  background = 'bg-sand-100',
}: {
  children: ReactNode;
  className?: string;
  background?: string;
}) {
  return (
    <div className={clsx('relative mx-auto min-h-dvh max-w-md md:shadow-lift', background, className)}>{children}</div>
  );
}

export function AppShell() {
  return (
    <Frame>
      <main className="pb-28">
        <Outlet />
      </main>
      <nav
        aria-label="Main"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-sand-200 bg-white/90 px-3 pt-2 backdrop-blur"
      >
        <ul className="grid grid-cols-5 items-end">
          {tabs.map(({ to, label, icon: Icon, end, primary }) => (
            <li key={to} className="flex justify-center">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  clsx(
                    'flex flex-col items-center gap-1 rounded-2xl px-2 py-1 text-[11px] font-semibold transition-colors',
                    isActive ? 'text-brand-700' : 'text-ink-faint hover:text-ink-soft',
                  )
                }
              >
                {({ isActive }) =>
                  primary ? (
                    <>
                      <span className="-mt-6 grid size-14 place-items-center rounded-full bg-coral-500 text-white shadow-lift ring-4 ring-white">
                        <Icon className="size-6" strokeWidth={2.5} aria-hidden />
                      </span>
                      {label}
                    </>
                  ) : (
                    <>
                      <span className={clsx('grid h-8 w-12 place-items-center rounded-full', isActive && 'bg-brand-50')}>
                        <Icon className="size-[22px]" strokeWidth={isActive ? 2.4 : 2} aria-hidden />
                      </span>
                      {label}
                    </>
                  )
                }
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </Frame>
  );
}
