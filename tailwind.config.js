import plugin from 'tailwindcss/plugin.js';
import { gameTheme } from './src/styles/gameTheme.js';
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: 'var(--color-surface)',
        hud: 'var(--hud)',
        gold: 'var(--gold)',
        teal: 'var(--teal)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          light: 'var(--color-primary-light)',
          dark: 'var(--color-primary-dark)',
          on: 'var(--color-on-primary)',
        },
      },
    },
  },
  plugins: [plugin(({ addBase }) => addBase(gameTheme))],
};
