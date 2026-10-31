import { createRoot } from 'react-dom/client';
import { AppRoutes } from '@/routes/AppRoutes.jsx';
import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/600.css';
import '@fontsource/vazirmatn/800.css';
import '@/styles/game.css';
// The store is provided inside CompanyGame, so the game can also be mounted on its own.
createRoot(document.getElementById('root')).render(<AppRoutes />);
