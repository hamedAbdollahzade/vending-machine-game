import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { AppRoutes } from '@/routes/AppRoutes.jsx';
import { store } from '@/store/index.js';
import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/600.css';
import '@fontsource/vazirmatn/800.css';
import '@/styles/game.css';
createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <AppRoutes />
  </Provider>,
);
