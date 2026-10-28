import plugin from 'tailwindcss/plugin.js';
import { gameTheme } from './src/styles/gameTheme.js';
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { surface: '#0d1412', hud: 'var(--hud)', gold: 'var(--gold)', teal: 'var(--teal)' },
    },
  },
  plugins: [plugin(({ addBase }) => addBase(gameTheme))],
};
