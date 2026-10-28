import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from '@/store/index.js';
import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/600.css';
import '@fontsource/vazirmatn/800.css';
import '@/styles/game.css';
const GamePage = lazy(() =>
  import('@/pages/game/GamePage.jsx').then((module) => ({ default: module.GamePage })),
);
createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <Suspense fallback={<p role="status">در حال آماده‌سازی بازی…</p>}>
      <GamePage />
    </Suspense>
  </Provider>,
);
