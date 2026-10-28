import { Suspense, lazy } from 'react';
const GamePage = lazy(() =>
  import('@/pages/game/GamePage.jsx').then((module) => ({
    default: module.GamePage,
  })),
);
/** Loads the one game page on demand while keeping a visible startup status. */
export function AppRoutes() {
  return (
    <Suspense fallback={<p role="status">در حال آماده‌سازی بازی…</p>}>
      <GamePage />
    </Suspense>
  );
}
